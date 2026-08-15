import Link from 'next/link';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import type { Volunteer } from '@/types/firestore';
import { Card, CardBody } from '@/components/ui/card';
import { BeginnerBadge, PointsBadge, VolunteerStatusBadge } from '@/components/ui/badge';
import { formatDate, formatDeadline } from '@/lib/utils';
import { optimizedImageUrl } from '@/lib/cloudinary';

export function VolunteerCard({ volunteer }: { volunteer: Volunteer }) {
  const isFull = volunteer.currentApplicants >= volunteer.maxCapacity;
  const thumbnail = volunteer.orgImageUrls[0];

  return (
    <Link href={`/volunteers/${volunteer.id}`} className="block">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizedImageUrl(thumbnail, { width: 400, height: 225 })}
            alt=""
            className="aspect-video w-full object-cover"
          />
        )}
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <VolunteerStatusBadge status={volunteer.status} />
            {volunteer.beginnerFriendly && <BeginnerBadge />}
            <PointsBadge points={volunteer.points} />
          </div>

          <h3 className="text-base font-bold text-slate-900">{volunteer.title}</h3>

          <dl className="space-y-1 text-sm text-slate-600">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0 text-slate-400" aria-hidden />
              <span>{formatDate(volunteer.eventDate)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
              <span>{volunteer.area}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="size-4 shrink-0 text-slate-400" aria-hidden />
              <span>
                {volunteer.currentApplicants} / {volunteer.maxCapacity} 名
                {isFull && <span className="ml-1 font-semibold text-rose-600">満員</span>}
              </span>
            </div>
          </dl>

          <p className="text-xs font-medium text-slate-500">募集期限: {formatDeadline(volunteer.deadline)}</p>
        </CardBody>
      </Card>
    </Link>
  );
}
