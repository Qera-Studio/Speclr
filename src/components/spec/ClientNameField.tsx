'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClientNameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ClientNameField({ value, onChange }: ClientNameFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="client-name">Client / project name</Label>
      <Input
        id="client-name"
        type="text"
        placeholder="e.g. Zaib, Qera Studio, Acme Co."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
}
