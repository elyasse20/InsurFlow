'use client';

import React, { useState } from 'react';
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
  User,
  Hash,
  Car,
  ChevronRight,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { analyzeClaim } from '@/lib/ai';
import { ClaimAnalysisRequest, ClaimAnalysisResponse, FraudRiskLevel } from '@/types';

interface ClaimsAnalyzerModalProps {
  initialClientName?: string;
  initialPolicyNumber?: string;
  initialCategory?: string;
  triggerButtonClassName?: string;
  triggerButtonText?: string;
  triggerButtonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  triggerButtonSize?: 'default' | 'sm' | 'lg' | 'icon';
}

const PRESETS = [
  {
    id: 'carambolage',
    title: 'Accident en chaîne autoroute',
    category: 'AUTO',
    damage: 18500,
    deductible: 2000,
    text: "Autoroute Casablanca - Rabat, PK 45. Fort ralentissement dû à un bouchon. Le véhicule A (notre assuré) s'est arrêté normalement. Le véhicule B (tiers immatriculé 12345-A-6) n'a pas maîtrisé son freinage et a percuté violemment l'arrière du véhicule A, le projetant sur le véhicule C. Constat amiable signé avec mention choc arrière. Dégâts importants malle arrière et pare-chocs.",
  },
  {
    id: 'parking_solo',
    title: 'Accrochage parking sans tiers',
    category: 'AUTO',
    damage: 9200,
    deductible: 1500,
    text: "L'assuré déclare avoir retrouvé son véhicule avec une aile avant gauche et portière embouties sur le parking d'un supermarché à Marrakech. Aucun témoin, aucun tiers identifié. Contrat souscrit il y a 8 jours. L'assuré demande une prise en charge intégrale sans application de franchise.",
  },
  {
    id: 'vol_effraction',
    title: 'Vol partiel avec effraction',
    category: 'AUTO',
    damage: 24000,
    deductible: 3000,
    text: "Véhicule stationné de nuit devant le domicile de l'assuré à Tanger. Constat au matin : vitre latérale brisée, tableau de bord démonté, système multimédia GPS et volant dérobés. Plainte déposée au commissariat du 3ème arrondissement (PV N° 8492/2026 fourni).",
  },
  {
    id: 'priorite',
    title: 'Choc latéral refus de priorité',
    category: 'AUTO',
    damage: 14000,
    deductible: 2500,
    text: "Intersection Boulevard Zerktouni / Rue d'Anfa. Collision entre le véhicule A (notre assuré venant de droite) et le véhicule B venant d'une voie avec panneau 'Cédez le passage'. Le conducteur B conteste et affirme que notre assuré roulait à vive allure. Constat amiable non signé par la partie adverse, présence de la police de la circulation.",
  },
];

export default function ClaimsAnalyzerModal({
  initialClientName = '',
  initialPolicyNumber = '',
  initialCategory = 'AUTO',
  triggerButtonClassName,
  triggerButtonText = 'Analyser Sinistre IA',
  triggerButtonVariant = 'outline',
  triggerButtonSize = 'sm',
}: ClaimsAnalyzerModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [claimText, setClaimText] = useState(PRESETS[0].text);
  const [clientName, setClientName] = useState(initialClientName || 'Société Atlas Transport');
  const [policyNumber, setPolicyNumber] = useState(initialPolicyNumber || 'POL-2026-0927');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(initialCategory);
  const [estimatedDamage, setEstimatedDamage] = useState<number>(PRESETS[0].damage);
  const [deductible, setDeductible] = useState<number>(PRESETS[0].deductible);

  // Result state
  const [result, setResult] = useState<ClaimAnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setClaimText(preset.text);
    setCategory(preset.category);
    setEstimatedDamage(preset.damage);
    setDeductible(preset.deductible);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!claimText.trim()) {
      setError('Veuillez saisir ou coller la déclaration de sinistre.');
      return;
    }

    setLoading(true);
    setError(null);

    const req: ClaimAnalysisRequest = {
      claimText: claimText.trim(),
      clientName: clientName.trim() || undefined,
      policyNumber: policyNumber.trim() || undefined,
      incidentDate: incidentDate || undefined,
      category: category || 'AUTO',
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

  const handleCopyReport = async () => {
    if (!result) return;

    const reportText = `=== RAPPORT D'ANALYSE SINISTRE IA (InsurFlow Copilot) ===
Client: ${clientName} | Police: ${policyNumber} | Date: ${incidentDate}
Niveau de Risque Fraude: ${result.fraudRiskLevel} (Score: ${result.fraudRiskScore}/100)

1. RÉSUMÉ EXÉCUTIF
${result.executiveSummary}

2. ÉVALUATION RESPONSABILITÉ & BARÈME ACAPS
${result.liabilityAssessment}

3. DÉCOMPOSITION FINANCIÈRE
• Dommages estimés: ${result.financialBreakdown?.estimatedDamage?.toLocaleString('fr-MA')} MAD
• Franchise déduite: - ${result.financialBreakdown?.deductible?.toLocaleString('fr-MA')} MAD
• Indemnité nette estimée: ${result.financialBreakdown?.netPayout?.toLocaleString('fr-MA')} MAD

4. INDICATEURS D'ALERTE / FRAUDE
${result.riskFlags?.map((f) => `• ${f}`).join('\n') || 'Aucun'}

5. ACTIONS RECOMMANDÉES
${result.recommendedActions?.map((a) => `[ ] ${a}`).join('\n') || 'Aucune'}`;

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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs">Risque Faible</span>
              <span className="text-[11px] font-mono opacity-80">({score}/100)</span>
            </div>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Cinématique cohérente • Dossier conforme</p>
          </div>
        </div>
      );
    }
    if (level === 'MOYEN') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs">Risque Modéré</span>
              <span className="text-[11px] font-mono opacity-80">({score}/100)</span>
            </div>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Vérifications d&apos;usage recommandées</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs">Alerte Fraude Élevée</span>
            <span className="text-[11px] font-mono opacity-80">({score}/100)</span>
          </div>
          <p className="text-[10px] text-destructive/80">Anomalies critiques • Expertise approfondie requise</p>
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

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-card border-border/80 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-primary/10 via-indigo-500/5 to-transparent flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20 flex-shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  InsurFlow Claims AI Analyzer
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 font-semibold">
                  ACAPS & Loi 17-99
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Résumé intelligent des déclarations de sinistres, détermination des responsabilités & indicateurs de fraude.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Preset Quick Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Modèles de sinistres pré-remplis pour test :
              </span>
              <span className="text-[11px] text-muted-foreground">Cliquez pour charger</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-2.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 text-left transition-all text-xs group cursor-pointer shadow-2xs"
                >
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {preset.title}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                    <span>{preset.damage.toLocaleString('fr-MA')} MAD</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="claim-text" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Déclaration / Constat Amiable / Rapport d&apos;accident :</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {claimText.length} caractères
                </span>
              </Label>
              <textarea
                id="claim-text"
                rows={5}
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
                placeholder="Collez ici les observations du constat amiable, les circonstances, les tiers impliqués, le lieu et l'heure de l'accident..."
                className="w-full rounded-xl border border-input bg-muted/20 p-3 text-xs sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 placeholder:text-muted-foreground leading-relaxed resize-y"
              />
            </div>

            <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border/70 text-xs">
              <div>
                <Label htmlFor="client-name" className="text-[11px] text-muted-foreground">Client / Assuré</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-8 text-xs mt-1 bg-card"
                  placeholder="Nom de l'assuré"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="policy-no" className="text-[11px] text-muted-foreground">N° Police</Label>
                  <Input
                    id="policy-no"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="h-8 text-xs mt-1 bg-card"
                    placeholder="POL-2026-..."
                  />
                </div>
                <div>
                  <Label htmlFor="incident-date" className="text-[11px] text-muted-foreground">Date Sinistre</Label>
                  <Input
                    id="incident-date"
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="h-8 text-xs mt-1 bg-card"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="est-damage" className="text-[11px] text-muted-foreground">Dommages (MAD)</Label>
                  <Input
                    id="est-damage"
                    type="number"
                    value={estimatedDamage}
                    onChange={(e) => setEstimatedDamage(Number(e.target.value))}
                    className="h-8 text-xs mt-1 bg-card"
                  />
                </div>
                <div>
                  <Label htmlFor="deductible" className="text-[11px] text-muted-foreground">Franchise (MAD)</Label>
                  <Input
                    id="deductible"
                    type="number"
                    value={deductible}
                    onChange={(e) => setDeductible(Number(e.target.value))}
                    className="h-8 text-xs mt-1 bg-card"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setClaimText('');
                setResult(null);
                setError(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </Button>

            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !claimText.trim()}
              className="gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground shadow-md shadow-primary/20 px-5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyse IA en cours...</span>
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
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── RESULTS DASHBOARD ────────────────────────────────────────── */}
          {result && (
            <div className="space-y-4 pt-4 border-t border-border animate-in fade-in-50 slide-in-from-bottom-3 duration-200">
              {/* Header Status & Copy Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/30 border border-border/80">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Résultat de l&apos;évaluation IA
                  </span>
                  <h4 className="text-sm font-bold text-foreground mt-0.5">
                    Dossier Sinistre : {policyNumber || 'POL-SN'} — {clientName || 'Assuré'}
                  </h4>
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
                {/* 1. Résumé Exécutif */}
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                    <FileText className="w-4 h-4" />
                    <span>Résumé Exécutif & Circonstances</span>
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {result.executiveSummary}
                  </div>
                </div>

                {/* 2. Responsabilité & ACAPS */}
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs">
                    <Scale className="w-4 h-4" />
                    <span>Évaluation Responsabilité (Barème ACAPS & Loi 17-99)</span>
                  </div>
                  <p className="text-xs text-foreground font-medium leading-relaxed">
                    {result.liabilityAssessment}
                  </p>
                </div>

                {/* 3. Décomposition Financière */}
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs">
                    <DollarSign className="w-4 h-4" />
                    <span>Chiffrage Financier & Règlements</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] text-muted-foreground">Dommages Estimés</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">
                        {result.financialBreakdown?.estimatedDamage?.toLocaleString('fr-MA')} MAD
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] text-muted-foreground">Franchise Déduite</p>
                      <p className="text-xs font-bold text-destructive mt-0.5">
                        - {result.financialBreakdown?.deductible?.toLocaleString('fr-MA')} MAD
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Indemnité Nette</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {result.financialBreakdown?.netPayout?.toLocaleString('fr-MA')} MAD
                      </p>
                    </div>
                  </div>
                  {result.financialBreakdown?.notes && (
                    <p className="text-[10px] text-muted-foreground italic">
                      * {result.financialBreakdown.notes}
                    </p>
                  )}
                </div>

                {/* 4. Indicateurs d'Alerte / Fraude */}
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Indicateurs d&apos;Alerte ({result.riskFlags?.length || 0})</span>
                  </div>

                  {result.riskFlags && result.riskFlags.length > 0 ? (
                    <div className="space-y-1.5">
                      {result.riskFlags.map((flag, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucune anomalie détectée sur ce dossier.</p>
                  )}
                </div>
              </div>

              {/* 5. Plan d'Actions Recommandé */}
              {result.recommendedActions && result.recommendedActions.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-indigo-500/5 to-transparent border border-primary/20 space-y-2.5">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Actions Recommandées pour le Gestionnaire Sinistres</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.recommendedActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-xl bg-card border border-border/60 text-xs text-foreground"
                      >
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
