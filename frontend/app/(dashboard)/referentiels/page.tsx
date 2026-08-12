'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SimpleList from '@/components/SimpleList';
import { Tag, List, Settings, Percent, Database } from 'lucide-react';
import api from '@/lib/api';
import { ReferentielsResponse } from '@/types';

export default function ReferentielsPage() {
  const [data, setData] = useState<ReferentielsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReferentiels = useCallback(async () => {
    try {
      const res = await api.get<ReferentielsResponse>('/referentiels');
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferentiels();
  }, [fetchReferentiels]);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Database className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestion des Référentiels</h1>
          <p className="text-sm text-muted-foreground">
            BFF Aggregator — Chargement en 1 seule requête HTTP (`GET /api/referentiels`)
          </p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="w-fit inline-flex overflow-x-auto">
          <TabsTrigger value="categories">
            <Tag className="w-4 h-4" />
            Catégories {data && `(${data.categories.length})`}
          </TabsTrigger>
          <TabsTrigger value="natures">
            <List className="w-4 h-4" />
            Natures {data && `(${data.natures.length})`}
          </TabsTrigger>
          <TabsTrigger value="parametres">
            <Settings className="w-4 h-4" />
            Paramètres Tarification {data && `(${data.parametres.length})`}
          </TabsTrigger>
          <TabsTrigger value="tva">
            <Percent className="w-4 h-4" />
            TVA {data && `(${data.tvas.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <SimpleList
            title="Catégories"
            itemLabel="catégorie"
            endpoint="categories"
            icon={<Tag className="w-4 h-4 text-primary" />}
            initialData={data?.categories}
            onRefresh={fetchReferentiels}
            extraFields={[
              { key: 'commissionRate', label: 'Taux Commission (%)', type: 'number' }
            ]}
          />
        </TabsContent>

        <TabsContent value="natures">
          <SimpleList
            title="Natures"
            itemLabel="nature"
            endpoint="natures"
            icon={<List className="w-4 h-4 text-primary" />}
            initialData={data?.natures}
            onRefresh={fetchReferentiels}
          />
        </TabsContent>

        <TabsContent value="parametres">
          <SimpleList
            title="Paramètres Tarification"
            itemLabel="paramètre"
            endpoint="parametres"
            icon={<Settings className="w-4 h-4 text-primary" />}
            initialData={data?.parametres}
            onRefresh={fetchReferentiels}
            fixedPayload={{ type: 'NUMBER' }}
            extraFields={[
              { key: 'value', label: 'Valeur (DH)', type: 'text' }
            ]}
          />
        </TabsContent>

        <TabsContent value="tva">
          <SimpleList
            title="TVA"
            itemLabel="TVA"
            endpoint="tva"
            icon={<Percent className="w-4 h-4 text-primary" />}
            initialData={data?.tvas}
            onRefresh={fetchReferentiels}
            extraFields={[
              { key: 'rate', label: 'Taux (%)', type: 'number' }
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
