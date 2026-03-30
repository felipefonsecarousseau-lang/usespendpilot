import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Structured JSON logger — consistent with frontend logEvent format. */
const logStep = (event: string, details: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({
    event: `stripe:${event.toLowerCase().replace(/\s+/g, "_")}`,
    ...details,
    timestamp: new Date().toISOString(),
  }));
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) throw new Error("Missing stripe-signature header");

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      logStep("Signature verification failed", { error: String(err) });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event received", { type: event.type, id: event.id });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    /**
     * Find Supabase user_id for a Stripe customer.
     *
     * Strategy (in order):
     * 1. Direct DB lookup by stripe_customer_id column — O(1), works at any scale.
     * 2. DB lookup by email via get_user_id_by_email RPC — queries auth.users
     *    directly, O(1), no pagination, no external API. Used as a one-time
     *    fallback for users who existed before stripe_customer_id was persisted.
     *    On success, backfills stripe_customer_id so future events use path 1.
     *
     * Never calls listUsers().
     */
    async function findUserIdForCustomer(customerId: string): Promise<string | null> {
      // ── Path 1: direct lookup (preferred) ──────────────────────────────────
      const { data: plan } = await supabaseAdmin
        .from("user_plans")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (plan?.user_id) {
        logStep("User found via stripe_customer_id", { customerId, userId: plan.user_id });
        return plan.user_id;
      }

      // ── Path 2: email fallback via DB function (for pre-existing users) ────
      logStep("stripe_customer_id not found, falling back to email lookup", { customerId });

      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !customer.email) {
        logStep("Customer has no email or is deleted", { customerId });
        return null;
      }

      const { data: userId, error: rpcError } = await supabaseAdmin.rpc(
        "get_user_id_by_email",
        { p_email: customer.email }
      );

      if (rpcError) {
        logStep("get_user_id_by_email RPC error", { error: rpcError.message, email: customer.email });
        return null;
      }

      if (!userId) {
        logStep("No Supabase user found for customer email", { email: customer.email });
        return null;
      }

      logStep("User found via email fallback, backfilling stripe_customer_id", {
        customerId,
        userId,
      });

      // Backfill so future webhook events for this customer hit path 1
      await supabaseAdmin
        .from("user_plans")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", userId);

      return userId;
    }

    // Helper: upsert user plan (also persists stripe_customer_id)
    async function upsertPlan(userId: string, customerId: string, updates: {
      plan_type: "free" | "premium";
      status: "active" | "cancelled" | "expired";
      expires_at?: string | null;
      is_trial?: boolean;
    }) {
      const { data: existing } = await supabaseAdmin
        .from("user_plans")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const payload = {
        plan_type: updates.plan_type,
        status: updates.status,
        expires_at: updates.expires_at ?? null,
        is_trial: updates.is_trial ?? false,
        stripe_customer_id: customerId,
      };

      if (existing) {
        await supabaseAdmin
          .from("user_plans")
          .update(payload)
          .eq("id", existing.id);
        logStep("Updated user_plan", { userId, ...updates });
      } else {
        await supabaseAdmin
          .from("user_plans")
          .insert({ user_id: userId, ...payload });
        logStep("Inserted user_plan", { userId, ...updates });
      }
    }

    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = await findUserIdForCustomer(customerId);
        if (!userId) {
          logStep("User not found for customer", { customerId });
          break;
        }

        const isActive = sub.status === "active" || sub.status === "trialing";
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        await upsertPlan(userId, customerId, {
          plan_type: isActive ? "premium" : "free",
          status: isActive ? "active" : sub.status === "canceled" ? "cancelled" : "expired",
          expires_at: periodEnd,
          is_trial: false,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = await findUserIdForCustomer(customerId);
        if (!userId) {
          logStep("User not found for customer", { customerId });
          break;
        }

        await upsertPlan(userId, customerId, {
          plan_type: "free",
          status: "cancelled",
          expires_at: null,
          is_trial: false,
        });
        logStep("Subscription deleted, downgraded to free", { userId });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (!customerId) break;

        const userId = await findUserIdForCustomer(customerId);
        if (!userId) break;

        await upsertPlan(userId, customerId, {
          plan_type: "free",
          status: "expired",
          is_trial: false,
        });
        logStep("Payment failed, downgraded to free/expired", { userId });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (!customerId) break;

        const userId = await findUserIdForCustomer(customerId);
        if (!userId) break;

        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });
        const periodEnd = subs.data[0]?.current_period_end
          ? new Date(subs.data[0].current_period_end * 1000).toISOString()
          : null;

        await upsertPlan(userId, customerId, {
          plan_type: "premium",
          status: "active",
          expires_at: periodEnd,
          is_trial: false,
        });
        logStep("Payment succeeded, confirmed premium", { userId });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
