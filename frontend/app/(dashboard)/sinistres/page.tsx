'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  DollarSign,
  Scale,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  ChevronDown,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck2,
  X,
  Sparkles,
  ArrowUpDown,
  Check,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from '@/components/ui/dialog';
import ClaimsAnalyzerModal from '@/components/ai/ClaimsAnalyzerModal';
import api from '@/lib/api';
import { formatAmount, formatDate } from '@/lib/format';
import { Sinistre, SinistreStatus, SinistresStats } from '@/types';

export default function SinistresPage() {
  const [sinistres, setSinistres] = useState<Sinistre[]>([]);
  const [stats, setStats] = useState<SinistresStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  // Detail Modal
  const [selectedSinistre, setSelectedSinistre] = useState<Sinistre | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sinistreToDelete, setSinistreToDelete] = useState<Sinistre | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status Change loading
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [sinRes, statRes] = await Promise.all([
        api.get<Sinistre[]>('/sinistres'),
        api.get<SinistresStats>('/sinistres/stats'),
      ]);
      setSinistres(sinRes.data ?? []);
      setStats(statRes.data ?? null);
    } catch (err) {
      console.error('Failed to fetch sinistres:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle status update
  const handleStatusChange = async (sinistreId: string, newStatus: SinistreStatus) => {
    setUpdatingStatusId(sinistreId);
    try {
      const res = await api.patch<Sinistre>(`/sinistres/${sinistreId}/status?status=${newStatus}`);
      setSinistres((prev) =>
        prev.map((s) => (s.id === sinistreId ? res.data : s))
      );
      if (selectedSinistre?.id === sinistreId) {
        setSelectedSinistre(res.data);
      }
      // Refresh stats in background
      api.get<SinistresStats>('/sinistres/stats').then((r) => setStats(r.data));
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Handle delete
  const handleDeleteSinistre = async () => {
    if (!sinistreToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/sinistres/${sinistreToDelete.id}`);
      setSinistres((prev) => prev.filter((s) => s.id !== sinistreToDelete.id));
      setDeleteModalOpen(false);
      setSinistreToDelete(null);
      if (selectedSinistre?.id === sinistreToDelete.id) {
        setDetailModalOpen(false);
      }
      api.get<SinistresStats>('/sinistres/stats').then((r) => setStats(r.data));
    } catch (err) {
      console.error('Failed to delete sinistre:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredSinistres = useMemo(() => {
    return sinistres.filter((s) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchNumber = s.sinistreNumber?.toLowerCase().includes(q);
        const matchClient = s.clientName?.toLowerCase().includes(q);
        const matchPolicy = s.policyNumber?.toLowerCase().includes(q);
        const matchCompagne = s.compagne?.toLowerCase().includes(q);
        if (!matchNumber && !matchClient && !matchPolicy && !matchCompagne) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }

      // Risk
      if (riskFilter !== 'ALL' && s.fraudRiskLevel !== riskFilter) {
        return false;
      }

      return true;
    });
  }, [sinistres, search, statusFilter, riskFilter]);

  // Helper status badge
  const getStatusBadge = (status: SinistreStatus) => {
    switch (status) {
      case 'DECLARE':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[11px] font-semibold">
            <Clock className="w-3 h-3 mr-1" />
            DÉCLARÉ
          </Badge>
        );
      case 'EN_EXPERTISE':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
            <AlertTriangle className="w-3 h-3 mr-1" />
            EN EXPERTISE
          </Badge>
        );
      case 'INDEMNISE':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            INDEMNISÉ
          </Badge>
        );
      case 'CLOTURE':
        return (
          <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30 text-[11px] font-semibold">
            <Check className="w-3 h-3 mr-1" />
            CLÔTURÉ
          </Badge>
        );
      case 'REFUSE':
        return (
          <Badge className="bg-destructive/10 text-destructive border border-destructive/30 text-[11px] font-semibold">
            <X className="w-3 h-3 mr-1" />
            REFUSÉ
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Helper fraud badge
  const getFraudScoreBadge = (score: number, level: string) => {
    if (level === 'ÉLEVÉ' || score >= 65) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/30 font-mono text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
          {score}/100 • Élevé
        </span>
      );
    }
    if (level === 'MOYEN' || score >= 35) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {score}/100 • Moyen
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {score}/100 • Faible
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Gestion des Sinistres
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Instruction des dossiers, détection de fraude et arbitrage des responsabilités ACAPS / CISA.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>

          {/* Nouveau Sinistre via AI Analyzer */}
          <ClaimsAnalyzerModal
            triggerButtonText="Nouveau Sinistre IA"
            triggerButtonVariant="default"
            triggerButtonSize="sm"
            triggerButtonClassName="h-9 gap-2 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer"
            onSinistreSaved={(newSinistre) => {
              setSinistres((prev) => [newSinistre, ...prev]);
              fetchData(true);
            }}
          />
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Sinistres */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Sinistres
            </span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground tabular-nums">
            {stats?.total ?? sinistres.length}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Dossiers enregistrés
          </p>
        </div>

        {/* En cours d'expertise */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              En Expertise
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {stats?.enExpertise ?? sinistres.filter((s) => s.status === 'EN_EXPERTISE').length}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Instruction / Chiffrage
          </p>
        </div>

        {/* Montant Net Estimé */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Indemnités Nettes
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
            {stats ? formatAmount(stats.totalNetPayout) : '0 DH'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Après déduction franchises
          </p>
        </div>

        {/* Score Fraude Moyen */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Indice Risque Moyen
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground tabular-nums">
            {stats?.avgFraudScore ?? 0}
            <span className="text-xs font-normal text-muted-foreground"> / 100</span>
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Audit IA Loi 17-99 & ACAPS
          </p>
        </div>
      </div>

      {/* ── Search & Filter Bar ─────────────────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Rechercher sinistre, client, police..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-muted/20"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-muted/20 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="DECLARE">Déclaré</option>
              <option value="EN_EXPERTISE">En Expertise</option>
              <option value="INDEMNISE">Indemnisé</option>
              <option value="CLOTURE">Clôturé</option>
              <option value="REFUSE">Refusé</option>
            </select>
          </div>

          {/* Risk filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Risque :</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-muted/20 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">Tous les risques</option>
              <option value="FAIBLE">Risque Faible</option>
              <option value="MOYEN">Risque Modéré</option>
              <option value="ÉLEVÉ">Suspicion Élevée</option>
            </select>
          </div>

          {(search || statusFilter !== 'ALL' || riskFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setRiskFilter('ALL');
              }}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      {/* ── Table of Sinistres ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                <th className="py-3 px-3.5">Réf. Sinistre</th>
                <th className="py-3 px-3.5">Client / Assuré</th>
                <th className="py-3 px-3.5">N° Police & Compagnie</th>
                <th className="py-3 px-3.5">Date Survenance</th>
                <th className="py-3 px-3.5">Score Fraude IA</th>
                <th className="py-3 px-3.5">Responsabilité</th>
                <th className="py-3 px-3.5 text-right">Montant Net (MAD)</th>
                <th className="py-3 px-3.5 text-center">Statut</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Chargement des dossiers sinistres...
                  </td>
                </tr>
              ) : filteredSinistres.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="font-semibold text-foreground text-sm">Aucun sinistre trouvé</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {search || statusFilter !== 'ALL' || riskFilter !== 'ALL'
                        ? 'Modifiez ou réinitialisez les critères de recherche.'
                        : 'Utilisez le bouton "Nouveau Sinistre IA" pour instruire une déclaration.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSinistres.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-muted/20 transition-colors group cursor-default"
                  >
                    {/* Reference */}
                    <td className="py-3.5 px-3.5 font-bold font-mono text-primary whitespace-nowrap">
                      {s.sinistreNumber}
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-3.5">
                      <div className="font-semibold text-foreground truncate max-w-[180px]">
                        {s.clientName}
                      </div>
                      {s.category && (
                        <span className="text-[10px] text-muted-foreground">
                          {s.category}
                        </span>
                      )}
                    </td>

                    {/* Policy & Compagne */}
                    <td className="py-3.5 px-3.5">
                      <div className="font-mono text-[11px] text-foreground truncate max-w-[170px]">
                        {s.policyNumber}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                        {s.compagne || 'Compagnie non spécifiée'}
                      </div>
                    </td>

                    {/* Incident Date */}
                    <td className="py-3.5 px-3.5 text-muted-foreground whitespace-nowrap">
                      {formatDate(s.incidentDate)}
                    </td>

                    {/* Fraud Score */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      {getFraudScoreBadge(s.fraudRiskScore, s.fraudRiskLevel)}
                    </td>

                    {/* Liability */}
                    <td className="py-3.5 px-3.5 max-w-[160px]">
                      <div className="truncate text-foreground font-medium" title={s.liabilityAssessment}>
                        {s.liabilityRate !== undefined ? `${s.liabilityRate}% ` : ''}
                        {s.liabilityAssessment?.slice(0, 32)}...
                      </div>
                    </td>

                    {/* Net Payout */}
                    <td className="py-3.5 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums whitespace-nowrap">
                      {formatAmount(s.netPayout)}
                    </td>

                    {/* Status with Quick Dropdown */}
                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {getStatusBadge(s.status)}
                        <select
                          value={s.status}
                          onChange={(e) => handleStatusChange(s.id, e.target.value as SinistreStatus)}
                          disabled={updatingStatusId === s.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 h-5 text-[10px] rounded border border-border bg-card px-1 cursor-pointer"
                          title="Changer le statut"
                        >
                          <option value="DECLARE">Déclaré</option>
                          <option value="EN_EXPERTISE">En Expertise</option>
                          <option value="INDEMNISE">Indemnisé</option>
                          <option value="CLOTURE">Clôturé</option>
                          <option value="REFUSE">Refusé</option>
                        </select>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedSinistre(s);
                            setDetailModalOpen(true);
                          }}
                          title="Consulter le dossier d'expertise"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setSinistreToDelete(s);
                            setDeleteModalOpen(true);
                          }}
                          title="Supprimer le sinistre"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal ────────────────────────────────────────────────────── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-card border-border shadow-2xl">
          {selectedSinistre && (
            <div>
              {/* Header */}
              <div className="p-5 border-b border-border bg-gradient-to-r from-primary/10 via-indigo-500/5 to-transparent flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary text-base">
                      {selectedSinistre.sinistreNumber}
                    </span>
                    {getStatusBadge(selectedSinistre.status)}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-1">
                    {selectedSinistre.clientName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Police : <span className="font-mono text-foreground">{selectedSinistre.policyNumber}</span> • {selectedSinistre.compagne || 'Compagnie'}
                  </p>
                </div>

                <div className="text-right">
                  {getFraudScoreBadge(selectedSinistre.fraudRiskScore, selectedSinistre.fraudRiskLevel)}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Date sinistre : {formatDate(selectedSinistre.incidentDate)}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* 1. Décompte Financier */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Décompte Financier Net
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <p className="text-[10px] text-muted-foreground">Dommages Estimés</p>
                      <p className="text-xs font-bold text-foreground mt-0.5 tabular-nums">
                        {formatAmount(selectedSinistre.estimatedDamage)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <p className="text-[10px] text-muted-foreground">Franchise Déduite</p>
                      <p className="text-xs font-bold text-destructive mt-0.5 tabular-nums">
                        - {formatAmount(selectedSinistre.deductible)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Indemnité Nette</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                        {formatAmount(selectedSinistre.netPayout)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Responsabilité & Barème ACAPS */}
                <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
                  <span className="text-xs font-bold text-indigo-500 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> Qualification de la Responsabilité (Barème ACAPS / CISA)
                  </span>
                  <p className="text-xs text-foreground leading-relaxed p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 font-medium">
                    {selectedSinistre.liabilityAssessment}
                  </p>
                </div>

                {/* 3. Déclaration & Constat */}
                {selectedSinistre.claimText && (
                  <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" /> Récit des faits / Constat Amiable
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed p-3 rounded-xl bg-muted/20 border border-border/60 whitespace-pre-wrap">
                      {selectedSinistre.claimText}
                    </p>
                  </div>
                )}

                {/* 4. Alertes & Anomalies */}
                {selectedSinistre.riskFlags && selectedSinistre.riskFlags.length > 0 && (
                  <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" /> Anomalies Légales & Alertes Détectées
                    </span>
                    <div className="space-y-1.5">
                      {selectedSinistre.riskFlags.map((flag, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-foreground flex items-start gap-2">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Actions Recommandées */}
                {selectedSinistre.recommendedActions && selectedSinistre.recommendedActions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Plan d&apos;actions recommandé
                    </span>
                    <div className="space-y-1.5">
                      {selectedSinistre.recommendedActions.map((act, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Change Status in modal */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">Modifier l&apos;état du dossier</p>
                    <p className="text-[11px] text-muted-foreground">Mettre à jour le statut du cycle de gestion</p>
                  </div>
                  <select
                    value={selectedSinistre.status}
                    onChange={(e) => handleStatusChange(selectedSinistre.id, e.target.value as SinistreStatus)}
                    className="h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground font-semibold"
                  >
                    <option value="DECLARE">DÉCLARÉ</option>
                    <option value="EN_EXPERTISE">EN COURS D&apos;EXPERTISE</option>
                    <option value="INDEMNISE">INDEMNISÉ</option>
                    <option value="CLOTURE">CLÔTURÉ</option>
                    <option value="REFUSE">REFUSÉ</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Supprimer le sinistre ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mt-2">
            Êtes-vous sûr de vouloir supprimer définitivement le dossier sinistre{' '}
            <span className="font-bold text-foreground font-mono">
              {sinistreToDelete?.sinistreNumber}
            </span>{' '}
            pour le client <span className="font-semibold text-foreground">{sinistreToDelete?.clientName}</span> ?
          </p>
          <div className="flex items-center justify-end gap-2.5 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSinistre}
              disabled={deleting}
              className="text-xs gap-1.5"
            >
              {deleting ? 'Suppression...' : 'Confirmer la suppression'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
