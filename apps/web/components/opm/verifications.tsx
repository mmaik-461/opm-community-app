'use client';

import * as React from 'react';
import { AlertTriangle, Check, CheckCircle2, Inbox, X } from 'lucide-react';
import { VerificationDecision } from '@opm/shared-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  NO_DIPLOMA_LABEL,
  VERIFICATION_COLUMNS,
  VERIFICATION_NOTICE,
  VERIFICATIONS_EMPTY_MESSAGE,
  VERIFICATIONS_EMPTY_TITLE,
  VERIFICATIONS_SUBTITLE,
  VERIFICATIONS_TITLE,
} from '@/constants/admin';
import { LABEL_CLASS } from '@/constants/ui';
import { formatDate } from '@/utils/format';
import { AdminGate } from './admin-gate';
import { useVerifications } from './verifications-context';

export function Verifications() {
  return (
    <AdminGate>
      <VerificationsPanel />
    </AdminGate>
  );
}

function VerificationsPanel() {
  const { pending, loading, error, actionError, deciding, decide, refresh } = useVerifications();
  const [notice, setNotice] = React.useState<string | null>(null);

  async function handleDecision(id: string, name: string, decision: VerificationDecision) {
    setNotice(null);
    if (await decide(id, decision)) setNotice(`${name} ${VERIFICATION_NOTICE[decision]}`);
  }

  const failure = error ?? actionError;

  return (
    <section className="space-y-6" aria-labelledby="verifications-heading">
      <div>
        <h2 id="verifications-heading" className="text-xl font-semibold tracking-tight">
          {VERIFICATIONS_TITLE}
        </h2>
        <p className="text-sm text-zinc-600">{VERIFICATIONS_SUBTITLE}</p>
      </div>

      {notice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> {notice}
        </p>
      )}
      {failure && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          <AlertTriangle className="size-4 shrink-0 text-red-600" aria-hidden />
          <span className="flex-1">{failure}</span>
          {error && (
            <Button variant="outline" size="sm" onClick={refresh}>
              Retry
            </Button>
          )}
        </div>
      )}

      {loading && pending.length === 0 ? (
        <Skeleton className="h-32 w-full" />
      ) : pending.length === 0 ? (
        !error && (
          <Card className="items-center gap-2 border border-dashed border-zinc-300 bg-white p-10 text-center shadow-none ring-0">
            <Inbox className="size-6 text-zinc-400" aria-hidden />
            <p className="font-medium">{VERIFICATIONS_EMPTY_TITLE}</p>
            <p className="text-sm text-zinc-600">{VERIFICATIONS_EMPTY_MESSAGE}</p>
          </Card>
        )
      ) : (
        <Card className="border border-zinc-200 bg-white p-0 shadow-none ring-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {VERIFICATION_COLUMNS.map((column) => (
                  <TableHead key={column} className={LABEL_CLASS}>
                    {column}
                  </TableHead>
                ))}
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.fullName}</TableCell>
                  <TableCell>{row.email ?? '—'}</TableCell>
                  <TableCell>{row.graduationYear}</TableCell>
                  <TableCell>{row.diplomaNumber ?? NO_DIPLOMA_LABEL}</TableCell>
                  <TableCell>{formatDate(row.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        disabled={deciding.has(row.id)}
                        aria-label={`Approve ${row.fullName}`}
                        onClick={() =>
                          void handleDecision(row.id, row.fullName, VerificationDecision.APPROVE)
                        }
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Check /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deciding.has(row.id)}
                        aria-label={`Reject ${row.fullName}`}
                        onClick={() =>
                          void handleDecision(row.id, row.fullName, VerificationDecision.REJECT)
                        }
                      >
                        <X /> Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </section>
  );
}
