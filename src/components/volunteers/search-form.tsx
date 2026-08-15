'use client';

import { AREAS } from '@/lib/constants';
import { Select, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

export function VolunteerSearchForm({
  defaultValues,
}: {
  defaultValues: { area?: string; dateFrom?: string; dateTo?: string };
}) {
  return (
    <form
      method="get"
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
    >
      <label className="space-y-1.5 text-sm">
        <span className="block font-semibold text-slate-800">地域</span>
        <Select name="area" defaultValue={defaultValues.area ?? ''}>
          <option value="">すべての地域</option>
          {AREAS.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-1.5 text-sm">
        <span className="block font-semibold text-slate-800">開催日（以降）</span>
        <Input type="date" name="dateFrom" defaultValue={defaultValues.dateFrom ?? ''} />
      </label>

      <label className="space-y-1.5 text-sm">
        <span className="block font-semibold text-slate-800">開催日（以前）</span>
        <Input type="date" name="dateTo" defaultValue={defaultValues.dateTo ?? ''} />
      </label>

      <Button type="submit" className="w-full sm:w-auto">
        検索する
      </Button>
    </form>
  );
}
