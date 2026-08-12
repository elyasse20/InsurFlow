'use client';

import { useState, useRef } from 'react';
import { User, Building2, Upload, Loader2, AlertCircle, X, FileCheck } from 'lucide-react';
import api from '@/lib/api';
import { Client } from '@/types';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type ClientType = 'particulier' | 'societe';

interface ClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: Client) => void;
}

const initialForm = {
  nom: '', prenom: '', cin: '', tel: '', adresse: '',
  ice: '', identifiantFiscal: '', rc: '',
  budget: '0', credit: '0',
};

export function ClientSheet({ open, onOpenChange, onCreated }: ClientSheetProps) {
  const [type, setType] = useState<ClientType>('particulier');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const resetForm = () => {
    setForm(initialForm);
    setFile(null);
    setIsDragging(false);
    setError('');
    setType('particulier');
    setSaving(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const processFile = (selected: File) => {
    if (selected.size > 5 * 1024 * 1024) {
      setError("Le fichier ne doit pas dépasser 5 MB");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      setError("Format de fichier non autorisé. Formats acceptés : .pdf, .jpg, .jpeg, .png");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setError('');
    setFile(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }
    processFile(selected);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processFile(dropped);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Frontend validations
    if (type === 'societe') {
      const iceTrimmed = form.ice.trim();
      if (!/^\d{15}$/.test(iceTrimmed)) {
        setError("L'ICE doit comporter exactement 15 chiffres numériques (ex: 001234567890123)");
        return;
      }
    }

    if (Number(form.budget) < 0 || Number(form.credit) < 0) {
      setError("Le budget et le crédit ne peuvent pas être négatifs");
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, any> = {
        ...form,
        type,
        budget: Math.max(0, +form.budget),
        credit: Math.max(0, +form.credit),
      };
      const fd = new FormData();
      const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      fd.append('data', jsonBlob);
      if (file) fd.append('doc', file);

      const { data: created } = await api.post<Client>('/clients', fd);
      onCreated(created);
      handleOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la création du client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col p-0 overflow-y-auto"
      >
        {/* Sheet Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Nouveau client</SheetTitle>
              <SheetDescription>
                Remplissez les informations pour créer un nouveau client
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

            {/* Error alert */}
            {error && (
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Type selector */}
            <div className="space-y-2">
              <Label>Type de client</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['particulier', 'societe'] as ClientType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      'flex items-center gap-2.5 py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all duration-200 justify-center',
                      type === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80 hover:text-foreground'
                    )}
                  >
                    {t === 'particulier'
                      ? <User className="w-4 h-4" />
                      : <Building2 className="w-4 h-4" />
                    }
                    {t === 'particulier' ? 'Particulier' : 'Société'}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Particulier fields */}
            {type === 'particulier' && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Identité & Coordonnées
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Nom" id="nom" value={form.nom} onChange={set('nom')} required placeholder="Nom" />
                  <FieldRow label="Prénom" id="prenom" value={form.prenom} onChange={set('prenom')} required placeholder="Prénom" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Téléphone" id="tel" value={form.tel} onChange={set('tel')} required placeholder="+212 6XX XXX XXX" />
                  <FieldRow label="CIN" id="cin" value={form.cin} onChange={set('cin')} required placeholder="A123456" />
                </div>
                <FieldRow label="Adresse" id="adresse" value={form.adresse} onChange={set('adresse')} required placeholder="Adresse complète" />
              </div>
            )}

            {/* Société fields */}
            {type === 'societe' && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Raison Sociale & Informations Légales
                </p>
                <FieldRow label="Nom de la Société" id="nom" value={form.nom} onChange={set('nom')} required placeholder="Raison sociale / Nom société" />
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Téléphone" id="tel" value={form.tel} onChange={set('tel')} required placeholder="+212 5XX XXX XXX" />
                  <FieldRow label="RC (Registre commerce)" id="rc" value={form.rc} onChange={set('rc')} required placeholder="RC N°" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow
                    label="ICE (15 chiffres)"
                    id="ice"
                    value={form.ice}
                    onChange={set('ice')}
                    required
                    placeholder="000000000000000"
                    maxLength={15}
                    pattern="^\d{15}$"
                  />
                  <FieldRow label="Identifiant Fiscal (IF)" id="if" value={form.identifiantFiscal} onChange={set('identifiantFiscal')} required placeholder="IF N°" />
                </div>
                <FieldRow label="Adresse du siège" id="adresse" value={form.adresse} onChange={set('adresse')} required placeholder="Adresse du siège social" />
              </div>
            )}

            <Separator />

            {/* Financial */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Situation financière
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="Budget (DH)" id="budget" type="number" min="0" value={form.budget} onChange={set('budget')} placeholder="0" />
                <FieldRow label="Crédit (DH)" id="credit" type="number" min="0" value={form.credit} onChange={set('credit')} placeholder="0" />
              </div>
            </div>

            <Separator />

            {/* Document upload */}
            <div className="space-y-2">
              <Label>Document (CIN / Registre)</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 cursor-pointer transition-all duration-200 select-none',
                  isDragging
                    ? 'border-primary bg-primary/10 ring-4 ring-primary/10 scale-[1.01] shadow-lg'
                    : file
                    ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                  isDragging || file ? 'bg-primary/20' : 'bg-muted'
                )}>
                  {file ? (
                    <FileCheck className="w-4 h-4 text-primary" />
                  ) : (
                    <Upload className={cn('w-4 h-4', isDragging ? 'text-primary animate-bounce' : 'text-muted-foreground')} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {file ? (
                    <>
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • Cliquez pour changer</p>
                    </>
                  ) : isDragging ? (
                    <>
                      <p className="text-sm font-semibold text-primary">Déposez votre fichier ici</p>
                      <p className="text-xs text-primary/70">Relâchez la souris pour importer</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-muted-foreground">
                        Glissez-déposez ou <span className="text-primary font-semibold">parcourez</span>
                      </p>
                      <p className="text-xs text-muted-foreground/60">PDF, JPG, PNG • Max 5 MB</p>
                    </>
                  )}
                </div>

                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0 transition-colors"
                    title="Supprimer ou changer le fichier"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
              </div>
            </div>

          </div>

          {/* Footer — sticky */}
          <div className="px-6 py-4 border-t border-border bg-card/50 backdrop-blur-sm flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 shadow-lg shadow-primary/20"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Création...' : 'Créer le client'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* ── Sub-component ─────────────────────────────────────────────────────────── */
function FieldRow({
  label, id, value, onChange, required = false, type = 'text', placeholder, maxLength, pattern, min,
}: {
  label: string; id: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; type?: string; placeholder?: string;
  maxLength?: number; pattern?: string; min?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}{required && <span className="text-destructive ml-1">*</span>}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        pattern={pattern}
        min={min}
        className="bg-muted/30 border-border focus:border-primary"
      />
    </div>
  );
}
