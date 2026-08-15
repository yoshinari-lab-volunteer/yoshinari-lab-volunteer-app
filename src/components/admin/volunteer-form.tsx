'use client';

import { useRef, useState, useTransition } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { toDatetimeLocalValue } from '@/lib/utils';
import { AREAS } from '@/lib/constants';
import { Field, Input, Select, Textarea, Label } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ImageCropModal } from '@/components/admin/image-crop-modal';
import type { Volunteer } from '@/types/firestore';

type SubmitAction = (formData: FormData) => Promise<{ error?: string } | void>;

type ImageItem = {
  key: string;
  url: string;
  isExisting: boolean;
  file?: File;
};

const MAX_IMAGES = 5;

export function VolunteerForm({
  volunteer,
  action,
  submitLabel,
}: {
  volunteer?: Volunteer;
  action: SubmitAction;
  submitLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ImageItem[]>(
    () => volunteer?.orgImageUrls.map((url) => ({ key: url, url, isExisting: true })) ?? [],
  );
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 同じファイルを続けて選び直せるようにリセット
    if (file) setCroppingFile(file);
  }

  function handleCropped(blob: Blob) {
    const file = new File([blob], `image-${Date.now()}.jpg`, { type: blob.type });
    const url = URL.createObjectURL(file);
    setImages((prev) => [...prev, { key: url, url, isExisting: false, file }]);
    setCroppingFile(null);
  }

  function handleRemoveImage(key: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target && !target.isExisting) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.key !== key);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const keptUrls = new Set(images.filter((i) => i.isExisting).map((i) => i.url));
    for (const originalUrl of volunteer?.orgImageUrls ?? []) {
      if (!keptUrls.has(originalUrl)) formData.append('removedImageUrls', originalUrl);
    }
    for (const url of keptUrls) {
      formData.append('keptImageUrls', url);
    }
    for (const img of images) {
      if (!img.isExisting && img.file) formData.append('newImages', img.file, img.file.name);
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="タイトル" htmlFor="title" required>
            <Input id="title" name="title" defaultValue={volunteer?.title} required maxLength={200} />
          </Field>
        </div>

        <Field label="分野" htmlFor="category" required>
          <Input id="category" name="category" defaultValue={volunteer?.category} required maxLength={50} />
        </Field>

        <Field label="地域" htmlFor="area" required>
          <Select id="area" name="area" defaultValue={volunteer?.area ?? ''} required>
            <option value="" disabled>
              選択してください
            </option>
            {AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="開催日" htmlFor="eventDate" required>
          <Input id="eventDate" name="eventDate" type="date" defaultValue={volunteer?.eventDate} required />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="開始時刻" htmlFor="startTime">
            <Input id="startTime" name="startTime" type="time" defaultValue={volunteer?.startTime ?? ''} />
          </Field>
          <Field label="終了時刻" htmlFor="endTime">
            <Input id="endTime" name="endTime" type="time" defaultValue={volunteer?.endTime ?? ''} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="集合場所" htmlFor="location">
            <Input id="location" name="location" defaultValue={volunteer?.location} maxLength={200} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="活動内容" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={volunteer?.description} maxLength={4000} />
          </Field>
        </div>

        <Field label="獲得ポイント" htmlFor="points" required>
          <Input
            id="points"
            name="points"
            type="number"
            min={0}
            step={1}
            defaultValue={volunteer?.points ?? 0}
            required
          />
        </Field>

        <Field label="定員" htmlFor="maxCapacity" required>
          <Input
            id="maxCapacity"
            name="maxCapacity"
            type="number"
            min={1}
            step={1}
            defaultValue={volunteer?.maxCapacity ?? 10}
            required
          />
        </Field>

        <Field label="募集期限" htmlFor="deadline" required>
          <Input
            id="deadline"
            name="deadline"
            type="datetime-local"
            defaultValue={volunteer ? toDatetimeLocalValue(volunteer.deadline) : ''}
            required
          />
        </Field>

        <Field label="公開状態" htmlFor="status" required>
          <Select id="status" name="status" defaultValue={volunteer?.status ?? 'draft'} required>
            <option value="draft">非公開（下書き）</option>
            <option value="published">公開中</option>
            <option value="closed">募集終了</option>
          </Select>
        </Field>

        <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            name="beginnerFriendly"
            defaultChecked={volunteer?.beginnerFriendly}
            className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          初心者OKバッジを表示する
        </label>

        <div className="sm:col-span-2">
          <Field label="主催団体名" htmlFor="orgName">
            <Input id="orgName" name="orgName" defaultValue={volunteer?.orgName} maxLength={200} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="団体紹介" htmlFor="orgDescription">
            <Textarea id="orgDescription" name="orgDescription" defaultValue={volunteer?.orgDescription} maxLength={2000} />
          </Field>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>団体・案件の画像（最大{MAX_IMAGES}枚・1枚目が一覧のサムネイルになります）</Label>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {images.map((img) => (
                <div
                  key={img.key}
                  className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.key)}
                    aria-label="この画像を削除する"
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-slate-900/80 text-white shadow hover:bg-slate-900"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelected}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={images.length >= MAX_IMAGES}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImagePlus className="size-4" aria-hidden />
            画像を追加
          </Button>
          <p className="text-xs text-slate-500">
            JPEG・PNG・WebP、5MB以下。選択後に表示比率（16:9）で切り抜けます。
          </p>
        </div>
      </div>

      {croppingFile && (
        <ImageCropModal
          file={croppingFile}
          onCropped={handleCropped}
          onCancel={() => setCroppingFile(null)}
        />
      )}

      <Button type="submit" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
