'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, FileText, Users, Receipt, Building2,
  X, Loader2, ArrowRight, CornerDownLeft, Command,
  ShieldAlert, CreditCard
} from 'lucide-react';
import api from '@/lib/api';
import { Production, Client, Invoice } from '@/types';
import { formatAmount } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SearchResultItem {
  id: string;
  type: 'OPERATION' | 'CLIENT' | 'FACTURE';
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeVariant?: 'default' | 'secondary' | 'green' | 'amber' | 'blue' | 'destructive';
  extraInfo?: string;
  extraDetail?: string;
  href: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

function prodTotal(prod: Production): number {
  if (prod.montantTotal && prod.montantTotal > 0) return prod.montantTotal;
  return prod.parameters?.reduce(
    (s, p) => s + (p.primes || 0) + (p.taxe || 0) + (p.taxepara || 0) + (p.accessoire || 0) + (p.cnpc || 0),
    0
  ) ?? 0;
}

export default function OmniSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Cached data
  const [productions, setProductions] = useState<Production[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── Debounce query ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  // ── Fetch data once or on focus ─────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (dataLoaded) return;
    setLoading(true);
    try {
      const [prodRes, clientRes, invRes] = await Promise.allSettled([
        api.get<Production[]>('/productions'),
        api.get<Client[]>('/clients'),
        api.get<Invoice[]>('/invoices'),
      ]);

      if (prodRes.status === 'fulfilled') setProductions(prodRes.value.data || []);
      if (clientRes.status === 'fulfilled') setClients(clientRes.value.data || []);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.data || []);
      setDataLoaded(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [dataLoaded]);

  // ── Global Keyboard Shortcut (Ctrl+K / Cmd+K / Slash) ───────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        loadData();
        setIsOpen(true);
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        loadData();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [loadData]);

  // ── Click outside to close ──────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Multi-criteria Filtering & Grouping ─────────────────────────────────────
  const results = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return { operations: [], clients: [], factures: [], all: [] };

    const terms = q.split(/\s+/).filter(Boolean);
    const matchAllTerms = (target: string) => {
      const lower = target.toLowerCase();
      return terms.every(t => lower.includes(t));
    };

    // 1. Operations / Polices
    const matchedOps: SearchResultItem[] = productions
      .filter(p => {
        const fullString = `${p.numpolice || ''} ${p.client || ''} ${p.compagne || ''} ${p.category || ''} ${p.natureOperation || ''} ${p.dateEff || ''} ${p.moisDem || ''}`;
        return matchAllTerms(fullString);
      })
      .slice(0, 5)
      .map(p => ({
        id: `op-${p.id}`,
        type: 'OPERATION',
        title: p.numpolice || 'Sans n°',
        subtitle: p.client || 'Client anonyme',
        badgeText: p.category || 'ASSURANCE',
        badgeVariant: 'secondary',
        extraDetail: p.compagne,
        extraInfo: formatAmount(prodTotal(p)),
        href: `/operations?search=${encodeURIComponent(p.numpolice || '')}`,
        secondaryHref: `/regelements/${p.id}`,
        secondaryLabel: 'Règlement',
      }));

    // 2. Clients
    const matchedClients: SearchResultItem[] = clients
      .filter(c => {
        const fullString = `${c.nom || ''} ${c.prenom || ''} ${c.tel || ''} ${c.cin || ''} ${c.rc || ''} ${c.ice || ''} ${c.adresse || ''}`;
        return matchAllTerms(fullString);
      })
      .slice(0, 4)
      .map(c => ({
        id: `cli-${c.id}`,
        type: 'CLIENT',
        title: `${c.nom} ${c.prenom || ''}`.trim(),
        subtitle: c.tel || c.adresse || (c.cin ? `CIN: ${c.cin}` : 'Client'),
        badgeText: c.type === 'societe' ? 'Entreprise' : 'Particulier',
        badgeVariant: c.type === 'societe' ? 'blue' : 'secondary',
        extraDetail: c.rc ? `RC: ${c.rc}` : c.ice ? `ICE: ${c.ice}` : undefined,
        extraInfo: c.budget ? formatAmount(c.budget) : undefined,
        href: `/clients?search=${encodeURIComponent(c.nom || '')}`,
      }));

    // 3. Factures & Règlements
    const matchedInvoices: SearchResultItem[] = invoices
      .filter(inv => {
        const statusMap: Record<string, string> = {
          PAID: 'payé paye reglé',
          PARTIAL: 'partiel',
          UNPAID: 'impayé impaye attente',
        };
        const statusWords = statusMap[inv.status] || '';
        const fullString = `${inv.invoiceNumber || ''} ${inv.clientName || ''} ${inv.policyNumber || ''} ${inv.compagne || ''} ${inv.category || ''} ${inv.status || ''} ${statusWords}`;
        return matchAllTerms(fullString);
      })
      .slice(0, 4)
      .map(inv => {
        let variant: 'green' | 'amber' | 'destructive' = 'amber';
        let label = 'EN ATTENTE';
        if (inv.status === 'PAID') {
          variant = 'green';
          label = 'PAYÉ';
        } else if (inv.status === 'PARTIAL') {
          variant = 'amber';
          label = 'PARTIEL';
        } else {
          variant = 'destructive';
          label = 'IMPAYÉ';
        }

        return {
          id: `inv-${inv.id}`,
          type: 'FACTURE',
          title: inv.invoiceNumber || 'Facture',
          subtitle: `${inv.clientName}${inv.policyNumber ? ` • ${inv.policyNumber}` : ''}`,
          badgeText: label,
          badgeVariant: variant,
          extraDetail: inv.compagne,
          extraInfo: formatAmount(inv.amountTTC || 0),
          href: inv.operationId ? `/regelements/${inv.operationId}` : `/factures?search=${encodeURIComponent(inv.invoiceNumber || '')}`,
        };
      });

    const all = [...matchedOps, ...matchedClients, ...matchedInvoices];
    return {
      operations: matchedOps,
      clients: matchedClients,
      factures: matchedInvoices,
      all,
    };
  }, [debouncedQuery, productions, clients, invoices]);

  // Reset active index on results change
  useEffect(() => {
    setActiveIndex(results.all.length > 0 ? 0 : -1);
  }, [results]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  // ── Action triggers ─────────────────────────────────────────────────────────
  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.all.length > 0) {
        setActiveIndex(prev => (prev < results.all.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.all.length > 0) {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : results.all.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results.all[activeIndex]) {
        handleSelect(results.all[activeIndex]);
      } else if (query.trim()) {
        setIsOpen(false);
        router.push(`/operations?search=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  let currentIndexTracker = 0;

  return (
    <div ref={containerRef} className="relative w-full min-w-0 max-w-md">
      {/* ── Search Input Field ──────────────────────────────────────────────── */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none transition-colors" />

        <input
          ref={inputRef}
          type="search"
          value={query}
          onFocus={() => {
            loadData();
            setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher une police, client, compagnie, facture..."
          className={cn(
            'w-full h-9 pl-9 pr-14 rounded-xl text-xs bg-muted/40 border border-border transition-all duration-150',
            'placeholder:text-muted-foreground/70 text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-background',
            isOpen && query.trim() && 'ring-2 ring-primary/20 border-primary bg-background'
          )}
          aria-label="Recherche globale"
          aria-expanded={isOpen}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Right icons: Clear or Loading or Kbd shortcut */}
        <div className="absolute right-2 flex items-center gap-1">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Effacer"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70 bg-muted border border-border/80 rounded shadow-xs select-none pointer-events-none">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          )}
        </div>
      </div>

      {/* ── Dropdown Auto-complete Results ───────────────────────────────────── */}
      {isOpen && query.trim().length > 0 && (
        <div
          ref={listRef}
          className={cn(
            'absolute left-0 right-0 top-full mt-2 z-50',
            'w-full min-w-[320px] sm:min-w-[480px] max-w-[560px]',
            'bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 duration-150 origin-top'
          )}
        >
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
            {/* Loading state */}
            {loading && !dataLoaded ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground">Recherche dans la base de données…</p>
              </div>
            ) : results.all.length === 0 ? (
              /* Empty state */
              <div className="py-8 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <Search className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  Aucun résultat trouvé pour <span className="font-semibold text-primary">&quot;{query}&quot;</span>
                </p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Vérifiez l&apos;orthographe ou essayez un nom de client, numéro de police, compagnie ou facture.
                </p>
              </div>
            ) : (
              /* Grouped Results */
              <>
                {/* 1. Polices / Opérations */}
                {results.operations.length > 0 && (
                  <div className="py-2">
                    <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span>Polices & Opérations</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                        {results.operations.length}
                      </span>
                    </div>

                    <div className="space-y-0.5 px-1.5">
                      {results.operations.map((item) => {
                        const itemIdx = currentIndexTracker++;
                        const isSelected = activeIndex === itemIdx;
                        return (
                          <div
                            key={item.id}
                            data-index={itemIdx}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIndex(itemIdx)}
                            className={cn(
                              'group flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all duration-100',
                              isSelected
                                ? 'bg-primary/10 text-foreground font-medium shadow-xs'
                                : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                              )}>
                                <FileText className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-semibold text-foreground truncate">
                                    {item.title}
                                  </span>
                                  {item.badgeText && (
                                    <Badge variant={item.badgeVariant || 'secondary'} className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                      {item.badgeText}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {item.subtitle}
                                  {item.extraDetail && ` • ${item.extraDetail}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 text-right">
                              {item.extraInfo && (
                                <span className="font-semibold text-green-500 dark:text-green-400 text-xs tabular-nums">
                                  {item.extraInfo}
                                </span>
                              )}
                              <ArrowRight className={cn(
                                'w-3.5 h-3.5 transition-transform duration-150',
                                isSelected ? 'opacity-100 translate-x-0.5 text-primary' : 'opacity-0 -translate-x-1 group-hover:opacity-60'
                              )} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Clients */}
                {results.clients.length > 0 && (
                  <div className="py-2">
                    <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>Clients</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500">
                        {results.clients.length}
                      </span>
                    </div>

                    <div className="space-y-0.5 px-1.5">
                      {results.clients.map((item) => {
                        const itemIdx = currentIndexTracker++;
                        const isSelected = activeIndex === itemIdx;
                        return (
                          <div
                            key={item.id}
                            data-index={itemIdx}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIndex(itemIdx)}
                            className={cn(
                              'group flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all duration-100',
                              isSelected
                                ? 'bg-blue-500/10 text-foreground font-medium shadow-xs'
                                : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                                isSelected ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground group-hover:bg-blue-500/20 group-hover:text-blue-500'
                              )}>
                                <Users className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground truncate">
                                    {item.title}
                                  </span>
                                  {item.badgeText && (
                                    <Badge variant={item.badgeVariant || 'blue'} className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                      {item.badgeText}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {item.subtitle}
                                  {item.extraDetail && ` • ${item.extraDetail}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 text-right">
                              {item.extraInfo && (
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  {item.extraInfo}
                                </span>
                              )}
                              <ArrowRight className={cn(
                                'w-3.5 h-3.5 transition-transform duration-150',
                                isSelected ? 'opacity-100 translate-x-0.5 text-blue-500' : 'opacity-0 -translate-x-1 group-hover:opacity-60'
                              )} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Factures & Règlements */}
                {results.factures.length > 0 && (
                  <div className="py-2">
                    <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Factures & Règlements</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500">
                        {results.factures.length}
                      </span>
                    </div>

                    <div className="space-y-0.5 px-1.5">
                      {results.factures.map((item) => {
                        const itemIdx = currentIndexTracker++;
                        const isSelected = activeIndex === itemIdx;
                        return (
                          <div
                            key={item.id}
                            data-index={itemIdx}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIndex(itemIdx)}
                            className={cn(
                              'group flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all duration-100',
                              isSelected
                                ? 'bg-emerald-500/10 text-foreground font-medium shadow-xs'
                                : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                                isSelected ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground group-hover:bg-emerald-500/20 group-hover:text-emerald-500'
                              )}>
                                <Receipt className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-semibold text-foreground truncate">
                                    {item.title}
                                  </span>
                                  {item.badgeText && (
                                    <Badge variant={item.badgeVariant || 'default'} className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                      {item.badgeText}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {item.subtitle}
                                  {item.extraDetail && ` • ${item.extraDetail}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 text-right">
                              {item.extraInfo && (
                                <span className="font-semibold text-foreground text-xs tabular-nums">
                                  {item.extraInfo}
                                </span>
                              )}
                              <ArrowRight className={cn(
                                'w-3.5 h-3.5 transition-transform duration-150',
                                isSelected ? 'opacity-100 translate-x-0.5 text-emerald-500' : 'opacity-0 -translate-x-1 group-hover:opacity-60'
                              )} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Footer Bar with Navigation Hints ───────────────────────────────── */}
          <div className="px-3.5 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-background border border-border rounded shadow-2xs font-mono">↑</kbd>
                <kbd className="px-1 py-0.5 bg-background border border-border rounded shadow-2xs font-mono">↓</kbd>
                naviguer
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-background border border-border rounded shadow-2xs font-mono">↵</kbd>
                sélectionner
              </span>
              <span className="flex items-center gap-1 hidden sm:inline-flex">
                <kbd className="px-1.5 py-0.5 bg-background border border-border rounded shadow-2xs font-mono">Échap</kbd>
                fermer
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(`/operations?search=${encodeURIComponent(query.trim())}`);
              }}
              className="font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Voir tout</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
