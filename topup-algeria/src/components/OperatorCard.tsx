import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Operator } from '@/types';
import { Check } from 'lucide-react';

interface OperatorCardProps {
  operator: Operator;
  selected: boolean;
  onSelect: () => void;
}

export function OperatorCard({ operator, selected, onSelect }: OperatorCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group relative w-full rounded-2xl border-2 p-5 text-left transition-all duration-200',
        selected
          ? 'border-white/30 bg-white/10 shadow-lg shadow-white/5'
          : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/5'
      )}
    >
      {selected && (
        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-bold text-white shadow-lg',
            operator.bgGradient
          )}
        >
          {operator.logoText[0]}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{operator.name}</h3>
          <p className="text-xs text-slate-400">{operator.active ? 'Disponible' : 'Indisponible'}</p>
        </div>
      </div>
    </button>
  );
}
