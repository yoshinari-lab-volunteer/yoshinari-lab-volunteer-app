'use client';

import { AREAS, CATEGORIES } from '@/lib/constants';
import { Select, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

export function VolunteerSearchForm({
  defaultValues,
}: {
  defaultValues: { area?: string; category?: string; date?: string };
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
        <span className="block font-semibold text-slate-800">分野</span>
        <Select name="category" defaultValue={defaultValues.category ?? ''}>
          <option value="">すべての分野</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-1.5 text-sm">
        <span className="block font-semibold text-slate-800">開催日</span>
        <Input type="date" name="date" defaultValue={defaultValues.date ?? ''} />
      </label>

      <Button type="submit" className="w-full sm:w-auto">
        検索する
      </Button>
    </form>
  );
}
