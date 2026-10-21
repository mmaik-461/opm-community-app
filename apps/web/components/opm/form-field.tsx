import * as React from 'react';
import { Input } from '@/components/ui/input';
import { LABEL_CLASS } from '@/constants/ui';

interface FormFieldProps extends Omit<React.ComponentProps<typeof Input>, 'id'> {
  id: string;
  label: string;
  hint?: string;
}

export function FormField({ id, label, hint, ...inputProps }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={`${LABEL_CLASS} mb-2 block`}>
        {label}
      </label>
      <Input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...inputProps} />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}
