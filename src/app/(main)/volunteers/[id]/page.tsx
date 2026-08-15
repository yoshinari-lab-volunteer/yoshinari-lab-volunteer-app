import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { getVolunteer, getMyApplication } from '@/lib/firebase/queries';
import { getCurrentProfile } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/card';
import { BeginnerBadge, PointsBadge, VolunteerStatusBadge } from '@/components/ui/badge';
import { formatDate, formatDeadline } from '@/lib/utils';
import { optimizedImageUrl } from '@/lib/cloudinary';
import { VolunteerImageGallery } from '@/components/volunteers/image-gallery';
import { ApplyPanel } from './apply-panel';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const volunteer = await getVolunteer(id);
  return { title: volunteer?.title ?? '案件が見つかりません' };
}

export default async function VolunteerDetailPage({ params }: Props) {
  const { id } = await params;
  const [volunteer, profile] = await Promise.all([getVolunteer(id), getCurrentProfile()]);
  if (!volunteer) notFound();
  if (volunteer.status === 'draft' && profile?.role !== 'admin') notFound();

  const myApplication = profile ? await getMyApplication(id, profile.id) : null;

  const galleryImages = volunteer.orgImageUrls.map((url) => ({
    thumb: optimizedImageUrl(url, { width: 400, height: 225 }),
    large: optimizedImageUrl(url, { width: 1600, height: 900 }),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <VolunteerImageGallery images={galleryImages} />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <VolunteerStatusBadge status={volunteer.status} />
            {volunteer.beginnerFriendly && <BeginnerBadge />}
            <PointsBadge points={volunteer.points} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{volunteer.title}</h1>
        </div>

        <Card>
          <CardBody className="space-y-3">
            <InfoRow icon={CalendarDays} label="開催日">
              {formatDate(volunteer.eventDate)}
            </InfoRow>
            {(volunteer.startTime || volunteer.endTime) && (
              <InfoRow icon={Clock} label="時間">
                {volunteer.startTime ?? '未定'} 〜 {volunteer.endTime ?? '未定'}
              </InfoRow>
            )}
            <InfoRow icon={MapPin} label="場所">
              {volunteer.area}
              {volunteer.location && ` / ${volunteer.location}`}
            </InfoRow>
            <InfoRow icon={Users} label="定員">
              {volunteer.currentApplicants} / {volunteer.maxCapacity} 名
            </InfoRow>
            <p className="text-xs font-medium text-slate-500">
              募集期限: {formatDeadline(volunteer.deadline)}
            </p>
          </CardBody>
        </Card>

        {volunteer.description && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">活動内容</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {volunteer.description}
            </p>
          </section>
        )}

        {(volunteer.orgName || volunteer.orgDescription) && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">主催団体</h2>
            <Card>
              <CardBody className="space-y-2">
                {volunteer.orgName && <p className="font-bold text-slate-900">{volunteer.orgName}</p>}
                {volunteer.orgDescription && (
                  <p className="text-sm leading-relaxed text-slate-600">{volunteer.orgDescription}</p>
                )}
              </CardBody>
            </Card>
          </section>
        )}
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <ApplyPanel
          volunteerId={id}
          volunteer={volunteer}
          isLoggedIn={Boolean(profile)}
          isActive={profile?.isActive ?? true}
          application={myApplication}
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
      <span className="w-12 shrink-0 font-semibold text-slate-500">{label}</span>
      <span className="text-slate-800">{children}</span>
    </div>
  );
}
