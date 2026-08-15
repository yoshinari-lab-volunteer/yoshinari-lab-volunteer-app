import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getVolunteer } from '@/lib/firebase/queries';
import { updateVolunteer } from '@/lib/actions/volunteers';
import { VolunteerForm } from '@/components/admin/volunteer-form';

export const metadata: Metadata = { title: '案件の編集' };

export default async function EditVolunteerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const volunteer = await getVolunteer(id);
  if (!volunteer) notFound();

  const updateWithId = updateVolunteer.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">案件の編集</h1>
      <VolunteerForm volunteer={volunteer} action={updateWithId} submitLabel="更新する" />
    </div>
  );
}
