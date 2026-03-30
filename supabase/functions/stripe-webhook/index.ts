import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
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

    // Helper: find user by Stripe customer email
    async function findUserByCustomerId(customerId: string): Promise<string | null> {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !customer.email) return null;

      const { data } = await supabaseAdmin.auth.admin.listUsers();
      const user = data?.users?.find(u => u.email === customer.email);
      return user?.id ?? null;
    }

    // Helper: upsert user plan
    async function upsertPlan(userId: string, updates: {
      plan_type: "free" | "premium";
      status: "active" | "cancelled" | "expired";
      expires_at?: string | null;
      is_trial?: boolean;
    }) {
      // Check if plan exists
      const { data: existing } = await supabaseAdmin
        .from("user_plans")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from("user_plans")
          .update({
            plan_type: updates.plan_type,
            status: updates.status,
            expires_at: updates.expires_at ?? null,
            is_trial: updates.is_trial ?? false,
          })
          .eq("id", existing.id);
        logStep("Updated user_plan", { userId, ...updates });
      } else {
        await supabaseAdmin
          .from("user_plans")
          .insert({
            user_id: userId,
            plan_type: updates.plan_type,
            status: updates.status,
            expires_at: updates.expires_at ?? null,
            is_trial: updates.is_trial ?? false,
          });
        logStep("Inserted user_plan", { userId, ...updates });
      }
    }

    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await findUserByCustomerId(sub.customer as string);
        if (!userId) {
          logStep("User not found for customer", { customerId: sub.customer });
          break;
        }

        const isActive = sub.status === "active" || sub.status === "trialing";
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        await upsertPlan(userId, {
          plan_type: isActive ? "premium" : "free",
          status: isActive ? "active" : sub.status === "canceled" ? "cancelled" : "expired",
          expires_at: periodEnd,
          is_trial: false,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await findUserByCustomerId(sub.customer as string);
        if (!userId) {
          logStep("User not found for customer", { customerId: sub.customer });
          break;
        }

        await upsertPlan(userId, {
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

        const userId = await findUserByCustomerId(customerId);
        if (!userId) break;

        // Mark as expired on payment failure
        await upsertPlan(userId, {
          plan_type: "premium",
          status: "expired",
          is_trial: false,
        });
        logStep("Payment failed, marked as expired", { userId });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (!customerId) break;

        const userId = await findUserByCustomerId(customerId);
        if (!userId) break;

        // Find active subscription end date
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });
        const periodEnd = subs.data[0]?.current_period_end
          ? new Date(subs.data[0].current_period_end * 1000).toISOString()
          : null;

        await upsertPlan(userId, {
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
