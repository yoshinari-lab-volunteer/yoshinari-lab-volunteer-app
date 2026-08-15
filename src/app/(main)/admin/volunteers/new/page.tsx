import type { Metadata } from 'next';
import { createVolunteer } from '@/lib/actions/volunteers';
import { VolunteerForm } from '@/components/admin/volunteer-form';

export const metadata: Metadata = { title: '案件の新規作成' };

export default function NewVolunteerPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">案件の新規作成</h1>
      <VolunteerForm action={createVolunteer} submitLabel="作成する" />
    </div>
  );
}
