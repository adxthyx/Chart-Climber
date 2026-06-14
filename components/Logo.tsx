import { Bike } from 'lucide-react';

export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="bg-brand-gradient inline-flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm shadow-brand/30">
        <Bike className="h-5 w-5" strokeWidth={2.4} />
      </span>
      {withWordmark && (
        <span className="text-[17px] font-bold tracking-tight">
          Chart<span className="text-brand">Climber</span>
        </span>
      )}
    </span>
  );
}
