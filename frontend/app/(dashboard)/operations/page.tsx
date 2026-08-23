'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Plus, Edit2, Trash2, CreditCard, RefreshCw,
  TrendingUp, Calendar, Building2, Hash, Filter, X,
  FileDown, FileSpreadsheet, Search, Receipt,
} from 'lucide-react';
import api from '@/lib/api';
import API_BASE_URL from '@/lib/config';
import { Production, Compagne, Category } from '@/types';
import { formatMoisDem, formatAmount } from '@/lib/format';
import { exportToCSV, exportToPDF, ExportColumn } from '@/lib/export';
import ExerciceSelector from '@/components/ExerciceSelector';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ── Export column definition ──────────────────────────────────────────────────
const EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'N° Police',      key: 'numpolice',    width: 28 },
  { header: 'Client',         key: 'client',       width: 45 },
  { header: 'Catégorie',      key: 'category',     width: 22 },
  { header: 'Compagne',       key: 'compagne',     width: 40 },
  { header: 'Nature',         key: 'natureOperation', width: 30 },
  { header: 'Date Effet',     key: 'dateEff',      width: 24 },
  { header: 'Mois Dem',       key: 'moisDemFmt',   width: 20 },
  { header: 'Total TTC (DH)', key: 'montantStr',   width: 28 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function prodTotal(prod: Production): number {
  return prod.parameters?.reduce(
    (s, p) => s + p.primes + p.taxe + p.taxepara + p.accessoire + p.cnpc, 0
  ) ?? 0;
}

function toExportRow(prod: Production): Record<string, unknown> {
  return {
    numpolice:       prod.numpolice,
    client:          prod.client,
    category:        prod.category,
    compagne:        prod.compagne,
    natureOperation: prod.natureOperation,
    dateEff:         prod.dateEff?.slice(0, 10) ?? '',
    moisDemFmt:      formatMoisDem(prod.moisDem),
    montantStr:      prodTotal(prod).toFixed(2),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent border-border/50">
          {Array.from({ length: 8 }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyOperations({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
          <FileText className="w-9 h-9 text-primary/60" />
        </div>
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Aucune opération enregistrée</h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
        Commencez par créer votre première opération (police d'assurance) pour gérer vos productions.
      </p>
      <Button onClick={onAdd} className="gap-2 shadow-lg shadow-primary/20" size="default">
        <Plus className="w-4 h-4" />
        Créer une opération
      </Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OperationsPage() {
  const router = useRouter();
  const [productions, setProductions] = useState<Production[]>([]);
  const [compagnes, setCompagnes] = useState<Compagne[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterExercice, setFilterExercice] = useState<number>(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCompagne, setFilterCompagne] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [prodRes, compRes, catRes] = await Promise.all([
        api.get<Production[]>('/productions'),
        api.get<Compagne[]>('/compagnes'),
        api.get<Category[]>('/categories'),
      ]);
      setProductions(prodRes.data);
      setCompagnes(compRes.data);
      setCategories(catRes.data);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    await api.delete(`/productions/${id}`);
    setProductions(prev => prev.filter(p => p.id !== id));
  };

  // ── Filtering (client-side) ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productions.filter(prod => {
      if (filterExercice > 0) {
        const prodYear = prod.moisDem?.slice(0, 4) || prod.dateEff?.slice(0, 4);
        if (prodYear && prodYear !== String(filterExercice)) return false;
      }
      if (q && !(
        prod.numpolice?.toLowerCase().includes(q) ||
        prod.client?.toLowerCase().includes(q) ||
        prod.natureOperation?.toLowerCase().includes(q)
      )) return false;
      if (filterCategory && prod.category !== filterCategory) return false;
      if (filterCompagne && prod.compagne !== filterCompagne) return false;
      if (filterMonth) {
        const mois = prod.moisDem ?? '';
        if (!mois.startsWith(filterMonth)) return false;
      }
      return true;
    });
  }, [productions, search, filterExercice, filterCategory, filterCompagne, filterMonth]);

  const hasFilters = search || filterCategory || filterCompagne || filterMonth;
  const clearFilters = () => {
    setSearch(''); setFilterCategory(''); setFilterCompagne(''); setFilterMonth('');
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalRevenuFiltered = filtered.reduce((s, p) => s + prodTotal(p), 0);

  // ── Export handlers ───────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const exTitle = filterExercice ? `operations_exercice_${filterExercice}` : 'operations_toutes';
    exportToCSV(filtered.map(toExportRow), EXPORT_COLUMNS, exTitle);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    const title = filterExercice ? `Liste des Opérations — Exercice ${filterExercice}` : 'Liste des Opérations';
    const exFilename = filterExercice ? `operations_exercice_${filterExercice}` : 'operations';
    try {
      await exportToPDF(filtered.map(toExportRow), EXPORT_COLUMNS, title, exFilename);
    } finally { setExporting(false); }
  };

  // ── Unique month options for filter dropdown ──────────────────────────────
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    productions.forEach(p => {
      if (p.moisDem) {
        const m = p.moisDem.slice(0, 7);
        if (m.length === 7) months.add(m);
      }
    });
    return Array.from(months).sort().reverse();
  }, [productions]);

  const selectCls = "flex h-9 rounded-lg border border-input bg-muted/30 px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground w-full";

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Opérations</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-10 sm:pl-12">
            {loading ? 'Chargement…' : (
              <>
                <span className="font-medium text-foreground">{filtered.length}</span>
                {hasFilters && ` / ${productions.length}`} opération(s)
                {' • '}Total : <span className="font-semibold text-green-400">{formatAmount(totalRevenuFiltered)}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
          <ExerciceSelector
            selectedExercice={filterExercice}
            onExerciceChange={setFilterExercice}
          />
          <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing} className="h-9 w-9 flex-shrink-0" title="Actualiser">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9"
            onClick={() => setShowFilters(v => !v)}
            aria-pressed={showFilters}>
            <Filter className="w-3.5 h-3.5" />
            Filtres
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleExportCSV} title="Exporter en Excel (CSV)">
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleExportPDF} disabled={exporting} title="Exporter en PDF">
            <FileDown className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">{exporting ? 'PDF…' : 'PDF'}</span>
          </Button>
          <Button onClick={() => router.push('/operations/new')} className="gap-2 shadow-lg shadow-primary/20 h-9">
            <Plus className="w-4 h-4" />
            Nouvelle opération
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtres actifs</p>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={clearFilters}>
                <X className="w-3 h-3" /> Réinitialiser
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Text search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Client, police, nature…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-muted/30 border-border focus:border-primary pl-8 h-9"
              />
            </div>
            {/* Category */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className={selectCls}
            >
              <option value="">Toutes les catégories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name} className="bg-card">{c.name}</option>
              ))}
            </select>
            {/* Compagne */}
            <select
              value={filterCompagne}
              onChange={e => setFilterCompagne(e.target.value)}
              className={selectCls}
            >
              <option value="">Toutes les compagnies</option>
              {compagnes.map(c => (
                <option key={c.id} value={c.compagneName} className="bg-card">{c.compagneName}</option>
              ))}
            </select>
            {/* Month */}
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className={selectCls}
            >
              <option value="">Tous les mois</option>
              {monthOptions.map(m => (
                <option key={m} value={m} className="bg-card">{formatMoisDem(m + '-01')}</option>
              ))}
            </select>
          </div>
          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 pt-1">
              {search && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">
                  <Search className="w-3 h-3" />{search}
                  <button onClick={() => setSearch('')} className="ml-0.5 hover:text-primary/70"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filterCategory && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">
                  {filterCategory}
                  <button onClick={() => setFilterCategory('')} className="ml-0.5 hover:text-primary/70"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filterCompagne && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">
                  <Building2 className="w-3 h-3" />{filterCompagne}
                  <button onClick={() => setFilterCompagne('')} className="ml-0.5 hover:text-primary/70"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filterMonth && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">
                  <Calendar className="w-3 h-3" />{formatMoisDem(filterMonth + '-01')}
                  <button onClick={() => setFilterMonth('')} className="ml-0.5 hover:text-primary/70"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table with horizontal scroll */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead><div className="flex items-center gap-1.5"><Hash className="w-3 h-3" />Police</div></TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Compagne</TableHead>
                <TableHead><div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />Date Effet</div></TableHead>
                <TableHead>Mois Dem</TableHead>
                <TableHead className="text-right"><div className="flex items-center justify-end gap-1.5"><TrendingUp className="w-3 h-3" />Total TTC</div></TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableSkeleton /> : filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="p-0">
                    {hasFilters ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Filter className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-sm font-medium text-foreground">Aucun résultat pour ces filtres</p>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5">
                          <X className="w-3.5 h-3.5" /> Réinitialiser les filtres
                        </Button>
                      </div>
                    ) : (
                      <EmptyOperations onAdd={() => router.push('/operations/new')} />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(prod => (
                  <TableRow key={prod.id} className="border-border/40 group">
                    <TableCell>
                      <span className="font-mono text-sm text-primary font-semibold">{prod.numpolice}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground truncate max-w-[160px] block">{prod.client}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal text-[11px]">{prod.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Building2 className="w-3 h-3" />{prod.compagne}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{prod.dateEff?.slice(0, 10)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatMoisDem(prod.moisDem)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-400 tabular-nums">
                        {prodTotal(prod).toLocaleString('fr-MA')} DH
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10"
                          onClick={async () => {
                            try {
                              const res = await api.post(`/invoices/generate/${prod.id}`);
                              window.open(`${API_BASE_URL}/invoices/${res.data.id}/pdf`, '_blank');
                            } catch {
                              alert("Erreur lors de la génération de la facture PDF");
                            }
                          }}
                          title="Voir / Télécharger Facture PDF"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
                          onClick={() => router.push(`/regelements/${prod.id}`)} title="Règlement">
                          <CreditCard className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => router.push(`/operations/${prod.id}/edit`)} title="Modifier">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Supprimer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette opération ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Police <span className="font-semibold text-foreground font-mono">{prod.numpolice}</span> — {prod.client}. Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(prod.id)}>Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Stats footer */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2 px-1">
          <span>
            {filtered.length} opération(s)
            {hasFilters && <span className="text-muted-foreground/60"> (filtrée{filtered.length > 1 ? 's' : ''} sur {productions.length})</span>}
          </span>
          <span>
            Revenu total affiché : <span className="font-semibold text-green-400">{formatAmount(totalRevenuFiltered)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
