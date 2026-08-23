'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Plus, Check, Clock, AlertCircle, Loader2, CreditCard, ArrowLeft,
  Building2, Receipt,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Reglement, Production, PaymentMode } from '@/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';

const STATUS_CONFIG = {
  PAYE:       { label: 'Payé',       variant: 'green'  as const, icon: Check },
  PARTIEL:    { label: 'Partiel',    variant: 'amber'  as const, icon: AlertCircle },
  EN_ATTENTE: { label: 'En attente', variant: 'secondary' as const, icon: Clock },
};

const PAYMENT_MODES: PaymentMode[] = ['CHEQUE', 'ESPECE', 'VIREMENT', 'AUTRE'];

type PaymentTarget = 'client' | 'cie';

interface PaymentFormState {
  mode: PaymentMode;
  montant: string;
  banque: string;
  numero: string;
  commentaire: string;
}

const emptyPaymentForm = (): PaymentFormState => ({
  mode: 'ESPECE', montant: '', banque: '', numero: '', commentaire: '',
});

export default function RegelementPage() {
  const router = useRouter();
  const { id: productionId } = useParams<{ id: string }>();
  const [production, setProduction] = useState<Production | null>(null);
  const [reglement, setReglement] = useState<Reglement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget>('client');
  const [numFacture, setNumFacture] = useState('');
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(emptyPaymentForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const [prodRes] = await Promise.allSettled([api.get<Production>(`/productions/${productionId}`)]);
      if (prodRes.status === 'fulfilled') setProduction(prodRes.value.data);
      try {
        const { data } = await api.get<Reglement>(`/regelements/${productionId}`);
        setReglement(data);
        if (data.numFacture) setNumFacture(data.numFacture);
      } catch { /* No reglement yet */ }
      setLoading(false);
    };
    load();
  }, [productionId]);

  const totalPaidClient = reglement?.payments.reduce((s, p) => s + p.montant, 0) ?? 0;
  const totalPaidCie = reglement?.paymentscie?.reduce((s, p) => s + p.montant, 0) ?? 0;
  const totalDue = reglement?.montantTotal ?? production?.parameters?.reduce(
    (s, p) => s + p.primes + p.taxe + p.taxepara + p.accessoire + p.cnpc, 0
  ) ?? 0;
  const remaining = Math.max(0, totalDue - totalPaidClient);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const paymentEntry = {
        mode: paymentForm.mode,
        montant: parseFloat(paymentForm.montant),
        banque: paymentForm.banque || undefined,
        numero: paymentForm.numero || undefined,
        commentaire: paymentForm.commentaire || undefined,
      };

      const req = {
        client: production?.client,
        natureOperation: production?.natureOperation,
        dateEff: production?.dateEff,
        moisDem: production?.moisDem,
        compagne: production?.compagne,
        category: production?.category,
        numpolice: production?.numpolice,
        montantTotal: totalDue,
        numFacture: numFacture || undefined,
        payments: paymentTarget === 'client' ? [paymentEntry] : [],
        paymentscie: paymentTarget === 'cie' ? [paymentEntry] : [],
      };

      const formData = new FormData();
      formData.append('data', JSON.stringify(req));
      const { data } = await api.post<Reglement>(
        `/regelements/${productionId}/paiement`, formData
      );
      setReglement(data);
      setShowForm(false);
      setPaymentForm(emptyPaymentForm());
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de l\'enregistrement');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full space-y-6 sm:space-y-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-60" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const status = reglement?.status ?? 'EN_ATTENTE';
  const statusCfg = STATUS_CONFIG[status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 mt-0.5" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Règlement</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground pl-10">
              Police <span className="font-mono text-primary font-semibold">{production?.numpolice}</span>
              {' — '}{production?.client}
            </p>
          </div>
        </div>
        <div className="pl-12 sm:pl-0">
          <Badge variant={statusCfg.variant} className="text-xs sm:text-sm px-3 py-1.5 gap-1.5">
            <StatusIcon className="w-3.5 h-3.5" />
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      {/* N° Facture row */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary flex-shrink-0" />
          <Label htmlFor="numFacture" className="text-sm font-medium whitespace-nowrap">N° Facture :</Label>
        </div>
        <Input
          id="numFacture"
          value={numFacture}
          onChange={e => setNumFacture(e.target.value)}
          placeholder="Ex: 662/2025"
          className="bg-muted/30 border-border focus:border-primary max-w-full sm:max-w-xs h-9"
        />
        <p className="text-xs text-muted-foreground">Sera sauvegardé lors du prochain paiement.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {[
          { label: 'Total TTC', value: totalDue, color: 'text-foreground' },
          { label: 'Payé (Client)', value: totalPaidClient, color: 'text-green-400' },
          { label: 'Restant', value: remaining, color: remaining > 0 ? 'text-amber-400' : 'text-green-400' },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
            <p className={`text-xl sm:text-2xl font-bold ${card.color} tabular-nums`}>
              {card.value.toLocaleString('fr-MA')}
              <span className="text-xs font-normal text-muted-foreground ml-1">DH</span>
            </p>
          </div>
        ))}
      </div>

      {/* CIE summary card */}
      {totalPaidCie > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <Building2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Réglé à la CIE</p>
            <p className="text-lg sm:text-xl font-bold text-blue-400 tabular-nums">
              {totalPaidCie.toLocaleString('fr-MA')}
              <span className="text-xs font-normal text-muted-foreground ml-1">DH</span>
            </p>
          </div>
        </div>
      )}

      {/* Client Payments */}
      <PaymentsSection
        title="Règlement Client"
        subtitle="Paiements reçus du client"
        icon={<CreditCard className="w-4 h-4 text-primary" />}
        payments={reglement?.payments ?? []}
        accentColor="text-green-400"
        onAddPayment={() => { setPaymentTarget('client'); setShowForm(true); }}
        showForm={showForm && paymentTarget === 'client'}
        onCancelForm={() => { setShowForm(false); setPaymentForm(emptyPaymentForm()); }}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        onSubmit={handleAddPayment}
        saving={saving}
        error={error}
      />

      {/* CIE Payments */}
      <PaymentsSection
        title="Règlement CIE"
        subtitle="Paiements versés à la compagnie"
        icon={<Building2 className="w-4 h-4 text-blue-400" />}
        payments={reglement?.paymentscie ?? []}
        accentColor="text-blue-400"
        onAddPayment={() => { setPaymentTarget('cie'); setShowForm(true); }}
        showForm={showForm && paymentTarget === 'cie'}
        onCancelForm={() => { setShowForm(false); setPaymentForm(emptyPaymentForm()); }}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        onSubmit={handleAddPayment}
        saving={saving}
        error={error}
      />
    </div>
  );
}

/* ── Reusable Payments Section ──────────────────────────────────────────────── */
function PaymentsSection({
  title, subtitle, icon, payments, accentColor,
  onAddPayment, showForm, onCancelForm,
  paymentForm, setPaymentForm, onSubmit, saving, error,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  payments: { mode: string; montant: number; dateEcheance?: string; dateVirement?: string; banque?: string; commentaire?: string }[];
  accentColor: string;
  onAddPayment: () => void;
  showForm: boolean;
  onCancelForm: () => void;
  paymentForm: PaymentFormState;
  setPaymentForm: React.Dispatch<React.SetStateAction<PaymentFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  error: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Button
          onClick={showForm ? onCancelForm : onAddPayment}
          variant={showForm ? 'secondary' : 'default'}
          className="gap-1.5 h-8 text-xs"
          size="sm"
        >
          <Plus className={cn('w-3.5 h-3.5 transition-transform', showForm && 'rotate-45')} />
          {showForm ? 'Annuler' : 'Ajouter paiement'}
        </Button>
      </div>

      {/* Add payment form */}
      {showForm && (
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border bg-muted/20">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-red-400 rounded-lg px-3 py-2.5 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mode-select">Mode de paiement</Label>
                <select
                  id="mode-select"
                  value={paymentForm.mode}
                  onChange={e => setPaymentForm(p => ({ ...p, mode: e.target.value as PaymentMode }))}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground bg-muted/30"
                >
                  {PAYMENT_MODES.map(m => <option key={m} value={m} className="bg-card">{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="montant-input">Montant (DH)</Label>
                <Input
                  id="montant-input"
                  type="number" min="0.01" step="0.01"
                  value={paymentForm.montant}
                  onChange={e => setPaymentForm(p => ({ ...p, montant: e.target.value }))}
                  required
                  placeholder="0.00"
                  className="bg-muted/30 border-border focus:border-primary h-9"
                />
              </div>
            </div>
            {(paymentForm.mode === 'CHEQUE') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="banque-input">Banque</Label>
                  <Input id="banque-input" value={paymentForm.banque} onChange={e => setPaymentForm(p => ({ ...p, banque: e.target.value }))}
                    placeholder="Nom de la banque" className="bg-muted/30 border-border focus:border-primary h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numero-input">N° Chèque</Label>
                  <Input id="numero-input" value={paymentForm.numero} onChange={e => setPaymentForm(p => ({ ...p, numero: e.target.value }))}
                    placeholder="Numéro du chèque" className="bg-muted/30 border-border focus:border-primary h-9" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="commentaire-input">Commentaire</Label>
              <Input id="commentaire-input" value={paymentForm.commentaire} onChange={e => setPaymentForm(p => ({ ...p, commentaire: e.target.value }))}
                placeholder="Commentaire (optionnel)" className="bg-muted/30 border-border focus:border-primary h-9" />
            </div>
            <Button type="submit" disabled={saving} className="gap-2 shadow-sm shadow-primary/20 h-9 w-full sm:w-auto">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </Button>
          </form>
        </div>
      )}

      {/* Payments table */}
      <div className="overflow-x-auto w-full">
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/60">
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Banque</TableHead>
              <TableHead>Commentaire</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!payments?.length ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-2.5">
                      <CreditCard className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-0.5">Aucun paiement enregistré</p>
                    <p className="text-xs text-muted-foreground">Cliquez sur "Ajouter paiement" pour enregistrer un versement.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p, i) => (
                <TableRow key={i} className="border-border/40">
                  <TableCell>
                    <Badge variant="blue" className="text-[10px]">{p.mode}</Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <span className={`text-sm font-semibold ${accentColor} tabular-nums`}>
                      {p.montant.toLocaleString('fr-MA')} DH
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{p.dateEcheance ?? p.dateVirement ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.banque ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{p.commentaire ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Section total */}
      {payments?.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-t border-border/60 flex justify-end">
          <span className="text-xs text-muted-foreground">
            Total : <span className={`font-semibold ${accentColor}`}>
              {payments.reduce((s, p) => s + p.montant, 0).toLocaleString('fr-MA')} DH
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
