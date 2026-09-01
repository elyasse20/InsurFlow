'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import Pagination from '@/components/Pagination';

export interface ExtraField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  options?: string[];
}

interface SimpleItem { id: string; name: string; [key: string]: any; }

interface Props {
  title: string;
  itemLabel?: string;
  endpoint: string;
  icon?: React.ReactNode;
  extraFields?: ExtraField[];
  fixedPayload?: Record<string, any>;
  initialData?: SimpleItem[];
  onRefresh?: () => void;
}

/**
 * Modernized responsive reusable CRUD list for lookup items (Nature, Category, Parametre, TVA).
 */
export default function SimpleList({
  title,
  itemLabel,
  endpoint,
  icon,
  extraFields = [],
  fixedPayload = {},
  initialData,
  onRefresh,
}: Props) {
  const [items, setItems] = useState<SimpleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [newExtra, setNewExtra] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  // ── Pagination state ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<SimpleItem[]>(`/${endpoint}`);
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (initialData !== undefined) {
      setItems(initialData);
      setLoading(false);
    } else {
      fetchAll();
    }
  }, [initialData, endpoint]);

  const refreshData = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      fetchAll();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const extraPayload: Record<string, any> = {};
      extraFields.forEach(f => {
        if (f.type === 'select') {
          extraPayload[f.key] = newExtra[f.key] || f.options?.[0] || '';
        } else {
          extraPayload[f.key] = newExtra[f.key] ?? '';
        }
      });
      await api.post(`/${endpoint}`, { name: newName, ...extraPayload, ...fixedPayload });
      setNewName('');
      setNewExtra({});
      refreshData();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la création');
    }
  };

  const handleEdit = (item: SimpleItem) => {
    setEditingId(item.id);
    setSaveError('');
    const vals: Record<string, string> = { name: item.name };
    extraFields.forEach(f => {
      vals[f.key] = String(item[f.key] ?? (f.type === 'select' ? f.options?.[0] : ''));
    });
    setEditValues(vals);
  };

  const handleUpdate = async (id: string) => {
    setSaveError('');
    try {
      const payload: Record<string, any> = { name: editValues.name };
      extraFields.forEach(f => { payload[f.key] = editValues[f.key]; });
      await api.put(`/${endpoint}/${id}`, { ...payload, ...fixedPayload });
      setEditingId(null);
      refreshData();
    } catch (err: any) {
      setSaveError(err.response?.data?.message ?? 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/${endpoint}/${id}`);
    setItems(prev => prev.filter(i => i.id !== id));
    refreshData();
  };

  // ── Pagination calculations ───────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground pl-10">
          {loading ? 'Chargement...' : `${items.length} élément(s)`}
        </p>
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          Ajouter un élément
        </h2>

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-red-400 rounded-lg px-3 py-2.5 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="new-name" className="sr-only">Nom</Label>
            <Input
              id="new-name"
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={`Nom du ${itemLabel || title.toLowerCase()}...`}
              required
              className="bg-muted/30 border-border focus:border-primary w-full"
            />
          </div>
          {extraFields.map(f => (
            <div key={f.key} className="w-full sm:w-44 min-w-[140px]">
              <Label htmlFor={`new-${f.key}`} className="sr-only">{f.label}</Label>
              {f.type === 'select' ? (
                <select
                  id={`new-${f.key}`}
                  value={newExtra[f.key] ?? f.options?.[0] ?? ''}
                  onChange={e => setNewExtra(p => ({ ...p, [f.key]: e.target.value }))}
                  className="flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
                >
                  {f.options?.map(opt => (
                    <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={`new-${f.key}`}
                  type={f.type ?? 'text'}
                  value={newExtra[f.key] ?? ''}
                  onChange={e => setNewExtra(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.label}
                  className="bg-muted/30 border-border focus:border-primary w-full"
                />
              )}
            </div>
          ))}
          <Button type="submit" className="gap-2 shadow-sm shadow-primary/20 h-9 sm:w-auto w-full">
            <Plus className="w-4 h-4" />
            Ajouter
          </Button>
        </form>
      </div>

      {/* List table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {saveError && (
          <div className="flex items-center gap-2 bg-destructive/10 border-b border-destructive/30 text-red-400 px-4 sm:px-6 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {saveError}
          </div>
        )}
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead>Nom</TableHead>
                {extraFields.map(f => (
                  <TableHead key={f.key}>{f.label}</TableHead>
                ))}
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent border-border/50">
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      {extraFields.map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>)}
                      <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-8 w-8 rounded-lg" /></div></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={extraFields.length + 2}>
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-3">
                        <Plus className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm sm:text-base font-medium text-foreground mb-1">Aucun élément</p>
                      <p className="text-xs text-muted-foreground">Utilisez le formulaire ci-dessus pour ajouter votre premier élément.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map(item => (
                  <TableRow key={item.id} className="border-border/40 group">
                    <TableCell>
                      {editingId === item.id ? (
                        <Input
                          value={editValues.name}
                          onChange={e => setEditValues(p => ({ ...p, name: e.target.value }))}
                          className="bg-muted/40 border-border focus:border-primary h-8 text-sm max-w-[240px]"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                      )}
                    </TableCell>
                    {extraFields.map(f => (
                      <TableCell key={f.key}>
                        {editingId === item.id ? (
                          f.type === 'select' ? (
                            <select
                              value={editValues[f.key] ?? f.options?.[0] ?? ''}
                              onChange={e => setEditValues(p => ({ ...p, [f.key]: e.target.value }))}
                              className="flex h-8 w-full rounded-lg border border-input bg-muted/40 px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground min-w-[120px]"
                            >
                              {f.options?.map(opt => (
                                <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              type={f.type ?? 'text'}
                              value={editValues[f.key] ?? ''}
                              onChange={e => setEditValues(p => ({ ...p, [f.key]: e.target.value }))}
                              className="bg-muted/40 border-border focus:border-primary h-8 text-sm w-24"
                            />
                          )
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">
                            {item[f.key] !== undefined && item[f.key] !== null && item[f.key] !== '' ? String(item[f.key]) : '-'}
                          </span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {editingId === item.id ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400 hover:bg-green-500/10" onClick={() => handleUpdate(item.id)} title="Enregistrer">
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={() => setEditingId(null)} title="Annuler">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleEdit(item)} title="Modifier">
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
                                  <AlertDialogTitle>Supprimer cet élément ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <span className="font-semibold text-foreground">{item.name}</span> sera définitivement supprimé.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(item.id)}>Supprimer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && items.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={items.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel={itemLabel ? `${itemLabel}s` : 'éléments'}
        />
      )}
    </div>
  );
}
