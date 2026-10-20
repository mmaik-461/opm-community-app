import { MapPin, Plane } from 'lucide-react';
import type { Profile } from '@opm/shared-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LABEL_CLASS } from '@/constants/ui';
import { initials, travelLabel } from '@/utils/profile';

export function ProfileCard({ profile }: { profile: Profile }) {
  const traveling = profile.travelStatus === 'TRAVELING_TO';
  return (
    <Card className="gap-4 border border-zinc-200 bg-white p-5 shadow-none ring-0 transition-all duration-200 hover:border-zinc-300 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="size-11">
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
          <AvatarFallback className="bg-zinc-900 text-sm font-medium text-white">
            {initials(profile.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-tight text-zinc-900">
            {profile.fullName}
          </h3>
          <p className="line-clamp-2 text-sm text-zinc-600">{profile.headline}</p>
        </div>
        <Badge variant="outline" className="shrink-0 border-zinc-300 text-zinc-700">
          {profile.cohort}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
        <span className="flex items-center gap-1.5">
          {traveling ? (
            <Plane className="size-3.5 text-amber-600" aria-hidden />
          ) : (
            <MapPin className="size-3.5" aria-hidden />
          )}
          <span className={traveling ? 'font-medium text-amber-700' : undefined}>
            {travelLabel(profile.travelStatus)}
          </span>{' '}
          {profile.city}
        </span>
        <span className={LABEL_CLASS}>{profile.industry}</span>
      </div>

      {profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.map((s) => (
            <Badge key={s} variant="secondary" className="bg-zinc-100 font-normal text-zinc-700">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
