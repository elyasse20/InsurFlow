'use client';

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, Search, X, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { Reglement } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';

const STATUS_CONFIG = {
  PAYE:       { label: 'Payé',       variant: 'green' as const },
  PARTIEL:    { label: 'Partiel',    variant: 'amber' as const },
  EN_ATTENTE: { label: 'En attente', variant: 'secondary' as const },
};

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent border-border/50">
          {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full max-w-[100px]" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyReglements({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
          <DollarSign className="w-9 h-9 text-primary/60" />
        </div>
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
        {isFiltered ? 'Aucun résultat trouvé' : 'Aucun règlement enregistré'}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
        {isFiltered
          ? 'Aucun règlement ne correspond à ce client. Essayez un autre terme.'
          : 'Les règlements apparaîtront ici une fois que des paiements seront enregistrés sur les opérations.'}
      </p>
    </div>
  );
}

export default function CreditHistoryPage() {
  const [reglements, setReglements] = useState<Reglement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchData = useCallback(async (client?: string, silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get<Reglement[]>('/regelements', { params: client ? { client } : {} });
      setReglements(data);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(filter || undefined);
  };

  const clearFilter = () => { setFilter(''); fetchData(); };

  const isFiltered = filter.trim().length > 0;
  const totalPaye = reglements.reduce((s, r) => s + r.payments.reduce((sp, p) => sp + p.montant, 0), 0);
  const totalDu = reglements.reduce((s, r) => s + r.montantTotal, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Historique des crédits</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-10 sm:pl-12">
            {loading ? 'Chargement...' : `${reglements.length} règlement(s)`}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => fetchData(filter || undefined, true)} disabled={refreshing} className="h-9 w-9 flex-shrink-0" title="Actualiser">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats summary */}
      {!loading && reglements.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {[
            { label: 'Total TTC', value: totalDu, color: 'text-foreground' },
            { label: 'Total Payé', value: totalPaye, color: 'text-green-400' },
            { label: 'Restant Dû', value: Math.max(0, totalDu - totalPaye), color: 'text-amber-400' },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
              <p className={`text-xl sm:text-2xl font-bold ${card.color} tabular-nums`}>
                {card.value.toLocaleString('fr-MA')} <span className="text-xs font-normal text-muted-foreground">DH</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
          <Input
            type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filtrer par client..."
            className="pl-9 pr-9 bg-muted/30 border-border focus:border-primary h-9 w-full"
          />
          {filter && (
            <button type="button" onClick={clearFilter} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" variant="secondary" size="sm" className="px-3 sm:px-4 h-9 flex-shrink-0">Filtrer</Button>
      </form>

      {/* Table with horizontal scroll */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[650px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead>Client</TableHead>
                <TableHead>Police</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead className="text-right">Payé</TableHead>
                <TableHead className="text-right">Restant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableSkeleton /> : reglements.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <EmptyReglements isFiltered={isFiltered} />
                  </TableCell>
                </TableRow>
              ) : (
                reglements.map(r => {
                  const paid = r.payments.reduce((s, p) => s + p.montant, 0);
                  const remaining = Math.max(0, r.montantTotal - paid);
                  const status = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.EN_ATTENTE;
                  return (
                    <TableRow key={r.id} className="border-border/40">
                      <TableCell className="text-sm font-medium text-foreground truncate max-w-[150px]">{r.client}</TableCell>
                      <TableCell><span className="font-mono text-sm text-primary font-semibold whitespace-nowrap">{r.numpolice}</span></TableCell>
                      <TableCell><Badge variant="secondary" className="font-normal text-[11px] whitespace-nowrap">{r.category}</Badge></TableCell>
                      <TableCell className="text-right whitespace-nowrap"><span className="text-sm font-semibold text-foreground tabular-nums">{r.montantTotal.toLocaleString('fr-MA')} DH</span></TableCell>
                      <TableCell className="text-right whitespace-nowrap"><span className="text-sm font-semibold text-green-400 tabular-nums">{paid.toLocaleString('fr-MA')} DH</span></TableCell>
                      <TableCell className="text-right whitespace-nowrap"><span className="text-sm font-semibold text-amber-400 tabular-nums">{remaining.toLocaleString('fr-MA')} DH</span></TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
