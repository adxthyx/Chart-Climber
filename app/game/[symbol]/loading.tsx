import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-3 bg-[#070b14] text-white/60">
      <Loader2 className="h-7 w-7 animate-spin text-white/80" />
      <p className="text-sm font-medium">Building terrain…</p>
    </div>
  );
}
