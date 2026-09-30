import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getVolunteer, getVolunteerEditLink } from '@/lib/firebase/queries';
import { updateVolunteer } from '@/lib/actions/volunteers';
import { VolunteerForm } from '@/components/admin/volunteer-form';
import { VolunteerEditLinkPanel } from '@/components/admin/volunteer-edit-link-panel';

export const metadata: Metadata = { title: '案件の編集' };

export default async function EditVolunteerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [volunteer, editLink] = await Promise.all([getVolunteer(id), getVolunteerEditLink(id)]);
  if (!volunteer) notFound();

  const updateWithId = updateVolunteer.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">案件の編集</h1>
      <VolunteerEditLinkPanel volunteerId={id} editLink={editLink} />
      <VolunteerForm volunteer={volunteer} action={updateWithId} submitLabel="更新する" />
    </div>
  );
}
