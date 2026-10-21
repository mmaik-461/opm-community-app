import { Check, Circle } from 'lucide-react';
import { PASSWORD_REQUIREMENTS_LABEL } from '@/constants/auth';
import { checkPassword } from '@/utils/register';

export function PasswordChecklist({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} aria-label={PASSWORD_REQUIREMENTS_LABEL} className="mt-2 space-y-1 text-xs">
      {checkPassword(password).map(({ id: ruleId, label, met }) => (
        <li
          key={ruleId}
          className={`flex items-center gap-1.5 ${met ? 'text-green-700' : 'text-zinc-500'}`}
        >
          {met ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Circle className="size-3.5" aria-hidden />
          )}
          <span>{label}</span>
          <span className="sr-only">{met ? '(met)' : '(not met)'}</span>
        </li>
      ))}
    </ul>
  );
}
