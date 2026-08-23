'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Info,
  Loader2,
  ChevronRight,
  PlusCircle,
  Car,
  Gauge,
  UserCheck,
  History,
  RotateCcw,
  Check,
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
import { assessRisk } from '@/lib/ai';
import { RiskAssessmentRequest, RiskAssessmentResponse, RiskLevel } from '@/types';

interface RiskAssessmentModalProps {
  initialClientName?: string;
  initialCategory?: string;
  initialNature?: string;
  onApplyGuarantees?: (guarantees: string[]) => void;
  triggerButtonClassName?: string;
}

const VEHICLE_TYPES = [
  'Berline',
  'Citadine',
  'SUV / 4x4',
  'Utilitaire Léger',
  'Camion / Poids Lourd',
  'Sport / Prestige',
  'Deux-roues / Moto',
  'Navire / Bateau',
];

const USAGE_TYPES = [
  'Personnel / Privé',
  'Professionnel / Trajet régulier',
  'Transport de Marchandises',
  'Flotte commerciale',
  'Usage intensif',
];

export default function RiskAssessmentModal({
  initialClientName = '',
  initialCategory = 'AUTO',
  initialNature = 'AFFAIRE NOUVELLE',
  onApplyGuarantees,
  triggerButtonClassName,
}: RiskAssessmentModalProps) {
  const [open, setOpen] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assessment inputs
  const [clientName, setClientName] = useState(initialClientName);
  const [clientAge, setClientAge] = useState<number>(35);
  const [vehicleType, setVehicleType] = useState<string>('Berline');
  const [annualMileage, setAnnualMileage] = useState<number>(15000);
  const [historyClaimsCount, setHistoryClaimsCount] = useState<number>(0);
  const [usageType, setUsageType] = useState<string>('Personnel / Privé');
  const [clientCreditBudget, setClientCreditBudget] = useState<number>(5000);

  // Result state
  const [assessment, setAssessment] = useState<RiskAssessmentResponse | null>(null);
  const [selectedGuarantees, setSelectedGuarantees] = useState<string[]>([]);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  useEffect(() => {
    if (initialClientName) setClientName(initialClientName);
  }, [initialClientName]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError(null);
    setAppliedSuccess(false);

    try {
      const req: RiskAssessmentRequest = {
        clientName: clientName || 'Client standard',
        clientAge: Number(clientAge) || 35,
        vehicleType,
        annualMileage: Number(annualMileage) || 15000,
        historyClaimsCount: Number(historyClaimsCount) || 0,
        usageType,
        category: initialCategory,
        natureOperation: initialNature,
        clientCreditBudget: Number(clientCreditBudget) || 5000,
      };

      const res = await assessRisk(req);
      setAssessment(res);
      setSelectedGuarantees(res.recommendedGuarantees || []);
    } catch (err: any) {
      console.error('Failed to assess risk:', err);
      setError('Impossible de finaliser l\'évaluation. Veuillez vérifier votre saisie.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleApply = () => {
    if (onApplyGuarantees && selectedGuarantees.length > 0) {
      onApplyGuarantees(selectedGuarantees);
      setAppliedSuccess(true);
      setTimeout(() => {
        setAppliedSuccess(false);
        setOpen(false);
      }, 1200);
    }
  };

  const toggleGuarantee = (g: string) => {
    setSelectedGuarantees((prev) =>
      prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g]
    );
  };

  const getRiskBadgeConfig = (level?: RiskLevel) => {
    switch (level) {
      case 'LOW':
        return {
          label: 'Risque Faible • Profil Sécurisé',
          className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20',
          icon: ShieldCheck,
          gaugeColor: 'from-emerald-500 to-green-400',
          scoreColor: 'text-emerald-400',
        };
      case 'MEDIUM':
        return {
          label: 'Risque Modéré • Standard',
          className: 'bg-amber-500/15 text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20',
          icon: AlertTriangle,
          gaugeColor: 'from-amber-500 to-yellow-400',
          scoreColor: 'text-amber-400',
        };
      case 'HIGH':
        return {
          label: 'Risque Élevé • Sous Surveillance',
          className: 'bg-rose-500/15 text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20',
          icon: ShieldAlert,
          gaugeColor: 'from-rose-600 to-rose-400',
          scoreColor: 'text-rose-400',
        };
      default:
        return {
          label: 'Évaluation en attente',
          className: 'bg-muted text-muted-foreground border-border',
          icon: Brain,
          gaugeColor: 'from-primary to-blue-400',
          scoreColor: 'text-primary',
        };
    }
  };

  const badgeConfig = getRiskBadgeConfig(assessment?.riskLevel);
  const RiskIcon = badgeConfig.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`relative group overflow-hidden border-primary/40 hover:border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/20 hover:via-primary/10 hover:to-primary/5 transition-all duration-300 shadow-sm hover:shadow-primary/20 ${triggerButtonClassName || ''}`}
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Sparkles className="w-4 h-4 animate-pulse text-primary" />
            <Brain className="w-4 h-4 text-primary" />
            <span>Évaluer le risque avec l'IA</span>
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 bg-card/95 backdrop-blur-md border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/30 flex items-center justify-center shadow-inner flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
                Smart Risk Scoring & Underwriting Advisor
                <Badge variant="blue" className="text-[10px] tracking-wide font-mono uppercase px-2 py-0.5">
                  IA Actuarielle
                </Badge>
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Analyse intelligente du profil de risque, recommandations tarifaires et garanties optimales.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Underwriting Parameters Form */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />
                Paramètres de souscription
              </h3>
              {clientName && (
                <span className="text-xs text-muted-foreground">
                  Client : <strong className="text-foreground">{clientName}</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Age */}
              <div className="space-y-1.5">
                <Label htmlFor="ai-age" className="text-xs font-medium text-muted-foreground">
                  Âge du souscripteur / conducteur
                </Label>
                <div className="relative">
                  <Input
                    id="ai-age"
                    type="number"
                    min="18"
                    max="99"
                    value={clientAge}
                    onChange={(e) => setClientAge(Number(e.target.value))}
                    className="bg-card border-border pr-8 text-sm"
                    placeholder="35"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    ans
                  </span>
                </div>
              </div>

              {/* Claims count */}
              <div className="space-y-1.5">
                <Label htmlFor="ai-claims" className="text-xs font-medium text-muted-foreground">
                  Sinistres déclarés (3 ans)
                </Label>
                <select
                  id="ai-claims"
                  value={historyClaimsCount}
                  onChange={(e) => setHistoryClaimsCount(Number(e.target.value))}
                  className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="0">0 sinistre (Bonus max)</option>
                  <option value="1">1 sinistre</option>
                  <option value="2">2 sinistres</option>
                  <option value="3">3 sinistres ou plus</option>
                </select>
              </div>

              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <Label htmlFor="ai-vehicle" className="text-xs font-medium text-muted-foreground">
                  Type de véhicule / Risque
                </Label>
                <select
                  id="ai-vehicle"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mileage */}
              <div className="space-y-1.5">
                <Label htmlFor="ai-mileage" className="text-xs font-medium text-muted-foreground">
                  Kilométrage annuel estimé
                </Label>
                <div className="relative">
                  <Input
                    id="ai-mileage"
                    type="number"
                    step="1000"
                    min="1000"
                    max="150000"
                    value={annualMileage}
                    onChange={(e) => setAnnualMileage(Number(e.target.value))}
                    className="bg-card border-border pr-12 text-sm"
                    placeholder="15000"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    km/an
                  </span>
                </div>
              </div>

              {/* Usage Type */}
              <div className="space-y-1.5">
                <Label htmlFor="ai-usage" className="text-xs font-medium text-muted-foreground">
                  Usage principal
                </Label>
                <select
                  id="ai-usage"
                  value={usageType}
                  onChange={(e) => setUsageType(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {USAGE_TYPES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              <div className="space-y-1.5 flex flex-col justify-end">
                <Button
                  type="button"
                  onClick={handleEvaluate}
                  disabled={evaluating}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-md shadow-primary/20 h-9 gap-2"
                >
                  {evaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {assessment ? 'Recalculer le score' : 'Lancer l\'évaluation IA'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-rose-400 rounded-xl px-4 py-3 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Assessment Result Card */}
          {assessment && (
            <div className="space-y-5 animate-in fade-in-50 duration-300">
              {/* Score & Badge Hero */}
              <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Diagnostic de risque
                      </span>
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${badgeConfig.className}`}
                      >
                        <RiskIcon className="w-3.5 h-3.5" />
                        {badgeConfig.label}
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
                      {assessment.summary}
                    </p>
                  </div>

                  {/* Score Meter */}
                  <div className="flex sm:flex-col items-center justify-between sm:justify-center p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/50 min-w-[140px] text-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Score de sécurité
                    </span>
                    <div className="flex items-baseline gap-1 my-1">
                      <span className={`text-3xl sm:text-4xl font-extrabold tabular-nums ${badgeConfig.scoreColor}`}>
                        {assessment.riskScore}
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground font-bold">/100</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground hidden sm:block">
                      Indice Actuariel
                    </span>
                  </div>
                </div>

                {/* Progress bar gauge */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>Risque Élevé (0)</span>
                    <span>Modéré (50)</span>
                    <span>Sécurisé (100)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-muted overflow-hidden p-0.5 border border-border/40">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${badgeConfig.gaugeColor} transition-all duration-700 ease-out`}
                      style={{ width: `${Math.max(5, assessment.riskScore)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Recommendation Banner */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingDown className="w-4 h-4 text-primary" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                    Conseil de tarification & Souscription
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground font-normal leading-relaxed">
                    {assessment.pricingRecommendation}
                  </p>
                </div>
              </div>

              {/* Flags and Drivers */}
              {assessment.flags && assessment.flags.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2.5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    Facteurs déterminants & Justifications
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground/90">
                    {assessment.flags.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-muted/20 rounded-lg p-2 border border-border/40">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Guarantees */}
              {assessment.recommendedGuarantees && assessment.recommendedGuarantees.length > 0 && (
                <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 space-y-3.5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Garanties recommandées par l'IA ({selectedGuarantees.length} sélectionnée{selectedGuarantees.length > 1 ? 's' : ''})
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Cliquez pour ajuster les garanties à injecter dans la police.
                      </p>
                    </div>

                    {onApplyGuarantees && (
                      <Button
                        type="button"
                        onClick={handleApply}
                        disabled={selectedGuarantees.length === 0 || appliedSuccess}
                        className={`text-xs font-semibold shadow-md gap-1.5 transition-all ${
                          appliedSuccess
                            ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        }`}
                      >
                        {appliedSuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Garanties appliquées !
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" />
                            Appliquer les garanties suggérées
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {assessment.recommendedGuarantees.map((guarantee) => {
                      const isSelected = selectedGuarantees.includes(guarantee);
                      return (
                        <button
                          key={guarantee}
                          type="button"
                          onClick={() => toggleGuarantee(guarantee)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary/15 border-primary/40 text-primary hover:bg-primary/20 shadow-xs'
                              : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground/40'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span>{guarantee}</span>
                        </button>
                      );
                    })}
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
