'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClientDetailsFieldsProps {
  clientName: string;
  domain: string;
  onClientNameChange: (value: string) => void;
  onDomainChange: (value: string) => void;
}

/**
 * The two identity fields driving every preview mockup: who the icon is for,
 * and which domain shows in the address bar / SERP result / social card.
 *
 * The domain is a separate field rather than derived from the name because it
 * cannot be inferred — "Qera Studio" is `qera.studio`, not `qerastudio.com`.
 */
export default function ClientDetailsFields({
  clientName,
  domain,
  onClientNameChange,
  onDomainChange,
}: ClientDetailsFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="client-name" className="text-sm font-medium">
          Client / project name
        </Label>
        <Input
          id="client-name"
          type="text"
          placeholder="e.g. Zaib, Qera Studio, Acme Co."
          value={clientName}
          onChange={(e) => onClientNameChange(e.target.value)}
          autoComplete="off"
          className="h-11 text-base md:text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="client-domain" className="text-sm font-medium">
          Website / domain
        </Label>
        <Input
          id="client-domain"
          type="text"
          inputMode="url"
          placeholder="e.g. qera.studio"
          value={domain}
          onChange={(e) => onDomainChange(e.target.value)}
          autoComplete="off"
          aria-describedby="client-domain-hint"
          className="h-11 text-base md:text-base"
        />
        <p id="client-domain-hint" className="text-xs text-muted-foreground">
          Shown in the previews — a name can&apos;t be guessed into a domain.
        </p>
      </div>
    </div>
  );
}
