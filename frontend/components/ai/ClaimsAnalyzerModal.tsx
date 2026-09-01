'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  DollarSign,
  Scale,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  RotateCcw,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck2,
  Save,
  FolderPlus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import api from '@/lib/api';
import { analyzeClaim } from '@/lib/ai';
import { formatAmount, formatDate } from '@/lib/format';
import {
  ClaimAnalysisRequest,
  ClaimAnalysisResponse,
  FraudRiskLevel,
  Client,
  Production,
  Sinistre,
  CreateSinistreRequest,
} from '@/types';

interface ClaimsAnalyzerModalProps {
  initialClientName?: string;
  initialPolicyNumber?: string;
  initialCategory?: string;
  triggerButtonClassName?: string;
  triggerButtonText?: string;
  triggerButtonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  triggerButtonSize?: 'default' | 'sm' | 'lg' | 'icon';
  onSinistreSaved?: (saved: Sinistre) => void;
}

export default function ClaimsAnalyzerModal({
  initialClientName = '',
  initialPolicyNumber = '',
  initialCategory = 'AUTOMOBILE',
  triggerButtonClassName,
  triggerButtonText = 'Analyser Sinistre IA',
  triggerButtonVariant = 'outline',
  triggerButtonSize = 'sm',
  onSinistreSaved,
}: ClaimsAnalyzerModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data sources
  const [clients, setClients] = useState<Client[]>([]);
  const [productions, setExistingProductions] = useState<Production[]>([]);
  const [clientPolicies, setClientPolicies] = useState<Production[]>([]);

  // Form states
  const [clientName, setClientName] = useState(initialClientName);
  const [policyNumber, setPolicyNumber] = useState(initialPolicyNumber);
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(initialCategory);
  const [estimatedDamage, setEstimatedDamage] = useState<number | string>(15000);
  const [deductible, setDeductible] = useState<number | string>(2000);
  const [claimText, setClaimText] = useState('');

  // Result state
  const [result, setResult] = useState<ClaimAnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Load real clients & productions when modal opens
  useEffect(() => {
    if (open) {
      setSaveSuccess(false);
      Promise.all([
        api.get<Client[]>('/clients'),
        api.get<Production[]>('/productions'),
      ])
        .then(([clRes, prRes]) => {
          setClients(clRes.data ?? []);
          const allProds = prRes.data ?? [];
          setExistingProductions(allProds);

          // If initialClientName was passed, sync its policies
          if (initialClientName) {
            syncClientPolicies(initialClientName, allProds);
          }
        })
        .catch((err) => {
          console.error('Failed to load clients/productions for claims analyzer:', err);
        });
    }
  }, [open, initialClientName]);

  const syncClientPolicies = (selectedName: string, allProds: Production[]) => {
    if (!selectedName) {
      setClientPolicies([]);
      return;
    }

    const query = selectedName.toLowerCase().trim();
    const matching = allProds.filter((p) => {
      if (!p.client) return false;
      const pClient = p.client.toLowerCase().trim();
      return pClient === query || pClient.includes(query) || query.includes(pClient);
    });

    setClientPolicies(matching);

    if (matching.length === 1) {
      // Exactly 1 policy: auto-fill
      setPolicyNumber(matching[0].numpolice);
      if (matching[0].category) setCategory(matching[0].category);
    } else if (matching.length > 1) {
      // Multiple policies: set the first one or keep current if valid
      const exists = matching.some((p) => p.numpolice === policyNumber);
      if (!exists) {
        setPolicyNumber(matching[0].numpolice);
        if (matching[0].category) setCategory(matching[0].category);
      }
    }
  };

  const handleClientChange = (selectedName: string) => {
    setClientName(selectedName);
    syncClientPolicies(selectedName, productions);
  };

  const handlePolicyChange = (selectedPolicy: string) => {
    setPolicyNumber(selectedPolicy);
    const prod = clientPolicies.find((p) => p.numpolice === selectedPolicy);
    if (prod?.category) {
      setCategory(prod.category);
    }
  };

  const handleAnalyze = async () => {
    if (!claimText.trim()) {
      setError('Veuillez saisir ou coller les circonstances du constat / déclaration de sinistre.');
      return;
    }

    setLoading(true);
    setError(null);

    const req: ClaimAnalysisRequest = {
      claimText: claimText.trim(),
      clientName: clientName.trim() || undefined,
      policyNumber: policyNumber.trim() || undefined,
      incidentDate: incidentDate || undefined,
      category: category || 'AUTOMOBILE',
      estimatedDamage: Number(estimatedDamage) || undefined,
      deductible: Number(deductible) || undefined,
    };

    try {
      const data = await analyzeClaim(req);
      setResult(data);
    } catch (err: any) {
      console.error('Failed to analyze claim:', err);
      setError("Une erreur est survenue lors de l'analyse du sinistre.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSinistre = async () => {
    if (!result) return;
    setSaving(true);
    setError(null);

    const matchedProd = clientPolicies.find((p) => p.numpolice === policyNumber) ||
      productions.find((p) => p.numpolice === policyNumber);

    const payload: CreateSinistreRequest = {
      clientName: clientName.trim() || 'Assuré InsurFlow',
      policyNumber: policyNumber.trim() || 'POL-REF-001',
      compagne: matchedProd?.compagne,
      category: category || matchedProd?.category || 'AUTOMOBILE',
      incidentDate: incidentDate || new Date().toISOString().slice(0, 10),
      declarationDate: new Date().toISOString().slice(0, 10),
      claimText: claimText.trim(),
      status: 'DECLARE',
      fraudRiskScore: result.fraudRiskScore,
      fraudRiskLevel: result.fraudRiskLevel,
      liabilityAssessment: result.liabilityAssessment,
      estimatedDamage: result.financialBreakdown?.estimatedDamage ?? Number(estimatedDamage),
      deductible: result.financialBreakdown?.deductible ?? Number(deductible),
      netPayout: result.financialBreakdown?.netPayout ?? 0,
      riskFlags: result.riskFlags,
      recommendedActions: result.recommendedActions,
      executiveSummary: result.executiveSummary,
    };

    try {
      const res = await api.post<Sinistre>('/sinistres', payload);
      setSaveSuccess(true);

      if (onSinistreSaved) {
        onSinistreSaved(res.data);
      }

      setTimeout(() => {
        setOpen(false);
        setSaveSuccess(false);
        if (!onSinistreSaved) {
          router.push('/sinistres');
        }
      }, 1200);
    } catch (err: any) {
      console.error('Failed to save claim:', err);
      setError(err?.response?.data?.message || "Erreur lors de l'enregistrement du dossier sinistre dans la base.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setClaimText('');
    setResult(null);
    setError(null);
    setSaveSuccess(false);
    setEstimatedDamage(15000);
    setDeductible(2000);
    if (!initialClientName) {
      setClientName('');
      setPolicyNumber('');
      setClientPolicies([]);
    }
  };

  const handleCopyReport = async () => {
    if (!result) return;

    const reportText = `=== RAPPORT D'EXPERTISE SINISTRE IA (InsurFlow Copilot) ===
Client / Assuré : ${clientName || 'N/A'}
N° Police       : ${policyNumber || 'N/A'}
Date Sinistre   : ${formatDate(incidentDate)}
Catégorie       : ${category}

1. NIVEAU DE SUSPICION DE FRAUDE
• Indice de Risque : ${result.fraudRiskLevel} (Score: ${result.fraudRiskScore}/100)

2. QUALIFICATION DE LA RESPONSABILITÉ (ACAPS / CISA)
${result.liabilityAssessment}

3. DÉCOMPTE FINANCIER NET
• Dommages Estimés       : ${formatAmount(result.financialBreakdown?.estimatedDamage ?? 0)}
• Franchise Contractuelle : - ${formatAmount(result.financialBreakdown?.deductible ?? 0)}
• Indemnité Nette Estimée : ${formatAmount(result.financialBreakdown?.netPayout ?? 0)}
${result.financialBreakdown?.notes ? `  (${result.financialBreakdown.notes})` : ''}

4. ANOMALIES LÉGALES & INDICATEURS D'ALERTE (LOI N° 17-99)
${result.riskFlags?.map((f) => `• ${f}`).join('\n') || 'Aucune anomalie critique détectée.'}

5. PLAN D'ACTIONS RECOMMANDÉ (GESTIONNAIRE SINISTRE)
${result.recommendedActions?.map((a, i) => `${i + 1}. ${a}`).join('\n') || 'Aucune action particulière.'}

6. RÉSUMÉ EXÉCUTIF DU DOSSIER
${result.executiveSummary}
==========================================================`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
        await navigator.clipboard.writeText(reportText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = reportText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy report:', e);
    }
  };

  const getRiskBadge = (level: FraudRiskLevel, score: number) => {
    if (level === 'FAIBLE') {
      return (
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs">Risque Faible</span>
              <span className="text-[11px] font-mono font-bold bg-emerald-500/20 px-1.5 py-0.2 rounded">
                Score: {score}/100
              </span>
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-300 opacity-90 mt-0.5">
              Cinématique cohérente • Dossier conforme
            </p>
          </div>
        </div>
      );
    }
    if (level === 'MOYEN') {
      return (
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs">Risque Modéré</span>
              <span className="text-[11px] font-mono font-bold bg-amber-500/20 px-1.5 py-0.2 rounded">
                Score: {score}/100
              </span>
            </div>
            <p className="text-[10px] text-amber-700 dark:text-amber-300 opacity-90 mt-0.5">
              Vérifications d&apos;usage recommandées
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
        <ShieldAlert className="w-5 h-5 flex-shrink-0 text-destructive" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs">Suspicion Élevée</span>
            <span className="text-[11px] font-mono font-bold bg-destructive/20 px-1.5 py-0.2 rounded">
              Score: {score}/100
            </span>
          </div>
          <p className="text-[10px] text-destructive/90 mt-0.5">
            Anomalies critiques • Expertise contradictoire requise
          </p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerButtonVariant}
          size={triggerButtonSize}
          className={
            triggerButtonClassName ||
            'gap-1.5 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-violet-500/10 border border-primary/30 hover:border-primary text-primary hover:bg-primary/15 transition-all shadow-2xs font-medium cursor-pointer'
          }
        >
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>{triggerButtonText}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-card border-border/80 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-primary/10 via-indigo-500/5 to-transparent flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Analyse Intelligente des Sinistres
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 font-semibold">
                  Barème ACAPS / CISA & Loi 17-99
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit automatique des déclarations de sinistre, détection de fraude et détermination des responsabilités.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Main Input Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Constat / Déclaration Textarea (min-h-[160px]) */}
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="claim-text" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Constat Amiable / Déclaration du Sinistre :
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {claimText.length} caractère(s)
                </span>
              </Label>
              <textarea
                id="claim-text"
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
                placeholder="Exemple : Véhicule A arrêté au feu rouge. Le véhicule B venant de l'arrière n'a pas freiné et a percuté violemment le pare-chocs arrière. Constat amiable signé avec case 'choc arrière' cochée pour le tiers. Dégâts estimés à 18 500 DH..."
                className="w-full min-h-[160px] rounded-xl border border-input bg-muted/20 p-3.5 text-xs sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 placeholder:text-muted-foreground leading-relaxed resize-y shadow-xs"
              />
            </div>

            {/* Right: Client / Policy / Financial parameters */}
            <div className="space-y-3.5 bg-muted/20 p-4 rounded-xl border border-border/70 text-xs">
              {/* 1. Client searchable combobox */}
              <div className="space-y-1.5">
                <Label htmlFor="client-select" className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-primary" />
                  Client / Assuré
                </Label>
                <Combobox
                  options={clients.map((c) => {
                    const label = c.type === 'particulier' && c.prenom ? `${c.prenom} ${c.nom}` : c.nom;
                    return { value: c.nom, label };
                  })}
                  value={clientName}
                  onChange={handleClientChange}
                  placeholder="Rechercher un client..."
                  emptyText="Aucun client trouvé."
                  className="bg-card"
                />
              </div>

              {/* 2. N° Police: dynamic dropdown if multiple, auto-filled if single, editable input if manual */}
              <div className="space-y-1.5">
                <Label htmlFor="policy-select" className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileCheck2 className="w-3 h-3 text-primary" />
                    N° Police
                  </span>
                  {clientPolicies.length > 1 && (
                    <span className="text-[10px] text-primary font-medium">
                      ({clientPolicies.length} contrats)
                    </span>
                  )}
                </Label>

                {clientPolicies.length > 1 ? (
                  <select
                    id="policy-select"
                    value={policyNumber}
                    onChange={(e) => handlePolicyChange(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground font-mono"
                  >
                    <option value="">-- Choisir une police du client --</option>
                    {clientPolicies.map((p) => (
                      <option key={p.id} value={p.numpolice}>
                        {p.numpolice} — {p.compagne} ({p.category})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="policy-input"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="ex: POL-SANLAM-2026-001"
                    className="h-9 text-xs bg-card font-mono"
                  />
                )}
              </div>

              {/* 3. Date du sinistre (format JJ/MM/AAAA) */}
              <div className="space-y-1.5">
                <Label htmlFor="incident-date" className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary" />
                  Date du sinistre (JJ/MM/AAAA)
                </Label>
                <Input
                  id="incident-date"
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
              </div>

              {/* 4. Dommages estimés & Franchise */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="est-damage" className="text-[10px] text-muted-foreground">
                    Dommages (MAD)
                  </Label>
                  <Input
                    id="est-damage"
                    type="number"
                    min="0"
                    step="100"
                    value={estimatedDamage}
                    onChange={(e) => setEstimatedDamage(e.target.value)}
                    className="h-8 text-xs bg-card"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="deductible" className="text-[10px] text-muted-foreground">
                    Franchise (MAD)
                  </Label>
                  <Input
                    id="deductible"
                    type="number"
                    min="0"
                    step="100"
                    value={deductible}
                    onChange={(e) => setDeductible(e.target.value)}
                    className="h-8 text-xs bg-card"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Effacer / Réinitialiser</span>
            </Button>

            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !claimText.trim()}
              className="gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground shadow-md shadow-primary/20 px-5 h-10 cursor-pointer font-semibold text-xs sm:text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyse du sinistre en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Lancer l&apos;analyse du sinistre</span>
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── RESULTS DASHBOARD ────────────────────────────────────────── */}
          {result && (
            <div className="space-y-4 pt-4 border-t border-border animate-in fade-in-50 slide-in-from-bottom-3 duration-200">
              {/* Header Status & Copy Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/30 border border-border/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Résultat de l&apos;Expertise Sinistre IA
                  </span>
                  <h4 className="text-sm font-bold text-foreground mt-0.5">
                    Dossier : {policyNumber || 'POL-REF'} — {clientName || 'Assuré'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Date du sinistre : {formatDate(incidentDate)}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  {getRiskBadge(result.fraudRiskLevel, result.fraudRiskScore)}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyReport}
                    className="gap-1 text-xs border-border bg-card hover:bg-muted"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-medium">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Copier</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Qualification de la Responsabilité (Barème ACAPS / CISA) */}
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs">
                    <Scale className="w-4 h-4" />
                    <span>Qualification de la Responsabilité (Barème ACAPS / CISA)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-foreground font-medium leading-relaxed">
                    {result.liabilityAssessment}
                  </div>
                </div>

                {/* 2. Décompte Financier Net */}
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs">
                    <DollarSign className="w-4 h-4" />
                    <span>Décompte Financier Net</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] text-muted-foreground font-medium">Dommages Estimés</p>
                      <p className="text-xs font-bold text-foreground mt-0.5 tabular-nums">
                        {formatAmount(result.financialBreakdown?.estimatedDamage ?? 0)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] text-muted-foreground font-medium">Franchise Déduite</p>
                      <p className="text-xs font-bold text-destructive mt-0.5 tabular-nums">
                        - {formatAmount(result.financialBreakdown?.deductible ?? 0)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Indemnité Nette</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                        {formatAmount(result.financialBreakdown?.netPayout ?? 0)}
                      </p>
                    </div>
                  </div>
                  {result.financialBreakdown?.notes && (
                    <p className="text-[10px] text-muted-foreground italic">
                      * {result.financialBreakdown.notes}
                    </p>
                  )}
                </div>

                {/* 3. Anomalies Légales & Indicateurs de Risque (Loi 17-99) */}
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Anomalies Légales & Alertes Détectées</span>
                  </div>

                  {result.riskFlags && result.riskFlags.length > 0 ? (
                    <div className="space-y-1.5">
                      {result.riskFlags.map((flag, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-foreground">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground p-2 bg-muted/20 rounded-lg">
                      Aucune anomalie critique détectée.
                    </p>
                  )}
                </div>

                {/* 4. Actions Recommandées (Gestionnaire Sinistre) */}
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Actions Recommandées pour le Gestionnaire</span>
                  </div>

                  {result.recommendedActions && result.recommendedActions.length > 0 ? (
                    <div className="space-y-1.5">
                      {result.recommendedActions.map((action, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground"
                        >
                          <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground p-2 bg-muted/20 rounded-lg">
                      Aucune action spécifique requise.
                    </p>
                  )}
                </div>
              </div>

              {/* 5. Résumé Exécutif & Circonstances */}
              {result.executiveSummary && (
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground font-semibold text-xs">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Résumé Exécutif & Circonstances du Sinistre</span>
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap p-3 rounded-xl bg-muted/20 border border-border/60">
                    {result.executiveSummary}
                  </div>
                </div>
              )}

              {/* 6. Enregistrement du Dossier Sinistre dans la Base */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground">
                      Créer & Enregistrer le dossier Sinistre
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      Consigne l&apos;expertise, le score IA et le décompte financier dans le module Sinistres.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSaveSinistre}
                  disabled={saving || saveSuccess}
                  className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 h-9 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Dossier Enregistré !</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Enregistrer le dossier Sinistre</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
