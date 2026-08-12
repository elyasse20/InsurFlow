'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Loader2, AlertCircle, Shield } from 'lucide-react';
import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface ParamRow { name: string; percent: string; }
interface CatRow { name: string; indec: string; parameters: ParamRow[]; }

const emptyParam = (): ParamRow => ({ name: '', percent: '' });
const emptyCat = (): CatRow => ({ name: '', indec: '', parameters: [emptyParam()] });

export default function NewCompagnePage() {
  const router = useRouter();
  const [compagneName, setCompagneName] = useState('');
  const [categories, setCategories] = useState<CatRow[]>([emptyCat()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateCat = (ci: number, k: keyof CatRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCategories(prev => prev.map((c, i) => i === ci ? { ...c, [k]: e.target.value } : c));

  const updateParam = (ci: number, pi: number, k: keyof ParamRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCategories(prev => prev.map((cat, i) => {
      if (i !== ci) return cat;
      const params = cat.parameters.map((p, j) => j === pi ? { ...p, [k]: e.target.value } : p);
      return { ...cat, parameters: params };
    }));

  const addCat = () => setCategories(p => [...p, emptyCat()]);
  const removeCat = (ci: number) => setCategories(p => p.filter((_, i) => i !== ci));
  const addParam = (ci: number) => setCategories(prev => prev.map((c, i) =>
    i === ci ? { ...c, parameters: [...c.parameters, emptyParam()] } : c));
  const removeParam = (ci: number, pi: number) => setCategories(prev => prev.map((c, i) =>
    i === ci ? { ...c, parameters: c.parameters.filter((_, j) => j !== pi) } : c));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/compagnes', {
        compagneName,
        categories: categories.map(c => ({
          name: c.name, indec: c.indec,
          parameters: c.parameters.map(p => ({ name: p.name, percent: +p.percent })),
        })),
      });
      router.push('/compagnes');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8">
      {/* Header — Nouvelle compagnie */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Nouvelle compagnie</h1>
          </div>
          <p className="text-sm text-muted-foreground pl-10">Définir les catégories et paramètres de la compagnie</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-red-400 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Company name */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-3">
          <div className="space-y-1.5 sm:max-w-md">
            <Label htmlFor="compagneName">Nom de la compagnie <span className="text-destructive">*</span></Label>
            <Input
              id="compagneName"
              value={compagneName}
              onChange={e => setCompagneName(e.target.value)}
              required
              placeholder="Ex: AXA Assurance"
              className="bg-muted/30 border-border focus:border-primary"
            />
          </div>
        </div>

        {/* Categories */}
        {categories.map((cat, ci) => (
          <div key={ci} className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                  {ci + 1}
                </span>
                Catégorie {ci + 1}
              </h3>
              {categories.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeCat(ci)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor={`cat-name-${ci}`}>Nom catégorie <span className="text-destructive">*</span></Label>
                <Input id={`cat-name-${ci}`} value={cat.name} onChange={updateCat(ci, 'name')} required
                  placeholder="Ex: AUTO" className="bg-muted/30 border-border focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`cat-indec-${ci}`}>Indec <span className="text-destructive">*</span></Label>
                <Input id={`cat-indec-${ci}`} value={cat.indec} onChange={updateCat(ci, 'indec')} required
                  placeholder="Ex: A1" className="bg-muted/30 border-border focus:border-primary" />
              </div>
            </div>

            <Separator />

            {/* Parameters */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paramètres de tarification</p>
              {cat.parameters.map((param, pi) => (
                <div key={pi} className="flex gap-3 items-center">
                  <Input value={param.name} onChange={updateParam(ci, pi, 'name')} required
                    placeholder="Nom du paramètre"
                    className="flex-1 bg-muted/30 border-border focus:border-primary h-9" />
                  <div className="relative w-32">
                    <Input type="number" min="0" max="100" step="0.01"
                      value={param.percent} onChange={updateParam(ci, pi, 'percent')} required
                      placeholder="0.00"
                      className="bg-muted/30 border-border focus:border-primary h-9 pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  {cat.parameters.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeParam(ci, pi)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => addParam(ci)}>
                <Plus className="w-3.5 h-3.5" /> Ajouter un paramètre
              </Button>
            </div>
          </div>
        ))}

        {/* Add category button */}
        <button type="button" onClick={addCat}
          className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" /> Ajouter une catégorie
        </button>

        {/* Form actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Annuler</Button>
          <Button type="submit" disabled={saving} className="flex-1 shadow-lg shadow-primary/20">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Création...' : 'Créer la compagnie'}
          </Button>
        </div>
      </form>
    </div>
  );
}
