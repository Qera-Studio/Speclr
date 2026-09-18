'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveServiceSection, type ServiceSection } from '@/server/actions/services';

/**
 * The save half of a service-page section: post one section, surface the
 * refusal, refresh on success.
 *
 * Shared by the three section forms because all three do exactly this and
 * only this, the same reason `useStepSave` exists for onboarding. Each form
 * decides what its payload is; this decides nothing about it.
 */
export function useSectionSave(code: string, section: ServiceSection) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const save = (payload: unknown) =>
    startTransition(async () => {
      setServerError(null);
      const result = await saveServiceSection(code, section, payload);
      if (!result.success) {
        setServerError(result.error ?? 'Failed to save.');
        return;
      }
      router.refresh();
    });

  return { pending, serverError, save };
}
