'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { downloadInvoicePdf } from '@/lib/export';
import { Invoice } from '@/types';
import {
  Download, Plus, Search, RefreshCw, X, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Pagination from '@/components/Pagination';

export default function FacturesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal for Proforma creation
  const [showProformaModal, setShowProformaModal] = useState<boolean>(false);
  const [proformaData, setProformaData] = useState({
    clientName: '',
    policyNumber: '',
    compagne: 'Sanlam Maroc',
    category: 'AUTOMOBILE',
    amountTTC: 3500,
    tvaRate: 14,
    notes: '',
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get<Invoice[]>('/invoices');
      setInvoices(res.data || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('search');
      if (q) {
        setSearchTerm(q);
      }
    }
  }, []);

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.policyNumber && inv.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedType === 'ALL' || inv.type === selectedType;
    const matchesStatus = selectedStatus === 'ALL' || inv.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType, selectedStatus]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedInvoices = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Calculate Summary Metrics
  const totalFacture = invoices
    .filter((i) => i.type === 'STANDARD')
    .reduce((sum, i) => sum + i.amountTTC, 0);

  const totalRegle = invoices
    .filter((i) => i.type === 'STANDARD')
    .reduce((sum, i) => sum + i.paidAmount, 0);

  const totalRestant = invoices
    .filter((i) => i.type === 'STANDARD')
    .reduce((sum, i) => sum + i.remainingAmount, 0);

  const totalAvoirs = Math.abs(
    invoices
      .filter((i) => i.type === 'AVOIR')
      .reduce((sum, i) => sum + i.amountTTC, 0)
  );

  // Handle PDF download via Axios with JWT & blob responseType
  const handleDownloadPdf = async (id: string, invoiceNumber?: string) => {
    try {
      setDownloadingId(id);
      await downloadInvoicePdf(id, invoiceNumber);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      alert('Erreur lors du téléchargement de la facture PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle Credit Note (Avoir) creation
  const handleCreateAvoir = async (id: string) => {
    if (!confirm("Voulez-vous générer une Facture d'Avoir annulant cette facture ?")) return;
    try {
      await api.post(`/invoices/${id}/credit-note`);
      await fetchInvoices();
    } catch (err) {
      console.error('Failed to generate credit note:', err);
      alert("Erreur lors de la création de l'avoir");
    }
  };

  // Submit Proforma form
  const handleCreateProforma = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/invoices/proforma', proformaData);
      setShowProformaModal(false);
      await fetchInvoices();
    } catch (err) {
      console.error('Failed to create proforma:', err);
      alert('Erreur lors de la création du devis proforma');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 sm:w-7 sm:h-7 text-primary flex-shrink-0" />
            Facturation & Comptabilité
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gestion des factures, devis proforma, avoirs et génération de documents PDF officiels.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button onClick={fetchInvoices} variant="outline" size="sm" className="gap-2 h-9">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Actualiser
          </Button>
          <Button onClick={() => setShowProformaModal(true)} size="sm" className="gap-2 shadow-md shadow-primary/20 h-9">
            <Plus className="w-4 h-4" />
            Nouveau Devis Proforma
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chiffre d&apos;Affaires Facturé</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{totalFacture.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</p>
          <p className="text-[11px] text-muted-foreground">Primes émettant des factures standard</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm space-y-1.5">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Encaissements Réglés</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">{totalRegle.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</p>
          <p className="text-[11px] text-emerald-500/70">Paiements encaissés</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-sm space-y-1.5">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Reste à Recouvrer</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-400 tabular-nums">{totalRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</p>
          <p className="text-[11px] text-amber-500/70">Encaissements en attente</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 shadow-sm space-y-1.5">
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Factures d&apos;Avoir</p>
          <p className="text-xl sm:text-2xl font-bold text-purple-300 tabular-nums">{totalAvoirs.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</p>
          <p className="text-[11px] text-purple-400/70">Annulations & régularisations</p>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1 w-full min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher par N° Facture, Client ou N° Police..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-muted/30 w-full"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">Type:</span>
            {[
              { id: 'ALL', label: 'Tous' },
              { id: 'STANDARD', label: 'Factures' },
              { id: 'PROFORMA', label: 'Proforma' },
              { id: 'AVOIR', label: 'Avoirs' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex-shrink-0',
                  selectedType === t.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Statut:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-muted/30 text-xs font-medium text-foreground focus:outline-none w-full sm:w-auto"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PAID">Payé</option>
              <option value="PARTIAL">Partiel</option>
              <option value="UNPAID">Impayé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table with horizontal scroll */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3.5 px-4">N° Facture</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Police & Branche</th>
                <th className="py-3.5 px-4 text-right">Montant TTC</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-center">Actions PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Chargement des factures...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Aucune facture trouvée.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    {/* Invoice Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>

                    {/* Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                          inv.type === 'STANDARD' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                          inv.type === 'PROFORMA' && 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                          inv.type === 'AVOIR' && 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        )}
                      >
                        {inv.type}
                      </span>
                    </td>

                    {/* Client Name */}
                    <td className="py-3.5 px-4 font-semibold text-foreground truncate max-w-[150px]">
                      {inv.clientName}
                    </td>

                    {/* Policy & Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-mono text-xs text-foreground font-medium">{inv.policyNumber || '-'}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.category || 'Assurance'}</p>
                    </td>

                    {/* Amount TTC */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      {inv.amountTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                          inv.status === 'PAID' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          inv.status === 'PARTIAL' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          inv.status === 'UNPAID' && 'bg-red-500/10 text-red-400 border-red-500/20'
                        )}
                      >
                        {inv.status === 'PAID' ? 'PAYÉ' : inv.status === 'PARTIAL' ? 'PARTIEL' : 'IMPAYÉ'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          onClick={() => handleDownloadPdf(inv.id, inv.invoiceNumber)}
                          disabled={downloadingId === inv.id}
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                        >
                          <Download className={cn("w-3.5 h-3.5", downloadingId === inv.id && "animate-bounce")} />
                          {downloadingId === inv.id ? 'PDF...' : 'PDF'}
                        </Button>

                        {inv.type === 'STANDARD' && (
                          <Button
                            onClick={() => handleCreateAvoir(inv.id)}
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            title="Générer Facture d'Avoir"
                          >
                            Avoir
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filteredInvoices.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="factures"
        />
      )}

      {/* Proforma Modal */}
      {showProformaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Nouveau Devis Proforma
              </h3>
              <button
                onClick={() => setShowProformaModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProforma} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="clientName">Nom du Client / Prospect</Label>
                <Input
                  id="clientName"
                  value={proformaData.clientName}
                  onChange={(e) => setProformaData({ ...proformaData, clientName: e.target.value })}
                  placeholder="Ex: Société Atlas Transport"
                  required
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="policyNumber">Police / Proposition</Label>
                  <Input
                    id="policyNumber"
                    value={proformaData.policyNumber}
                    onChange={(e) => setProformaData({ ...proformaData, policyNumber: e.target.value })}
                    placeholder="POL-PRO-001"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">Branche / Catégorie</Label>
                  <select
                    id="category"
                    value={proformaData.category}
                    onChange={(e) => setProformaData({ ...proformaData, category: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-muted/30 text-xs font-medium text-foreground focus:outline-none"
                  >
                    <option value="AUTOMOBILE">AUTOMOBILE</option>
                    <option value="AT">AT</option>
                    <option value="RC">RC</option>
                    <option value="MULT">MULTIRISQUE</option>
                    <option value="MARITIME">MARITIME</option>
                    <option value="SANT INTER">SANTE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amountTTC">Montant Total TTC (DH)</Label>
                  <Input
                    id="amountTTC"
                    type="number"
                    value={proformaData.amountTTC}
                    onChange={(e) => setProformaData({ ...proformaData, amountTTC: parseFloat(e.target.value) || 0 })}
                    required
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tvaRate">Taux TVA (%)</Label>
                  <Input
                    id="tvaRate"
                    type="number"
                    value={proformaData.tvaRate}
                    onChange={(e) => setProformaData({ ...proformaData, tvaRate: parseFloat(e.target.value) || 14 })}
                    required
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes / Observations</Label>
                <Input
                  id="notes"
                  value={proformaData.notes}
                  onChange={(e) => setProformaData({ ...proformaData, notes: e.target.value })}
                  placeholder="Devis valable 30 jours..."
                  className="h-9"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setShowProformaModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="w-full sm:w-auto">Générer Proforma</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
