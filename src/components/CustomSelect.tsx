import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Option = { value: string; label: string };

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange(value: string): void;
  className?: string;
  placeholder?: string;
}

export default function CustomSelect({ value, options, onChange, className = '', placeholder }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(option => option.value === value)?.label || placeholder || options[0]?.label || '';

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(open => !open)}
        className="input rounded-full flex items-center justify-between gap-3 text-sm w-full"
      >
        <span className={value === '' ? 'text-slate-500' : ''}>{selectedLabel}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={`w-full px-4 py-3 text-left text-sm ${option.value === value ? 'bg-primary-50 text-primary-700' : 'text-text hover:bg-slate-50'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
