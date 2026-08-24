'use client';

import * as React from 'react';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

/**
 * One of every anchored popup, each in a wide container so a popup that sizes
 * to its content is still measurably narrower than its control when the floor
 * is missing. A narrow container would hide the bug by making the content the
 * binding constraint rather than the rule.
 *
 * Each control is `w-full` inside a `data-probe` wrapper, so the wrapper's box
 * *is* the control's box and the test can measure without every primitive
 * having to forward an extra attribute.
 */

const CLIENTS = [
  { value: 'clayora', label: 'Clayora' },
  { value: 'zaib', label: 'Zaib' },
  { value: 'qera', label: 'Qera' },
];

export default function PopupGallery() {
  const [client, setClient] = React.useState('');
  const [choice, setChoice] = React.useState('one');
  const [date, setDate] = React.useState('2026-08-24');

  return (
    <main className="flex min-h-screen flex-col gap-16 bg-background p-16">
      <div data-probe="combobox" className="w-96">
        <Combobox
          options={CLIENTS}
          value={client}
          onValueChange={setClient}
          placeholder="Client"
        />
      </div>

      <div data-probe="select" className="w-96">
        <Select value={choice} onValueChange={(v) => setChoice(v ?? 'one')}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one">One</SelectItem>
            <SelectItem value="two">Two</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div data-probe="date" className="w-96">
        <DatePicker value={date} onValueChange={setDate} />
      </div>

      <div data-probe="menu" className="w-96">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="w-full">
                Menu
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-probe="submenu">
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Light</DropdownMenuItem>
                <DropdownMenuItem>Dark</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </main>
  );
}
