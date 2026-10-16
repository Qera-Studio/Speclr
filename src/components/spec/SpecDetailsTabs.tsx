'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DetailTab {
  id: string;
  label: string;
  content: string;
}

/**
 * The card's descriptive fields (Used in / Why it matters / Industry standard)
 * as a tabbed panel: three titles in one row, one body visible at a time. These
 * details are secondary, tucked here for the curious. The body sits in a
 * fixed-height viewport that scrolls if it overflows, so the card never jumps
 * height between tabs.
 */
export default function SpecDetailsTabs({ tabs }: { tabs: DetailTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <Tabs value={active} onValueChange={(v) => setActive(String(v))}>
      <TabsList className="w-full">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="h-16 overflow-y-auto px-1 text-xs/relaxed text-foreground">
        {current?.content}
      </div>
    </Tabs>
  );
}
