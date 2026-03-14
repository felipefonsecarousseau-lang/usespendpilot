import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Users, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Link } from "react-router-dom";

const papeis = ["Pai", "Mãe", "Filho(a)", "Cônjuge", "Avô/Avó", "Outro"];

interface FamilyMember {
  id: string;
  nome: string;
  papel: string;
  renda_mensal: number;
}

interface Goal {
  id: string;
  nome: string;
  valor_alvo: number;
  valor_guardado: number;
}

const FamilyPage = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Member form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [mNome, setMNome] = useState("");
  const [mPapel, setMPapel] = useState(papeis[0]);
  const [mRenda, setMRenda] = useState("");

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [gNome, setGNome] = useState("");
  const [gValorAlvo, setGValorAlvo] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [membersRes, goalsRes] = await Promise.all([
      supabase.from("family_members").select("*").order("created_at"),
      supabase.from("goals").select("*").order("created_at"),
    ]);
    if (membersRes.data) setMembers(membersRes.data as FamilyMember[]);
    if (goalsRes.data) setGoals(goalsRes.data as Goal[]);
    setLoading(false);
  };

  const addMember = async () => {
    if (!mNome || !mRenda) { toast.error("Preencha todos os campos."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("family_members").insert({
      user_id: user.id, nome: mNome, papel: mPapel, renda_mensal: parseFloat(mRenda),
    } as any);
    if (error) { toast.error("Erro ao salvar."); return; }
    toast.success("Membro adicionado!");
    setMNome(""); setMRenda(""); setMPapel(papeis[0]); setShowMemberForm(false);
    fetchData();
  };

  const removeMember = async (id: string) => {
    await supabase.from("family_members").delete().eq("id", id);
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const addGoal = async () => {
    if (!gNome || !gValorAlvo) { toast.error("Preencha todos os campos."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("goals").insert({
      user_id: user.id, nome: gNome, valor_alvo: parseFloat(gValorAlvo), valor_guardado: 0,
    } as any);
    if (error) { toast.error("Erro ao salvar."); return; }
    toast.success("Objetivo adicionado!");
    setGNome(""); setGValorAlvo(""); setShowGoalForm(false);
    fetchData();
  };

  const removeGoal = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const formatCurrency = (val: number) => {
    const [intPart, decPart] = val.toFixed(2).split(".");
    return <span>R$ {intPart}<span className="opacity-50">,{decPart}</span></span>;
  };

  const totalRenda = members.reduce((s, m) => s + m.renda_mensal, 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Family Members Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Família</h1>
                <p className="text-sm text-muted-foreground">
                  Renda familiar total: {formatCurrency(totalRenda)}/mês
                </p>
              </div>
            </div>
            <Button onClick={() => setShowMemberForm(!showMemberForm)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Membro
            </Button>
          </div>

          {showMemberForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Nome" value={mNome} onChange={e => setMNome(e.target.value)} className="bg-secondary" />
                <select value={mPapel} onChange={e => setMPapel(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm">
                  {papeis.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <Input placeholder="Renda mensal" type="number" step="0.01" value={mRenda} onChange={e => setMRenda(e.target.value)} className="bg-secondary col-span-2" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowMemberForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={addMember}>Adicionar</Button>
              </div>
            </motion.div>
          )}

          <div className="glass-card divide-y divide-border">
            {members.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">Nenhum membro cadastrado.</p>
            )}
            {members.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between p-4 group">
                <div>
                  <p className="text-sm font-medium">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">{m.papel}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{formatCurrency(m.renda_mensal)}</span>
                  <button onClick={() => removeMember(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Goals Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-accent" />
              <div>
                <h2 className="text-xl font-bold tracking-tight">Objetivos & Sonhos</h2>
                <p className="text-sm text-muted-foreground">Defina metas e acompanhe seu progresso.</p>
              </div>
            </div>
            <Button onClick={() => setShowGoalForm(!showGoalForm)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Objetivo
            </Button>
          </div>

          {showGoalForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Ex: Viagem para Europa" value={gNome} onChange={e => setGNome(e.target.value)} className="bg-secondary" />
                <Input placeholder="Valor necessário" type="number" step="0.01" value={gValorAlvo} onChange={e => setGValorAlvo(e.target.value)} className="bg-secondary" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowGoalForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={addGoal}>Adicionar</Button>
              </div>
            </motion.div>
          )}

          <div className="glass-card divide-y divide-border">
            {goals.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">Nenhum objetivo cadastrado.</p>
            )}
            {goals.map((g, i) => {
              const pct = g.valor_alvo > 0 ? Math.min((g.valor_guardado / g.valor_alvo) * 100, 100) : 0;
              return (
                <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-4 space-y-2 group">
                  <div className="flex items-center justify-between">
                    <Link to={`/goals/${g.id}`} className="hover:text-primary transition-colors">
                      <p className="text-sm font-medium">{g.nome}</p>
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{formatCurrency(g.valor_alvo)}</span>
                      <button onClick={() => removeGoal(g.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(g.valor_guardado)} guardado</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default FamilyPage;
