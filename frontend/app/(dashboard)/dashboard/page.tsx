'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Users, TrendingUp, CreditCard, AlertCircle,
  CheckCircle2, Clock, BarChart2, ArrowRight, Building2,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatAmount, formatDate, formatMonthLabel } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ExerciceSelector from '@/components/ExerciceSelector';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CategoryStat { category: string; count: number; montant: number; }
interface LabelValue   { label: string; value: number; count?: number; }
interface RecentProd   {
  id: string; numpolice: string; client: string; category: string;
  compagne: string; montant: number; dateEff: string; reglementStatus?: string;
}
interface DashboardStats {
  totalProductions: number;
  montantTotal: number;
  montantRegle: number;
  montantRestant: number;
  totalClients: number;
  reglementsPaie: number;
  reglementsPartiel: number;
  reglementsEnAttente: number;
  byCategory: CategoryStat[];
  byCompagne: LabelValue[];
  byMonth: LabelValue[];
  recentProductions: RecentProd[];
}

// ── Palette (css vars-aware) ──────────────────────────────────────────────────
const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
];

const STATUS_CFG = {
  PAYE:       { label: 'Payé',        cls: 'green'     },
  PARTIEL:    { label: 'Partiel',     cls: 'amber'     },
  EN_ATTENTE: { label: 'En attente',  cls: 'secondary' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, loading,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3 relative overflow-hidden group hover:border-primary/30 transition-all shadow-sm">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${color} rounded-xl`} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} flex-shrink-0`}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="relative">
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate">{value}</p>
        )}
        {sub && !loading && (
          <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

/** Simple CSS-only horizontal bar chart */
function BarChart({ data, maxVal, colorFn }: {
  data: LabelValue[];
  maxVal: number;
  colorFn?: (i: number) => string;
}) {
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
        const color = colorFn ? colorFn(i) : CHART_COLORS[i % CHART_COLORS.length];
        return (
          <div key={d.label} className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground gap-2">
              <span className="truncate max-w-[160px] sm:max-w-[200px]">{d.label}</span>
              <span className="font-semibold tabular-nums flex-shrink-0">{Math.round(d.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** SVG donut chart for category breakdown */
function DonutChart({ data }: { data: CategoryStat[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Aucune donnée</div>
  );

  const R = 64; const CX = 75; const CY = 75;
  let cumPct = 0;
  const segments: { pct: number; color: string; label: string; count: number }[] = [];

  data.forEach((d, i) => {
    const pct = d.count / total;
    segments.push({ pct, color: CHART_COLORS[i % CHART_COLORS.length], label: d.category, count: d.count });
  });

  const polarToXY = (pct: number, r: number) => {
    const angle = pct * 2 * Math.PI - Math.PI / 2;
    return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
  };

  const paths = segments.map((seg, i) => {
    const start = cumPct;
    cumPct += seg.pct;
    const startPt = polarToXY(start, R);
    const endPt   = polarToXY(cumPct, R);
    const largeArc = seg.pct > 0.5 ? 1 : 0;
    const d = `M ${CX} ${CY} L ${startPt.x} ${startPt.y} A ${R} ${R} 0 ${largeArc} 1 ${endPt.x} ${endPt.y} Z`;
    return <path key={i} d={d} fill={seg.color} className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer" />;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
      <svg width="150" height="150" viewBox="0 0 150 150" className="flex-shrink-0">
        <circle cx={CX} cy={CY} r={R} fill="none" />
        {paths}
        {/* Center hole */}
        <circle cx={CX} cy={CY} r={40} fill="hsl(var(--card))" />
        <text x={CX} y={CY - 4} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold">{total}</text>
        <text x={CX} y={CY + 12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">opérations</text>
      </svg>
      <div className="space-y-1.5 w-full flex-1 min-w-0">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground truncate flex-1">{s.label}</span>
            <span className="font-semibold tabular-nums text-foreground">{s.count}</span>
            <span className="text-muted-foreground">({Math.round(s.pct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MonthlyPoint {
  monthIndex: number;
  shortLabel: string;
  fullLabel: string;
  value: number;
  count: number;
}

/** Vertical bar chart for monthly productions */
function MonthlyBarChart({ data, exercice }: { data: LabelValue[]; exercice: number }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const MONTH_LABELS = [
    { short: 'Janv.', full: 'Janvier' },
    { short: 'Févr.', full: 'Février' },
    { short: 'Mars',  full: 'Mars' },
    { short: 'Avr.',  full: 'Avril' },
    { short: 'Mai',   full: 'Mai' },
    { short: 'Juin',  full: 'Juin' },
    { short: 'Juil.', full: 'Juillet' },
    { short: 'Août',  full: 'Août' },
    { short: 'Sept.', full: 'Septembre' },
    { short: 'Oct.',  full: 'Octobre' },
    { short: 'Nov.',  full: 'Novembre' },
    { short: 'Déc.',  full: 'Décembre' },
  ];

  // Group exactly 12 months for the selected exercice (Jan to Dec)
  const monthlyPoints: MonthlyPoint[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const mNum = idx + 1;
      const mKey = `${exercice}-${String(mNum).padStart(2, '0')}`;
      const item = data.find((d: LabelValue) => {
        if (!d.label) return false;
        if (d.label === mKey || d.label === String(mNum) || d.label.endsWith(`-${String(mNum).padStart(2, '0')}`)) return true;
        const parsed = parseInt(d.label.split('-')[1] || d.label, 10);
        return parsed === mNum;
      });

      return {
        monthIndex: idx,
        shortLabel: MONTH_LABELS[idx].short,
        fullLabel: MONTH_LABELS[idx].full,
        value: item ? item.value : 0,
        count: item?.count ?? 0,
      };
    });
  }, [data, exercice]);

  const rawMax = Math.max(...monthlyPoints.map((p: MonthlyPoint) => p.value), 0);

  // Dynamic Y-axis scale interval
  const yMax = useMemo(() => {
    if (rawMax <= 0) return 50000;
    if (rawMax > 150000) return Math.ceil(rawMax / 50000) * 50000;
    if (rawMax > 80000) return Math.ceil(rawMax / 25000) * 25000;
    if (rawMax > 30000) return Math.ceil(rawMax / 10000) * 10000;
    if (rawMax > 10000) return Math.ceil(rawMax / 5000) * 5000;
    return Math.ceil(rawMax / 1000) * 1000;
  }, [rawMax]);

  const formatScaleTick = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k DH`;
    return `${Math.round(n)} DH`;
  };

  const yTicks = [yMax, yMax * 0.75, yMax * 0.50, yMax * 0.25, 0];

  const totalYear = monthlyPoints.reduce((sum: number, p: MonthlyPoint) => sum + p.value, 0);
  const totalOps = monthlyPoints.reduce((sum: number, p: MonthlyPoint) => sum + p.count, 0);

  return (
    <div className="space-y-4">
      {/* Chart Top Metrics Summary */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs pb-1 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-tr from-primary to-sky-400 inline-block shadow-xs" />
            <span>Volume TTC émis</span>
          </div>
          {totalOps > 0 && (
            <span className="text-muted-foreground/80 font-medium">• {totalOps} opération(s)</span>
          )}
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Total Exercice {exercice} : </span>
          <span className="font-bold text-foreground tabular-nums">{formatAmount(totalYear)}</span>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="relative min-h-[260px] h-64 sm:h-72 w-full flex flex-col justify-between pt-3">
        {/* Horizontal grid lines & Y-axis ticks */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pl-12 sm:pl-16">
          {yTicks.map((tick: number, i: number) => (
            <div key={i} className="w-full flex items-center gap-2">
              <span className="absolute left-0 text-[10px] sm:text-[11px] font-mono text-muted-foreground/70 tabular-nums text-right w-10 sm:w-14">
                {formatScaleTick(tick)}
              </span>
              <div className="w-full border-b border-dashed border-border/50" />
            </div>
          ))}
        </div>

        {/* 12 Month Bars Area */}
        <div className="relative flex-1 flex items-end gap-1.5 sm:gap-2.5 pl-12 sm:pl-16 pb-8 z-10">
          {monthlyPoints.map((point: MonthlyPoint, i: number) => {
            const pct = yMax > 0 ? (point.value / yMax) * 100 : 0;
            const isHovered = hoveredIndex === i;
            const hasData = point.value > 0;

            return (
              <div
                key={point.monthIndex}
                className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 z-30 px-3 py-2 rounded-xl bg-popover/95 border border-border shadow-xl backdrop-blur-md text-popover-foreground text-xs whitespace-nowrap pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150">
                    <p className="font-bold text-primary">{point.fullLabel} {exercice}</p>
                    <p className="font-mono font-semibold text-foreground mt-0.5">{formatAmount(point.value)}</p>
                    {point.count > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{point.count} opération(s) enregistrée(s)</p>
                    )}
                  </div>
                )}

                {/* Vertical Bar */}
                <div className="w-full flex-1 flex items-end justify-center">
                  <div
                    className={cn(
                      'w-full max-w-[28px] sm:max-w-[34px] rounded-t-md sm:rounded-t-lg transition-all duration-500 relative overflow-hidden',
                      hasData
                        ? 'bg-gradient-to-t from-primary/90 via-primary to-sky-400 shadow-sm group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:from-primary group-hover:to-cyan-300'
                        : 'bg-muted/20 border border-border/30'
                    )}
                    style={{
                      height: `${Math.max(pct, hasData ? 4 : 2)}%`,
                      minHeight: '4px',
                    }}
                  >
                    {/* Top highlight glow */}
                    {hasData && (
                      <div className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-t-md" />
                    )}
                  </div>
                </div>

                {/* X-axis Month Label */}
                <div className="absolute -bottom-7 inset-x-0 text-center">
                  <span
                    className={cn(
                      'text-[10px] sm:text-xs transition-colors font-medium',
                      isHovered ? 'text-primary font-bold' : hasData ? 'text-foreground' : 'text-muted-foreground/70'
                    )}
                  >
                    {point.shortLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [exercice, setExercice] = useState<number>(new Date().getFullYear());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get<DashboardStats>('/dashboard/stats', { params: { exercice } })
      .then(r => setStats(r.data))
      .catch(() => setError('Erreur lors du chargement des statistiques'))
      .finally(() => setLoading(false));
  }, [exercice]);

  const maxCompagne = stats ? Math.max(...stats.byCompagne.map(d => d.value), 1) : 1;

  const txRecouvrement = stats && stats.montantTotal > 0
    ? Math.round((stats.montantRegle / stats.montantTotal) * 100)
    : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-10 sm:pl-12">
            Vue d&apos;ensemble de l&apos;activité — Exercice {exercice}
          </p>
        </div>
        <div className="flex-shrink-0">
          <ExerciceSelector
            selectedExercice={exercice}
            onExerciceChange={setExercice}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Responsive KPI cards: 1 col on mobile -> 2 on sm -> 3 on md -> 5 on xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-5">
        <KpiCard loading={loading} label="Opérations" icon={FileText}
          value={loading ? '…' : String(stats?.totalProductions ?? 0)}
          sub={`exercice ${exercice}`}
          color="from-blue-500/20 to-blue-600/5" />
        <KpiCard loading={loading} label="Revenu Total" icon={TrendingUp}
          value={loading ? '…' : formatAmount(stats?.montantTotal ?? 0)}
          sub="primes TTC cumulées"
          color="from-green-500/20 to-green-600/5" />
        <KpiCard loading={loading} label="Réglé" icon={CreditCard}
          value={loading ? '…' : formatAmount(stats?.montantRegle ?? 0)}
          sub={`Taux: ${txRecouvrement}%`}
          color="from-emerald-500/20 to-emerald-600/5" />
        <KpiCard loading={loading} label="Restant" icon={AlertCircle}
          value={loading ? '…' : formatAmount(stats?.montantRestant ?? 0)}
          sub="à encaisser"
          color="from-amber-500/20 to-amber-600/5" />
        <KpiCard loading={loading} label="Clients" icon={Users}
          value={loading ? '…' : String(stats?.totalClients ?? 0)}
          sub="actifs"
          color="from-purple-500/20 to-purple-600/5" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

        {/* Monthly bar chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Productions par mois</h2>
              <p className="text-xs text-muted-foreground">Exercice {exercice} (janv. à déc.)</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Mois émis
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-72 w-full rounded-lg" />
          ) : (
            <MonthlyBarChart data={stats?.byMonth ?? []} exercice={exercice} />
          )}
        </div>

        {/* Status donut / breakdown */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Statuts règlements</h2>
            <p className="text-xs text-muted-foreground">État des paiements</p>
          </div>
          {loading ? (
            <Skeleton className="h-28 w-full rounded-lg" />
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Payé',        count: stats?.reglementsPaie ?? 0,       color: '#10b981', icon: CheckCircle2 },
                { label: 'Partiel',     count: stats?.reglementsPartiel ?? 0,    color: '#f59e0b', icon: AlertCircle },
                { label: 'En attente',  count: stats?.reglementsEnAttente ?? 0,  color: '#64748b', icon: Clock },
              ].map(item => {
                const Icon = item.icon;
                const total = (stats?.reglementsPaie ?? 0) + (stats?.reglementsPartiel ?? 0) + (stats?.reglementsEnAttente ?? 0);
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold text-foreground">{item.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category + Compagne charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">

        {/* Category donut */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Répartition par catégorie</h2>
            <p className="text-xs text-muted-foreground">Toutes les opérations</p>
          </div>
          {loading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : (
            <DonutChart data={stats?.byCategory ?? []} />
          )}
        </div>

        {/* Top compagnes */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Top compagnies</h2>
            <p className="text-xs text-muted-foreground">Nombre d&apos;opérations par CIE</p>
          </div>
          {loading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : (
            <BarChart
              data={stats?.byCompagne ?? []}
              maxVal={maxCompagne}
              colorFn={i => CHART_COLORS[i % CHART_COLORS.length]}
            />
          )}
        </div>
      </div>

      {/* Recent productions */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Dernières opérations</h2>
            <p className="text-xs text-muted-foreground">5 opérations les plus récentes</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => router.push('/operations')}>
            Voir tout <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="divide-y divide-border/50">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 sm:px-6 py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))
          ) : (stats?.recentProductions ?? []).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-sm text-muted-foreground gap-2">
              <FileText className="w-8 h-8 opacity-30" />
              Aucune opération enregistrée
            </div>
          ) : (
            (stats?.recentProductions ?? []).map(prod => {
              const sc = STATUS_CFG[(prod.reglementStatus ?? 'EN_ATTENTE') as keyof typeof STATUS_CFG] ?? STATUS_CFG.EN_ATTENTE;
              return (
                <div
                  key={prod.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs sm:text-sm text-primary font-semibold flex-shrink-0">
                      {prod.numpolice}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">{prod.client}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Building2 className="w-3 h-3" />{prod.compagne}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                    <Badge variant="secondary" className="text-[10px] font-normal">{prod.category}</Badge>
                    {prod.reglementStatus && (
                      <Badge variant={sc.cls as any} className="text-[10px]">{sc.label}</Badge>
                    )}
                    <div className="text-right">
                      <p className="text-xs sm:text-sm font-semibold text-green-400 tabular-nums">{formatAmount(prod.montant)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(prod.dateEff)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => router.push(`/regelements/${prod.id}`)}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
