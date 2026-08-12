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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function EmptyCompagnes({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl scale-150" />
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
          <Shield className="w-10 h-10 text-primary/60" />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary/30 animate-pulse" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">Aucune compagnie configurée</h3>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
        Configurez vos compagnies d'assurance avec leurs catégories et paramètres de tarification.
      </p>
      <Button onClick={onAdd} className="gap-2 shadow-lg shadow-primary/20" size="lg">
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

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8">
      {/* Header — Compagnies list */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Compagnies</h1>
          </div>
          <p className="text-sm text-muted-foreground pl-10">
            {loading ? 'Chargement...' : `${compagnes.length} compagnie(s) d'assurance`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing} className="h-9 w-9" title="Actualiser">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => router.push('/compagnes/new')} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Nouvelle compagnie
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
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
          {compagnes.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {/* Header row */}
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="flex items-center gap-3 text-left flex-1 min-w-0 hover:text-foreground transition-colors"
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
                    <span className="text-foreground font-semibold">{c.compagneName}</span>
                    <span className="text-muted-foreground text-sm ml-3">
                      {c.categories?.length ?? 0} catégorie(s)
                    </span>
                  </div>
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
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
                <div className="border-t border-border/60 px-5 py-5 bg-muted/20">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {c.categories?.map((cat, ci) => (
                      <div key={ci} className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                            <Tag className="w-3 h-3 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">Indec: {cat.indec}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.parameters?.map((p, pi) => (
                            <span key={pi} className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
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
    </div>
  );
}
