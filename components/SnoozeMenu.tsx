'use client';
import { useState } from 'react';
import { careTaskRepository } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SnoozeMenuProps {
  taskId: string;
  onSnoozed?: () => void;
}

export function SnoozeMenu({ taskId, onSnoozed }: SnoozeMenuProps) {
  const [open, setOpen] = useState(false);

  const options = [
    {
      label: 'Later today',
      getDate: () => { const d = new Date(); d.setHours(d.getHours() + 3); return d; },
    },
    {
      label: 'Tomorrow',
      getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; },
    },
    {
      label: 'In 3 days',
      getDate: () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(9, 0, 0, 0); return d; },
    },
    {
      label: 'Next week',
      getDate: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); return d; },
    },
  ];

  const handleSnooze = async (getDate: () => Date) => {
    setOpen(false);
    await careTaskRepository.snooze(taskId, getDate());
    onSnoozed?.();
  };

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        Snooze
      </Button>
      {open && (
        <>
          {/* backdrop to close on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <Card className="absolute right-0 top-full mt-1 z-20 p-1 min-w-[140px] shadow-lg">
            {options.map((opt) => (
              <button
                key={opt.label}
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
                onClick={() => handleSnooze(opt.getDate)}
              >
                {opt.label}
              </button>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
