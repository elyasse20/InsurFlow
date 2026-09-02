'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Loader2, AlertCircle, FileText, TrendingUp, PieChart, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { Nature, Category, Compagne, Tva, Parametre, ProductionParameter, Client, CompagneRepartition, Production } from '@/types';
import RiskAssessmentModal from '@/components/ai/RiskAssessmentModal';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';

const emptyParam = (): Omit<ProductionParameter, 'name'> & { name: string } =>
  ({ name: '', primes: 0, taxe: 0, taxepara: 0, accessoire: 0, cnpc: 0, commission: 0 });

const emptyRepartition = (): CompagneRepartition => ({ compagneName: '', percent: 0 });

/* ── Helper Functions for Policy, RefCie, & Certificat Generation ── */

/**
 * Extracts a clean normalized trigram or uppercase code from a company name.
 * e.g. "AtlantaSanad Assurance" -> "ATLANTA", "Sanlam Maroc" -> "SANLAM", "Wafa Assurance" -> "WAFA"
 */
function extractCompanyCode(companyName?: string | null): string {
  if (!companyName) return 'GEN';
  const clean = companyName.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (clean.includes('ATLANTA')) return 'ATLANTA';
  if (clean.includes('SANLAM')) return 'SANLAM';
  if (clean.includes('WAFA')) return 'WAFA';
  if (clean.includes('RMA')) return 'RMA';
  if (clean.includes('ALLIANZ')) return 'ALLIANZ';
  if (clean.includes('AXA')) return 'AXA';
  if (clean.includes('TAOUNATE')) return 'TAOUNATE';
  if (clean.includes('CHAABI')) return 'CHAABI';

  const firstWord = clean.replace(/[^A-Z0-9\s]/g, '').trim().split(/\s+/)[0];
  return firstWord && firstWord.length >= 2 ? firstWord : 'CIE';
}

/**
 * Generates an incremental, formatted policy number: POL-{COMPAGNIE}-{ANNEE}-{00X}
 */
function generatePolicyNumber(
  companyName: string,
  dateEff: string,
  existingList: Production[] = []
): string {
  if (!companyName) return '';
  const compCode = extractCompanyCode(companyName);

  let year = new Date().getFullYear();
  if (dateEff && dateEff.length >= 4) {
    const parsed = parseInt(dateEff.substring(0, 4), 10);
    if (!isNaN(parsed) && parsed > 1900) year = parsed;
  }

  const prefix = `POL-${compCode}-${year}-`;
  let maxSeq = 0;
  let countForCompYear = 0;

  for (const p of existingList) {
    if (!p) continue;
    const pYear = p.dateEff ? parseInt(p.dateEff.substring(0, 4), 10) : (p.exercice || 0);
    const pCompCode = extractCompanyCode(p.compagne);

    if (pCompCode === compCode && (pYear === year || pYear === 0)) {
      countForCompYear++;
    }

    if (p.numpolice && p.numpolice.startsWith(prefix)) {
      const seqPart = p.numpolice.substring(prefix.length);
      const parsedSeq = parseInt(seqPart, 10);
      if (!isNaN(parsedSeq) && parsedSeq > maxSeq) {
        maxSeq = parsedSeq;
      }
    }
  }

  const nextIndex = maxSeq > 0 ? maxSeq + 1 : countForCompYear + 1;
  const seqStr = String(nextIndex).padStart(3, '0');

  return `POL-${compCode}-${year}-${seqStr}`;
}

/**
 * Generates an incremental company reference: REF-{TRIGRAMME}-{ANNEE}-{00X}
 */
function generateRefCie(
  companyName: string,
  dateEff: string,
  existingList: Production[] = []
): string {
  if (!companyName) return '';
  const compCode = extractCompanyCode(companyName);

  let year = new Date().getFullYear();
  if (dateEff && dateEff.length >= 4) {
    const parsed = parseInt(dateEff.substring(0, 4), 10);
    if (!isNaN(parsed) && parsed > 1900) year = parsed;
  }

  const prefix = `REF-${compCode}-${year}-`;
  let maxSeq = 0;
  let countForCompYear = 0;

  for (const p of existingList) {
    if (!p) continue;
    const pYear = p.dateEff ? parseInt(p.dateEff.substring(0, 4), 10) : (p.exercice || 0);
    const pCompCode = extractCompanyCode(p.compagne);

    if (pCompCode === compCode && (pYear === year || pYear === 0)) {
      countForCompYear++;
    }

    if (p.refCie && p.refCie.startsWith(prefix)) {
      const seqPart = p.refCie.substring(prefix.length);
      const parsedSeq = parseInt(seqPart, 10);
      if (!isNaN(parsedSeq) && parsedSeq > maxSeq) {
        maxSeq = parsedSeq;
      }
    }
  }

  const nextIndex = maxSeq > 0 ? maxSeq + 1 : countForCompYear + 1;
  const seqStr = String(nextIndex).padStart(3, '0');

  return `REF-${compCode}-${year}-${seqStr}`;
}

/**
 * Generates an incremental maritime certificate: CERT-{ANNEE}-{00X}
 */
function generateCertificat(
  dateEff: string,
  existingList: Production[] = []
): string {
  let year = new Date().getFullYear();
  if (dateEff && dateEff.length >= 4) {
    const parsed = parseInt(dateEff.substring(0, 4), 10);
    if (!isNaN(parsed) && parsed > 1900) year = parsed;
  }

  const prefix = `CERT-${year}-`;
  let maxSeq = 0;
  let countForYear = 0;

  for (const p of existingList) {
    if (!p) continue;
    const pYear = p.dateEff ? parseInt(p.dateEff.substring(0, 4), 10) : (p.exercice || 0);

    if (pYear === year || pYear === 0) {
      countForYear++;
    }

    if (p.certificat && p.certificat.startsWith(prefix)) {
      const seqPart = p.certificat.substring(prefix.length);
      const parsedSeq = parseInt(seqPart, 10);
      if (!isNaN(parsedSeq) && parsedSeq > maxSeq) {
        maxSeq = parsedSeq;
      }
    }
  }

  const nextIndex = maxSeq > 0 ? maxSeq + 1 : countForYear + 1;
  const seqStr = String(nextIndex).padStart(3, '0');

  return `CERT-${year}-${seqStr}`;
}

const FREQUENT_NAVIRES = [
  'MV TANGER EXPRESS',
  'AL IDRISSI',
  'ATLAS MARITIME',
  'CASABLANCA STAR',
  'TARIK IBN ZIYAD',
  'MEDITERRANEE V',
  'DETROIT JET',
  'MAROC LEADER',
  'IBN BATTUTA',
  'CAP SPARTEL',
];

/* ── Sub-components ──────────────────────────────────────────────────────── */
function FieldRow({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function StyledInput({ id, value, onChange, required = false, type = 'text', placeholder, readOnly = false, list, className = '' }: any) {
  return (
    <Input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      readOnly={readOnly}
      list={list}
      className={`bg-muted/30 border-border focus:border-primary w-full ${className}`}
    />
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

export default function NewOperationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [natures, setNatures] = useState<Nature[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [compagnes, setCompagnes] = useState<Compagne[]>([]);
  const [tvas, setTvas] = useState<Tva[]>([]);
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [existingProductions, setExistingProductions] = useState<Production[]>([]);

  const [form, setForm] = useState({
    natureOperation: '', client: '', dateEff: '',
    moisDem: '', compagne: '', tvaRate: '0',
    category: '', numpolice: '', ordre: '',
    refCie: '', certificat: '', navire: '',
  });
  const [params, setParams] = useState([emptyParam()]);
  const [repartitions, setRepartitions] = useState<CompagneRepartition[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<Nature[]>('/natures'),
      api.get<Category[]>('/categories'),
      api.get<Compagne[]>('/compagnes'),
      api.get<Tva[]>('/tva'),
      api.get<Parametre[]>('/parametres'),
      api.get<Client[]>('/clients'),
      api.get<Production[]>('/productions'),
    ]).then(([n, c, comp, t, p, cl, prods]) => {
      setNatures(n.data);
      setCategories(c.data);
      setCompagnes(comp.data);
      setTvas(t.data);
      setParametres(p.data);
      setClients(cl.data);
      setExistingProductions(prods.data ?? []);
    }).catch(() => {});
  }, []);

  const getCommissionRate = (catName: string): number => {
    const found = categories.find(c => c.name === catName);
    const rate = found ? found.commissionRate : 0.0;
    return rate / 100.0;
  };

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  /* ── Auto-generation on Compagnie Change ── */
  const handleCompagneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompagne = e.target.value;
    const autoPolicy = newCompagne
      ? generatePolicyNumber(newCompagne, form.dateEff, existingProductions)
      : '';
    const autoRefCie = newCompagne
      ? generateRefCie(newCompagne, form.dateEff, existingProductions)
      : '';
    const autoCertificat = generateCertificat(form.dateEff, existingProductions);

    setForm(p => ({
      ...p,
      compagne: newCompagne,
      numpolice: autoPolicy || p.numpolice,
      refCie: p.category.toUpperCase() === 'MARITIME' && (!p.refCie || p.refCie.startsWith('REF-'))
        ? autoRefCie
        : p.refCie,
      certificat: p.category.toUpperCase() === 'MARITIME' && (!p.certificat || p.certificat.startsWith('CERT-'))
        ? autoCertificat
        : p.certificat,
    }));
  };

  /* ── Date d'effet Change & Numbers Sync ── */
  const handleDateEffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setForm(p => {
      const newMoisDem = !p.moisDem && newDate && newDate.length >= 7
        ? newDate.substring(0, 7)
        : p.moisDem;

      let newPolicy = p.numpolice;
      if (p.compagne && (!p.numpolice || p.numpolice.startsWith('POL-'))) {
        newPolicy = generatePolicyNumber(p.compagne, newDate, existingProductions);
      }

      let newRefCie = p.refCie;
      if (p.compagne && (!p.refCie || p.refCie.startsWith('REF-'))) {
        newRefCie = generateRefCie(p.compagne, newDate, existingProductions);
      }

      let newCertificat = p.certificat;
      if (!p.certificat || p.certificat.startsWith('CERT-')) {
        newCertificat = generateCertificat(newDate, existingProductions);
      }

      return {
        ...p,
        dateEff: newDate,
        moisDem: newMoisDem,
        numpolice: newPolicy,
        refCie: newRefCie,
        certificat: newCertificat,
      };
    });
  };

  const handleRegeneratePolicy = () => {
    if (!form.compagne) return;
    const generated = generatePolicyNumber(form.compagne, form.dateEff, existingProductions);
    setForm(p => {
      let updated = { ...p, numpolice: generated };
      if (p.category.toUpperCase() === 'MARITIME') {
        if (!p.refCie || p.refCie.startsWith('REF-')) {
          updated.refCie = generateRefCie(form.compagne, form.dateEff, existingProductions);
        }
        if (!p.certificat || p.certificat.startsWith('CERT-')) {
          updated.certificat = generateCertificat(form.dateEff, existingProductions);
        }
      }
      return updated;
    });
  };

  const handleAutoRefCie = () => {
    if (!form.compagne) return;
    const generated = generateRefCie(form.compagne, form.dateEff, existingProductions);
    setForm(p => ({ ...p, refCie: generated }));
  };

  const handleAutoCertificat = () => {
    const generated = generateCertificat(form.dateEff, existingProductions);
    setForm(p => ({ ...p, certificat: generated }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    const rate = getCommissionRate(newCategory);

    setForm(p => {
      let updated = { ...p, category: newCategory };
      if (newCategory.toUpperCase() === 'MARITIME') {
        if (!p.refCie && p.compagne) {
          updated.refCie = generateRefCie(p.compagne, p.dateEff, existingProductions);
        }
        if (!p.certificat) {
          updated.certificat = generateCertificat(p.dateEff, existingProductions);
        }
      }
      return updated;
    });

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
      await api.post('/productions', {
        ...form,
        tvaRate: +form.tvaRate,
        parameters: params,
        repartitions: repartitions.filter(r => r.compagneName && r.percent > 0),
      });
      router.push('/operations');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la création');
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

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 sm:space-y-8">
      {/* Header — Nouvelle opération & AI Risk Advisor */}
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Nouvelle opération</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground pl-10">Créer une nouvelle police d&apos;assurance</p>
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
            {/* Nature */}
            <FieldRow label="Nature" id="nature">
              <StyledSelect id="nature" value={form.natureOperation} onChange={setF('natureOperation')} required>
                <option value="">-- Sélectionner --</option>
                {natures.map(n => <option key={n.id} value={n.name} className="bg-card">{n.name}</option>)}
              </StyledSelect>
            </FieldRow>

            {/* Client (Combobox avec recherche dynamique) */}
            <FieldRow label="Client / Assuré" id="client">
              <Combobox
                options={clients.map(c => {
                  const clientName = `${c.nom || ''} ${c.prenom || ''}`.trim() || c.nom;
                  const identifier = c.cin ? ` (CIN: ${c.cin})` : c.ice ? ` (ICE: ${c.ice})` : '';
                  return {
                    value: clientName,
                    label: `${clientName}${identifier}`,
                  };
                })}
                value={form.client}
                onChange={(val) => setForm(p => ({ ...p, client: val }))}
                placeholder="Rechercher un client..."
                emptyText="Aucun client trouvé."
              />
            </FieldRow>

            {/* Date Effet */}
            <FieldRow label="Date d'effet" id="dateEff">
              <StyledInput id="dateEff" type="date" value={form.dateEff} onChange={handleDateEffChange} required />
            </FieldRow>

            {/* Mois Démission */}
            <FieldRow label="Mois d'émission" id="moisDem">
              <StyledInput id="moisDem" value={form.moisDem} onChange={setF('moisDem')} placeholder="YYYY-MM (ex: 2026-02)" required />
            </FieldRow>

            {/* Compagnie (Placé avant N° Police pour l'auto-génération fluide) */}
            <FieldRow label="Compagnie" id="compagne">
              <StyledSelect id="compagne" value={form.compagne} onChange={handleCompagneChange} required>
                <option value="">-- Sélectionner une compagnie --</option>
                {compagnes.map(c => <option key={c.id} value={c.compagneName} className="bg-card">{c.compagneName}</option>)}
              </StyledSelect>
            </FieldRow>

            {/* N° Police (Auto-généré à la sélection de la compagnie, modifiable librement) */}
            <FieldRow label="N° Police" id="numpolice">
              <div className="relative flex items-center">
                <StyledInput
                  id="numpolice"
                  value={form.numpolice}
                  onChange={setF('numpolice')}
                  required
                  placeholder="ex: POL-SANLAM-2026-001"
                  className="pr-16"
                />
                {form.compagne && (
                  <button
                    type="button"
                    onClick={handleRegeneratePolicy}
                    className="absolute right-2 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-1 rounded-md cursor-pointer"
                    title="Régénérer le N° de Police automatique"
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-medium hidden sm:inline">Auto</span>
                  </button>
                )}
              </div>
            </FieldRow>

            {/* Catégorie */}
            <FieldRow label="Catégorie" id="category">
              <StyledSelect id="category" value={form.category} onChange={handleCategoryChange} required>
                <option value="">-- Sélectionner --</option>
                {categories.map(c => <option key={c.id} value={c.name} className="bg-card">{c.name}</option>)}
              </StyledSelect>
            </FieldRow>

            {/* TVA */}
            <FieldRow label="TVA" id="tva">
              <StyledSelect id="tva" value={form.tvaRate} onChange={setF('tvaRate')}>
                <option value="0" className="bg-card">Sans TVA (0%)</option>
                {tvas.map(t => <option key={t.id} value={t.rate} className="bg-card">{t.name} ({t.rate}%)</option>)}
              </StyledSelect>
            </FieldRow>

            {/* ── Champs Spécifiques Maritime ── */}
            {form.category.toUpperCase() === 'MARITIME' && (
              <>
                <FieldRow label="N° Ordre" id="ordre">
                  <StyledInput id="ordre" value={form.ordre} onChange={setF('ordre')} placeholder="Ex: 74278" />
                </FieldRow>

                {/* Réf. Compagnie avec bouton ✨ Auto */}
                <FieldRow label="Réf. Compagnie" id="refCie">
                  <div className="relative flex items-center">
                    <StyledInput
                      id="refCie"
                      value={form.refCie}
                      onChange={setF('refCie')}
                      placeholder="ex: REF-ATLANTA-2026-001"
                      className="pr-16"
                    />
                    {form.compagne && (
                      <button
                        type="button"
                        onClick={handleAutoRefCie}
                        className="absolute right-2 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-1 rounded-md cursor-pointer"
                        title="Générer la Réf. Compagnie automatique"
                      >
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-medium hidden sm:inline">Auto</span>
                      </button>
                    )}
                  </div>
                </FieldRow>

                {/* Certificat avec bouton ✨ Auto */}
                <FieldRow label="Certificat" id="certificat">
                  <div className="relative flex items-center">
                    <StyledInput
                      id="certificat"
                      value={form.certificat}
                      onChange={setF('certificat')}
                      placeholder="ex: CERT-2026-001"
                      className="pr-16"
                    />
                    <button
                      type="button"
                      onClick={handleAutoCertificat}
                      className="absolute right-2 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-1 rounded-md cursor-pointer"
                      title="Générer le Certificat automatique"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-medium hidden sm:inline">Auto</span>
                    </button>
                  </div>
                </FieldRow>

                {/* Navire avec Datalist + Suggestions rapides */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                  <FieldRow label="Navire" id="navire">
                    <div className="space-y-2">
                      <StyledInput
                        id="navire"
                        list="frequent-navires"
                        value={form.navire}
                        onChange={setF('navire')}
                        placeholder="ex: MV TANGER EXPRESS (ou sélectionner une suggestion ci-dessous)"
                      />
                      <datalist id="frequent-navires">
                        {FREQUENT_NAVIRES.map((ship) => (
                          <option key={ship} value={ship} />
                        ))}
                      </datalist>

                      {/* Quick Suggestions Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[11px] text-muted-foreground font-medium mr-1">
                          Navires fréquents :
                        </span>
                        {FREQUENT_NAVIRES.map((ship) => (
                          <button
                            key={ship}
                            type="button"
                            onClick={() => setForm(p => ({ ...p, navire: ship }))}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                              form.navire === ship
                                ? 'bg-primary/15 text-primary border-primary/40 font-semibold shadow-xs'
                                : 'bg-muted/30 text-muted-foreground border-border/70 hover:bg-muted/80 hover:text-foreground'
                            }`}
                          >
                            {ship}
                          </button>
                        ))}
                      </div>
                    </div>
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
            {saving ? 'Création...' : "Créer l'opération"}
          </Button>
        </div>
      </form>
    </div>
  );
}
