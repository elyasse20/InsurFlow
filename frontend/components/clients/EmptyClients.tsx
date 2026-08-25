'use client';

import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyClientsProps {
  onAddClient: () => void;
  isFiltered?: boolean;
}

export function EmptyClients({ onAddClient, isFiltered = false }: EmptyClientsProps) {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        {/* Icon container */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="w-9 h-9 text-muted-foreground/40" />
          </div>
          {/* Decorative rings */}
          <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-border/60 scale-110 opacity-60" />
          <div className="absolute inset-0 rounded-2xl border border-border/30 scale-125 opacity-30" />
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">
          Aucun résultat trouvé
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Aucun client ne correspond à votre recherche. Essayez avec un autre terme ou effacez le filtre.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      {/* Icon container with gradient glow */}
      <div className="relative mb-8">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl scale-150" />
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
          <Users className="w-10 h-10 text-primary/60" />
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary/30 animate-pulse" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-primary/20 animate-pulse delay-300" />
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-3">
        Aucun client enregistré
      </h3>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
        Votre portefeuille client est vide pour le moment. Commencez par ajouter
        votre premier client pour gérer ses contrats et opérations d&apos;assurance.
      </p>

      <Button
        onClick={onAddClient}
        className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
        size="lg"
      >
        <Users className="w-4 h-4" />
        Ajouter votre premier client
      </Button>

      {/* Decorative grid pattern */}
      <div className="absolute inset-0 -z-10 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(217.2 91.2% 59.8%) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}
