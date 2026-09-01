'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Trash2, Loader2, AlertCircle, FileText, TrendingUp, Plus, PieChart } from 'lucide-react';
import api from '@/lib/api';
import { Nature, Category, Compagne, Tva, Parametre, Production, Client, CompagneRepartition } from '@/types';
import RiskAssessmentModal from '@/components/ai/RiskAssessmentModal';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';

const emptyParam = () => ({ name: '', primes: 0, taxe: 0, taxepara: 0, accessoire: 0, cnpc: 0, commission: 0 });
const emptyRepartition = (): CompagneRepartition => ({ compagneName: '', percent: 0 });

function FieldRow({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function StyledInput({ id, value, onChange, required = false, type = 'text', placeholder, readOnly = false }: any) {
  return (
    <Input id={id} type={type} value={value} onChange={onChange} required={required}
      placeholder={placeholder} readOnly={readOnly}
      className="bg-muted/30 border-border focus:border-primary w-full" />
  );
}

function StyledSelect({ id, value, onChange, required = false, children }: any) {
  return (
    <select id={id} value={value} onChange={onChange} required={required}
      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground bg-muted/30">
      {children}
    </select>
  );
}

export default function EditOperationPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [natures, setNatures] = useState<Nature[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [compagnes, setCompagnes] = useState<Compagne[]>([]);
  const [tvas, setTvas] = useState<Tva[]>([]);
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState({
    natureOperation: '', client: '', dateEff: '',
    moisDem: '', compagne: '', tvaRate: '0',
    category: '', numpolice: '', ordre: '',
    refCie: '', certificat: '', navire: '',
  });
  const [params, setParams] = useState<any[]>([]);
  const [repartitions, setRepartitions] = useState<CompagneRepartition[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<Nature[]>('/natures'), api.get<Category[]>('/categories'),
      api.get<Compagne[]>('/compagnes'), api.get<Tva[]>('/tva'),
      api.get<Parametre[]>('/parametres'), api.get<Client[]>('/clients'),
      api.get<Production>(`/productions/${id}`),
    ]).then(([n, c, comp, t, p, cl, prodRes]) => {
      setNatures(n.data); setCategories(c.data);
      setCompagnes(comp.data); setTvas(t.data);
      setParametres(p.data); setClients(cl.data);

      const prod = prodRes.data;
      setForm({
        natureOperation: prod.natureOperation ?? '',
        client: prod.client ?? '',
        dateEff: prod.dateEff ? prod.dateEff.slice(0, 10) : '',
        moisDem: prod.moisDem ? prod.moisDem.slice(0, 7) : '',
        compagne: prod.compagne ?? '',
        tvaRate: String(prod.tvaRate ?? 0),
        category: prod.category ?? '',
        numpolice: prod.numpolice ?? '',
        ordre: prod.ordre ?? '',
        refCie: prod.refCie ?? '',
        certificat: prod.certificat ?? '',
        navire: prod.navire ?? '',
      });
      setParams(prod.parameters?.length ? prod.parameters : [emptyParam()]);
      setRepartitions(prod.repartitions ?? []);
      setLoading(false);
    }).catch(() => {
      setError('Erreur lors du chargement des données');
      setLoading(false);
    });
  }, [id]);

  const getCommissionRate = (catName: string): number => {
    const found = categories.find(c => c.name === catName);
    const rate = found ? found.commissionRate : 0.0;
    return rate / 100.0;
  };

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setForm(p => ({ ...p, category: newCategory }));
    const rate = getCommissionRate(newCategory);
    setParams(prev =>
      prev.map(p => ({
        ...p,
        commission: Number((p.primes * rate).toFixed(2))
      }))
    );
  };

  const setParam = (i: number, k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setParams(prev => {
      const next = [...prev];
      if (k === 'name') {
        (next[i] as any)[k] = e.target.value;
      } else {
        const raw = e.target.value.replace(/^0+(?=\d)/, '');
        (next[i] as any)[k] = raw === '' ? 0 : Number(raw);
      }

      if (k === 'primes') {
        const rate = getCommissionRate(form.category);
        const primesVal = (next[i] as any).primes;
        next[i].commission = Number((Number(primesVal) * rate).toFixed(2));
      }
      return next;
    });
  };

  /* ── Répartitions ── */
  const setRepartition = (i: number, k: keyof CompagneRepartition) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setRepartitions(prev => {
        const next = [...prev];
        if (k === 'percent') {
          const raw = e.target.value.replace(/^0+(?=\d)/, '');
          (next[i] as any)[k] = raw === '' ? 0 : Number(raw);
        } else {
          (next[i] as any)[k] = e.target.value;
        }
        return next;
      });
    };

  const totalRepartition = repartitions.reduce((s, r) => s + r.percent, 0);
  const montantTotal = params.reduce((s, p) => s + p.primes + p.taxe + p.taxepara + p.accessoire + p.cnpc, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.put(`/productions/${id}`, {
        ...form,
        tvaRate: +form.tvaRate,
        parameters: params,
        repartitions: repartitions.filter(r => r.compagneName && r.percent > 0),
      });
      router.push('/operations');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la modification');
    } finally { setSaving(false); }
  };

  const handleApplyAiGuarantees = (suggestedGuarantees: string[]) => {
    const rate = getCommissionRate(form.category);
    setParams(prev => {
      const existing = prev.filter(p => p.name.trim() !== '' || p.primes > 0);
      const existingNames = new Set(existing.map(p => p.name.toLowerCase()));

      const newEntries = suggestedGuarantees
        .filter(g => !existingNames.has(g.toLowerCase()))
        .map(g => {
          let primeEst = 400;
          const gLower = g.toLowerCase();
          if (gLower.includes('responsabilité') || gLower.includes('rc')) primeEst = 1200;
          else if (gLower.includes('tous risques')) primeEst = 2500;
          else if (gLower.includes('bris')) primeEst = 500;
          else if (gLower.includes('vol') || gLower.includes('incendie')) primeEst = 750;
          else if (gLower.includes('assistance')) primeEst = 350;
          else if (gLower.includes('défense') || gLower.includes('recours')) primeEst = 250;
          else if (gLower.includes('corps')) primeEst = 3500;
          else if (gLower.includes('hospitalisation')) primeEst = 1800;

          const taxe = Number((primeEst * 0.14).toFixed(2));
          return {
            name: g,
            primes: primeEst,
            taxe: taxe,
            taxepara: 0,
            accessoire: 50,
            cnpc: 0,
            commission: Number((primeEst * rate).toFixed(2)),
          };
        });

      return existing.length === 0 && newEntries.length > 0
        ? newEntries
        : [...existing, ...newEntries];
    });
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="h-12 bg-muted/30 rounded-xl animate-pulse" />
      <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 sm:space-y-8">
      {/* Header — Modifier l'opération & AI Risk Advisor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Modifier l&apos;opération</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground pl-10">Modifier la police N° {form.numpolice}</p>
          </div>
        </div>

        <RiskAssessmentModal
          initialClientName={form.client}
          initialCategory={form.category}
          initialNature={form.natureOperation}
          onApplyGuarantees={handleApplyAiGuarantees}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-red-400 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Main info */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 sm:p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Informations générales</h2>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldRow label="Nature" id="nature">
              <StyledSelect id="nature" value={form.natureOperation} onChange={setF('natureOperation')} required>
                <option value="">-- Sélectionner --</option>
                {natures.map(n => <option key={n.id} value={n.name} className="bg-card">{n.name}</option>)}
              </StyledSelect>
            </FieldRow>
            <FieldRow label="Client (nom)" id="client">
              <Combobox
                options={clients.map(c => ({ value: c.nom, label: c.nom }))}
                value={form.client}
                onChange={val => setForm(p => ({ ...p, client: val }))}
                placeholder="Rechercher un client..."
                emptyText="Aucun client trouvé."
              />
            </FieldRow>
            <FieldRow label="Date d'effet" id="dateEff">
              <StyledInput id="dateEff" type="date" value={form.dateEff} onChange={setF('dateEff')} required />
            </FieldRow>
            <FieldRow label="Mois de demande" id="moisDem">
              <StyledInput id="moisDem" type="month" value={form.moisDem} onChange={setF('moisDem')} required />
            </FieldRow>
            <FieldRow label="Compagnie" id="compagne">
              <StyledSelect id="compagne" value={form.compagne} onChange={setF('compagne')} required>
                <option value="">-- Sélectionner une compagnie --</option>
                {compagnes.map(c => <option key={c.id} value={c.compagneName} className="bg-card">{c.compagneName}</option>)}
              </StyledSelect>
            </FieldRow>
            <FieldRow label="N° Police" id="numpolice">
              <StyledInput id="numpolice" value={form.numpolice} onChange={setF('numpolice')} required placeholder="Numéro de police" />
            </FieldRow>
            <FieldRow label="Catégorie" id="category">
              <StyledSelect id="category" value={form.category} onChange={handleCategoryChange} required>
                <option value="">-- Sélectionner --</option>
                {categories.map(c => <option key={c.id} value={c.name} className="bg-card">{c.name}</option>)}
              </StyledSelect>
            </FieldRow>
            <FieldRow label="TVA" id="tva">
              <StyledSelect id="tva" value={form.tvaRate} onChange={setF('tvaRate')}>
                <option value="0" className="bg-card">Sans TVA (0%)</option>
                {tvas.map(t => <option key={t.id} value={t.rate} className="bg-card">{t.name} ({t.rate}%)</option>)}
              </StyledSelect>
            </FieldRow>

            {form.category.toUpperCase() === 'MARITIME' && (
              <>
                <FieldRow label="N° Ordre" id="ordre">
                  <StyledInput id="ordre" value={form.ordre} onChange={setF('ordre')} placeholder="Ex: 74278" />
                </FieldRow>
                <FieldRow label="Réf. Compagnie" id="refCie">
                  <StyledInput id="refCie" value={form.refCie} onChange={setF('refCie')} placeholder="Ex: 0070.9201.2026..." />
                </FieldRow>
                <FieldRow label="Certificat" id="certificat">
                  <StyledInput id="certificat" value={form.certificat} onChange={setF('certificat')} placeholder="Ex: 2026/00217" />
                </FieldRow>
                <div className="col-span-1 sm:col-span-2">
                  <FieldRow label="Navire" id="navire">
                    <StyledInput id="navire" value={form.navire} onChange={setF('navire')} placeholder="Ex: CLARKE QUAY" />
                  </FieldRow>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Parameters section */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Paramètres de tarification</h2>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground">Total TTC</p>
                <p className="text-base sm:text-lg font-bold text-green-400 tabular-nums">{montantTotal.toLocaleString('fr-MA')} DH</p>
              </div>
              <Button type="button" onClick={() => setParams(p => [...p, emptyParam()])} variant="outline" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </Button>
            </div>
          </div>
          <Separator />
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="border-b border-border">
                  {['Paramètre', 'Primes', 'Taxe', 'Taxe Para', 'Accessoire', 'CNPC', 'Commission', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {params.map((param, i) => (
                  <tr key={i}>
                    <td className="py-3 pr-3">
                      <select value={param.name} onChange={setParam(i, 'name')} required
                        className="flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground min-w-[150px]">
                        <option value="" className="bg-card">-- Paramètre / Garantie --</option>
                        {param.name && !parametres.some(p => p.name === param.name) && (
                          <option value={param.name} className="bg-card font-medium text-primary">
                            {param.name}
                          </option>
                        )}
                        {parametres.map(p => <option key={p.id} value={p.name} className="bg-card">{p.name}</option>)}
                      </select>
                    </td>
                    {(['primes', 'taxe', 'taxepara', 'accessoire', 'cnpc'] as const).map(k => (
                      <td key={k} className="py-3 pr-3">
                        <Input type="number" min="0" step="0.01" placeholder="0"
                          value={(param as any)[k] === 0 ? '' : (param as any)[k]} onChange={setParam(i, k)}
                          className="bg-muted/30 border-border focus:border-primary w-20 sm:w-24 h-9" />
                      </td>
                    ))}
                    <td className="py-3 pr-3">
                      <Input type="number" min="0" step="0.01" readOnly placeholder="0"
                        value={param.commission === 0 ? '' : param.commission}
                        className="bg-muted/10 border-border text-muted-foreground w-20 sm:w-24 h-9 cursor-not-allowed" />
                    </td>
                    <td className="py-3">
                      {params.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setParams(p => p.filter((_, idx) => idx !== i))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Répartition entre compagnies */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Répartition entre compagnies</h2>
              <span className="text-xs text-muted-foreground hidden sm:inline">(optionnel)</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              {repartitions.length > 0 && (
                <span className={`text-xs sm:text-sm font-semibold tabular-nums ${Math.abs(totalRepartition - 100) < 0.01 ? 'text-green-400' : 'text-amber-400'}`}>
                  Total: {totalRepartition.toFixed(1)}%
                </span>
              )}
              <Button type="button" onClick={() => setRepartitions(r => [...r, emptyRepartition()])} variant="outline" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </Button>
            </div>
          </div>
          <Separator />
          {repartitions.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              Aucune répartition définie. Cliquez sur &quot;Ajouter&quot; pour configurer la répartition entre CIE.
            </p>
          ) : (
            <div className="space-y-3">
              {repartitions.map((rep, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 sm:items-center">
                  <div className="flex-1">
                    <StyledSelect
                      value={rep.compagneName}
                      onChange={setRepartition(i, 'compagneName')}
                      required
                    >
                      <option value="" className="bg-card">-- Sélectionner une compagnie --</option>
                      {compagnes.map(c => (
                        <option key={c.id} value={c.compagneName} className="bg-card">
                          {c.compagneName}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-full sm:w-32 flex items-center gap-1.5">
                      <Input
                        type="number" min="0" max="100" step="0.1"
                        placeholder="0"
                        value={rep.percent || ''}
                        onChange={setRepartition(i, 'percent')}
                        className="bg-muted/30 border-border focus:border-primary"
                      />
                      <span className="text-sm text-muted-foreground font-medium">%</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => setRepartitions(r => r.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {repartitions.length > 0 && Math.abs(totalRepartition - 100) > 0.01 && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg px-3 py-2 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  La somme des pourcentages doit être égale à 100% (actuellement {totalRepartition.toFixed(1)}%)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1 h-10" onClick={() => router.back()}>Annuler</Button>
          <Button type="submit" disabled={saving} className="flex-1 shadow-lg shadow-primary/20 h-10">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Enregistrement...' : 'Sauvegarder'}
          </Button>
        </div>
      </form>
    </div>
  );
}
