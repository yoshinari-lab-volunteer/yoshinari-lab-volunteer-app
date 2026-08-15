'use client';

import { Download } from 'lucide-react';
import { toCsv } from '@/lib/utils';
import { APPLICATION_STATUS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import type { ApplicationWithProfile } from '@/types/firestore';

export function CsvDownloadButton({
  volunteerTitle,
  applications,
}: {
  volunteerTitle: string;
  applications: ApplicationWithProfile[];
}) {
  function handleDownload() {
    const csv = toCsv(
      ['氏名', 'メールアドレス', '電話番号', 'ステータス', '応募日時'],
      applications.map((a) => [
        a.profile.fullName,
        a.profile.email,
        a.profile.phone,
        APPLICATION_STATUS[a.status].label,
        new Date(a.appliedAt).toLocaleString('ja-JP'),
      ]),
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${volunteerTitle}_応募者一覧.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={applications.length === 0}>
      <Download className="size-4" aria-hidden />
      CSVダウンロード
    </Button>
  );
}
