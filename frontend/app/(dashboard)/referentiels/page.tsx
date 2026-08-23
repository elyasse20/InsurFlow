'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SimpleList from '@/components/SimpleList';
import { Tag, List, Settings, Percent, Database } from 'lucide-react';
import api from '@/lib/api';
import { ReferentielsResponse } from '@/types';

export default function ReferentielsPage() {
  const [data, setData] = useState<ReferentielsResponse | null>(null);

  const fetchReferentiels = useCallback(async () => {
    try {
      const res = await api.get<ReferentielsResponse>('/referentiels');
      setData(res.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchReferentiels();
  }, [fetchReferentiels]);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Database className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Gestion des Référentiels</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Configuration globale des catégories, natures, paramètres et taux de TVA
          </p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="w-full space-y-4">
        {/* Horizontally scrollable tabs list on mobile */}
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <TabsList className="w-auto inline-flex flex-nowrap min-w-full sm:min-w-0">
            <TabsTrigger value="categories" className="whitespace-nowrap flex-shrink-0">
              <Tag className="w-4 h-4 mr-1.5" />
              Catégories {data && `(${data.categories.length})`}
            </TabsTrigger>
            <TabsTrigger value="natures" className="whitespace-nowrap flex-shrink-0">
              <List className="w-4 h-4 mr-1.5" />
              Natures {data && `(${data.natures.length})`}
            </TabsTrigger>
            <TabsTrigger value="parametres" className="whitespace-nowrap flex-shrink-0">
              <Settings className="w-4 h-4 mr-1.5" />
              Paramètres Tarification {data && `(${data.parametres.length})`}
            </TabsTrigger>
            <TabsTrigger value="tva" className="whitespace-nowrap flex-shrink-0">
              <Percent className="w-4 h-4 mr-1.5" />
              TVA {data && `(${data.tvas.length})`}
            </TabsTrigger>
          </TabsList>
        </div>

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
