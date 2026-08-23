'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, Shield, User, RefreshCw, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { UserResponse, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserFormData {
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  enabled: boolean;
}

const emptyForm: UserFormData = {
  username: '',
  email: '',
  password: '',
  role: 'OPERATOR',
  enabled: true,
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get<UserResponse[]>('/users');
      setUsers(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setError('');
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEditModal = (u: UserResponse) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      email: u.email,
      password: '',
      role: u.role,
      enabled: u.enabled ?? true,
    });
    setError('');
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingUser) {
        const payload: Partial<UserFormData> = {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          enabled: formData.enabled,
        };
        if (formData.password?.trim()) payload.password = formData.password;
        await api.put(`/users/${editingUser.id}`, payload);
      } else {
        await api.post('/users', formData);
      }
      setModalOpen(false);
      fetchUsers(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/users/${id}`);
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Utilisateurs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-10">
            {loading ? 'Chargement...' : `${users.length} utilisateur(s) enregistré(s)`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="h-9 w-9 flex-shrink-0"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={openCreateModal} className="gap-2 shadow-lg shadow-primary/20 h-9">
            <Plus className="w-4 h-4" />
            Nouvel utilisateur
          </Button>
        </div>
      </div>

      {/* Users Table with horizontal scroll */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent border-border/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-16 text-center text-muted-foreground text-sm">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                users.map(u => {
                  const isSelf = u.username === currentUser?.username;
                  const initials = u.username.slice(0, 2).toUpperCase();
                  return (
                    <TableRow key={u.id} className="border-border/40 group">
                      {/* Avatar + Username */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-foreground truncate block">
                              {u.username}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] text-primary font-medium">(Vous)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="text-sm text-muted-foreground">
                        {u.email}
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell>
                        <Badge
                          variant={u.role === 'ADMIN' ? 'violet' : 'blue'}
                          className="text-[10px] gap-1"
                        >
                          {u.role === 'ADMIN'
                            ? <Shield className="w-3 h-3" />
                            : <User className="w-3 h-3" />
                          }
                          {u.role === 'ADMIN' ? 'Administrateur' : 'Opérateur'}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={u.enabled ? 'green' : 'secondary'}
                          className="text-[10px]"
                        >
                          {u.enabled ? 'Actif' : 'Désactivé'}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => openEditModal(u)}
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          {!isSelf && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    L'utilisateur <span className="font-semibold text-foreground">{u.username}</span> sera définitivement supprimé du système.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(u.id)}>
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* User Form Modal (Create / Edit) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {editingUser ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="u-username">Nom d'utilisateur <span className="text-destructive">*</span></Label>
              <Input
                id="u-username"
                value={formData.username}
                onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                required
                placeholder="Ex: jean.dupont"
                className="bg-muted/30 border-border focus:border-primary"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Adresse email <span className="text-destructive">*</span></Label>
              <Input
                id="u-email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                required
                placeholder="jean@exemple.com"
                className="bg-muted/30 border-border focus:border-primary"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="u-password">
                {editingUser ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe'}
                {!editingUser && <span className="text-destructive ml-1">*</span>}
              </Label>
              <div className="relative">
                <Input
                  id="u-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Minimum 6 caractères'}
                  className="bg-muted/30 border-border focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="u-role">Rôle</Label>
              <select
                id="u-role"
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value as UserRole }))}
                className="flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
              >
                <option value="OPERATOR" className="bg-card">Opérateur (accès standard)</option>
                <option value="ADMIN" className="bg-card">Administrateur (accès complet)</option>
              </select>
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Compte actif</p>
                <p className="text-xs text-muted-foreground">L'utilisateur peut se connecter</p>
              </div>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={e => setFormData(p => ({ ...p, enabled: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 shadow-lg shadow-primary/20">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Enregistrement...' : editingUser ? 'Sauvegarder' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
