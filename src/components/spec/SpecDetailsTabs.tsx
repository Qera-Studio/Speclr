'use client';

import { useId, useState } from 'react';
import { motion } from 'motion/react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DetailTab {
  id: string;
  label: string;
  content: string;
}

/**
 * The card's descriptive fields (Used in / Why it matters / Industry standard)
 * as a tabbed panel: three titles in one row, one body visible at a time. These
 * details are secondary — tucked here for the curious. The bodies live on one
 * horizontal track that scrubs left/right like a slider when you switch tabs,
 * inside a fixed-height viewport that scrolls if a body overflows.
 */
export default function SpecDetailsTabs({ tabs }: { tabs: DetailTab[] }) {
  // Unique per instance so each card's pill animates independently (a shared
  // layoutId across cards would make the pill fly between different cards).
  const layoutId = useId();
  const [active, setActive] = useState(tabs[0]?.id);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === active));

  return (
    <Tabs value={active} onValueChange={(v) => setActive(String(v))}>
      <TabsList className="w-full">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            // Suppress the built-in instant pill; a shared-layout Motion pill
            // glides between tabs instead.
            className="border-transparent data-active:bg-transparent dark:data-active:border-transparent dark:data-active:bg-transparent"
          >
            {tab.id === active && (
              <motion.span
                layoutId={`${layoutId}-pill`}
                className="absolute inset-0 rounded-md bg-background shadow-sm dark:bg-input/30"
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Fixed-height viewport onto a horizontal track holding every body. The
          track scrubs to the active panel; a long body scrolls within its cell
          so the card never jumps height. */}
      <div className="h-16 overflow-hidden">
        <motion.div
          className="flex h-full"
          animate={{ x: `-${activeIndex * 100}%` }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="h-full w-full shrink-0 overflow-y-auto px-1 text-xs/relaxed text-foreground"
            >
              {tab.content}
            </div>
          ))}
        </motion.div>
      </div>
    </Tabs>
  );
}
