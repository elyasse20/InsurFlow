'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Edit2, Trash2, User, Building2,
  Users, RefreshCw, X,
} from 'lucide-react';
import api from '@/lib/api';
import { Client } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { ClientSheet } from '@/components/clients/ClientSheet';
import { EmptyClients } from '@/components/clients/EmptyClients';
import Pagination from '@/components/Pagination';

/* ── Skeleton rows while loading ─────────────────────────────────────────── */
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent border-border/50">
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell>
            <div className="flex justify-end gap-1">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // ── Pagination state ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  /* ── Data fetching ─────────────────────────────────────────────────────── */
  const fetchClients = useCallback(async (nom?: string, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await api.get<Client[]>('/clients', {
        params: nom ? { nom } : {},
      });
      setClients(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchClients(search || undefined);
  };

  const clearSearch = () => {
    setSearch('');
    setCurrentPage(1);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/clients/${id}`);
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const handleClientCreated = (client: Client) => {
    setClients(prev => [client, ...prev]);
  };

  const isFiltered = search.trim().length > 0;

  // ── Pagination calculations ───────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(clients.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedClients = clients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Clients
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-10">
            {loading
              ? 'Chargement du portefeuille...'
              : `${clients.length} client${clients.length > 1 ? 's' : ''} dans votre portefeuille`
            }
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchClients(search || undefined, true)}
            disabled={refreshing}
            className="h-9 w-9 flex-shrink-0"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* New client button */}
          <Button
            onClick={() => setSheetOpen(true)}
            className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow h-9"
          >
            <Plus className="w-4 h-4" />
            Nouveau client
          </Button>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom..."
            className="pl-9 pr-9 bg-muted/30 border-border focus:border-primary h-9 w-full"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" variant="secondary" size="sm" className="px-3 sm:px-4 h-9 flex-shrink-0">
          Rechercher
        </Button>
      </form>

      {/* ── Table card ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead className="w-[110px]">Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Crédit</TableHead>
                <TableHead className="w-[90px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableSkeleton />
              ) : clients.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <div className="relative overflow-hidden">
                      <EmptyClients
                        onAddClient={() => setSheetOpen(true)}
                        isFiltered={isFiltered}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClients.map(client => (
                  <TableRow key={client.id} className="border-border/40 group">

                    {/* Type badge */}
                    <TableCell>
                      <Badge
                        variant={client.type === 'particulier' ? 'blue' : 'violet'}
                        className="text-[10px]"
                      >
                        {client.type === 'particulier'
                          ? <User className="w-3 h-3" />
                          : <Building2 className="w-3 h-3" />
                        }
                        {client.type === 'particulier' ? 'Particulier' : 'Société'}
                      </Badge>
                    </TableCell>

                    {/* Client name with avatar */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-[11px] font-semibold">
                            {client.nom.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {client.nom}{client.prenom ? ` ${client.prenom}` : ''}
                          </p>
                          {client.cin && (
                            <p className="text-xs text-muted-foreground truncate">
                              CIN: {client.cin}
                            </p>
                          )}
                          {client.ice && (
                            <p className="text-xs text-muted-foreground truncate">
                              ICE: {client.ice}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Tel */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {client.tel}
                    </TableCell>

                    {/* Adresse */}
                    <TableCell className="max-w-[180px]">
                      <p className="text-sm text-muted-foreground truncate" title={client.adresse}>
                        {client.adresse}
                      </p>
                    </TableCell>

                    {/* Budget */}
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="text-sm font-medium text-foreground tabular-nums">
                        {client.budget.toLocaleString('fr-MA')} DH
                      </span>
                    </TableCell>

                    {/* Crédit */}
                    <TableCell className="text-right whitespace-nowrap">
                      <span className={`text-sm font-semibold tabular-nums ${
                        client.credit > 0 ? 'text-amber-400' : 'text-green-400'
                      }`}>
                        {client.credit.toLocaleString('fr-MA')} DH
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => router.push(`/clients/${client.id}/edit`)}
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        {/* Delete */}
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
                              <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Vous êtes sur le point de supprimer{' '}
                                <span className="font-semibold text-foreground">
                                  {client.nom}{client.prenom ? ` ${client.prenom}` : ''}
                                </span>
                                . Cette action est irréversible et supprimera toutes les données associées.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(client.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!loading && clients.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={clients.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="clients"
        />
      )}

      {/* ── Stats footer ────────────────────────────────────────────────── */}
      {!loading && clients.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2 px-1">
          <span>{clients.length} résultat{clients.length > 1 ? 's' : ''}</span>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <span>
              Particuliers:{' '}
              <span className="font-medium text-blue-400">
                {clients.filter(c => c.type === 'particulier').length}
              </span>
            </span>
            <span>
              Sociétés:{' '}
              <span className="font-medium text-violet-400">
                {clients.filter(c => c.type === 'societe').length}
              </span>
            </span>
            <span>
              Budget total:{' '}
              <span className="font-medium text-foreground">
                {clients.reduce((s, c) => s + c.budget, 0).toLocaleString('fr-MA')} DH
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ── Client creation Sheet ────────────────────────────────────────── */}
      <ClientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={handleClientCreated}
      />
    </div>
  );
}
