'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Plus, Edit2, Trash2, ChevronDown, ChevronRight,
  RefreshCw, Tag, Percent,
} from 'lucide-react';
import api from '@/lib/api';
import { Compagne } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Pagination from '@/components/Pagination';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function EmptyCompagnes({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
          <Shield className="w-9 h-9 text-primary/60" />
        </div>
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Aucune compagnie configurée</h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
        Configurez vos compagnies d&apos;assurance avec leurs catégories et paramètres de tarification.
      </p>
      <Button onClick={onAdd} className="gap-2 shadow-lg shadow-primary/20" size="default">
        <Plus className="w-4 h-4" />
        Ajouter une compagnie
      </Button>
    </div>
  );
}

export default function CompagnesPage() {
  const router = useRouter();
  const [compagnes, setCompagnes] = useState<Compagne[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // ── Pagination state ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get<Compagne[]>('/compagnes');
      setCompagnes(data);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    await api.delete(`/compagnes/${id}`);
    setCompagnes(prev => prev.filter(c => c.id !== id));
  };

  // ── Pagination calculations ───────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(compagnes.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedCompagnes = compagnes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 sm:space-y-8">
      {/* Header — Compagnies list */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Compagnies</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-10 sm:pl-12">
            {loading ? 'Chargement...' : `${compagnes.length} compagnie(s) d'assurance`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing} className="h-9 w-9 flex-shrink-0" title="Actualiser">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => router.push('/compagnes/new')} className="gap-2 shadow-lg shadow-primary/20 h-9">
            <Plus className="w-4 h-4" />
            Nouvelle compagnie
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : compagnes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyCompagnes onAdd={() => router.push('/compagnes/new')} />
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedCompagnes.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {/* Header row */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4">
                <button
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="flex items-center gap-2.5 sm:gap-3 text-left flex-1 min-w-0 hover:text-foreground transition-colors"
                >
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0',
                    expanded === c.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {expanded === c.id
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-foreground font-semibold text-sm sm:text-base truncate block">{c.compagneName}</span>
                    <span className="text-muted-foreground text-xs">
                      {c.categories?.length ?? 0} catégorie(s)
                    </span>
                  </div>
                </button>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => router.push(`/compagnes/${c.id}/edit`)} title="Modifier">
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
                        <AlertDialogTitle>Supprimer cette compagnie ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <span className="font-semibold text-foreground">{c.compagneName}</span> et toutes ses catégories seront supprimées définitivement.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(c.id)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Expanded categories */}
              {expanded === c.id && (
                <div className="border-t border-border/60 px-4 sm:px-5 py-4 sm:py-5 bg-muted/20">
                  <div className="grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2">
                    {c.categories?.map((cat, ci) => (
                      <div key={ci} className="rounded-lg border border-border/60 bg-card p-3.5 sm:p-4 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Tag className="w-3 h-3 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">Indec: {cat.indec}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.parameters?.map((p, pi) => (
                            <span key={pi} className="inline-flex items-center gap-1 text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                              {p.name}
                              <span className="text-primary font-semibold flex items-center gap-0.5">
                                <Percent className="w-2.5 h-2.5" />{p.percent}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && compagnes.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={compagnes.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="compagnies"
        />
      )}
    </div>
  );
}
