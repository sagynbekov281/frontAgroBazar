import { Star } from 'lucide-react';

export default function StarRating({ value, onChange, readonly = false, size = 20 }: { value: number; onChange?: (v: number) => void; readonly?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size}
          className={`${i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} ${!readonly ? 'cursor-pointer hover:fill-amber-300 hover:text-amber-300' : ''} transition`}
          onClick={() => !readonly && onChange?.(i)}
        />
      ))}
    </div>
  );
}
