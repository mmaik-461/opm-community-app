'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LABEL_CLASS } from '@/constants/ui';

interface PasswordFieldProps extends Omit<React.ComponentProps<typeof Input>, 'id' | 'type'> {
  id: string;
  label: string;
  /** Names the toggle for assistive tech, e.g. "password" → "Show password". */
  toggleSubject: string;
  error?: string | null;
  children?: React.ReactNode;
}

export function PasswordField({
  id,
  label,
  toggleSubject,
  error,
  children,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={`${LABEL_CLASS} mb-2 block`}>
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          className="pr-9"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={`${visible ? 'Hide' : 'Show'} ${toggleSubject}`}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-zinc-500 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {children}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
