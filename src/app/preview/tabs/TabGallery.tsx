'use client';

import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsPanels,
  TabsTrigger,
} from '@/components/ui/tabs';

const TABS = [
  { value: 'summary', label: 'Summary' },
  { value: 'lines', label: 'Line items and taxes' },
  { value: 'terms', label: 'Terms' },
];

/** One ordinary strip, indicator and all, at four hundred-odd pixels wide. */
export default function TabGallery() {
  return (
    <main className="p-10">
      <Tabs defaultValue="summary" className="w-[440px]">
        <TabsList className="w-full">
          <TabsIndicator />
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsPanels>
          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.label} panel
            </TabsContent>
          ))}
        </TabsPanels>
      </Tabs>
    </main>
  );
}
