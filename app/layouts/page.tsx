'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { layoutRepository, type Layout } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LayoutsPage() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLayouts();
  }, []);

  const loadLayouts = async () => {
    try {
      const data = await layoutRepository.list();
      setLayouts(data);
    } catch (error) {
      console.error('Failed to load layouts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-6 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Layout Maps</h1>
        <Link href="/layouts/new">
          <Button>Create Layout</Button>
        </Link>
      </div>

      {layouts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No layouts yet. Create your first garden or room map!
          </p>
          <Link href="/layouts/new">
            <Button>Create Layout</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {layouts.map((layout) => (
            <Link key={layout.id} href={`/layouts/${layout.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer overflow-hidden">
                {layout.thumbnailUri && (
                  <Image
                    src={layout.thumbnailUri}
                    alt={layout.name}
                    width={400}
                    height={300}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{layout.name}</h3>
                  {layout.description && (
                    <p className="text-sm text-muted-foreground mt-2">{layout.description}</p>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {layout.type}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
