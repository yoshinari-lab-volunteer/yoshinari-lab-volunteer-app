'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';

const MAX_OUTPUT_WIDTH = 1600;

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

/**
 * 選択した画像を、案件一覧・詳細で表示される比率（16:9）にその場で切り抜くモーダル。
 * 切り抜き結果は <canvas> で書き出した JPEG の Blob として呼び出し元に渡す。
 */
export function ImageCropModal({
  file,
  aspect = 16 / 9,
  onCropped,
  onCancel,
}: {
  file: File;
  aspect?: number;
  onCropped: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);

  // Blob URL は useState の初期値ではなく effect 内で作る。
  // React の Strict Mode（開発時）は effect を「実行→クリーンアップ→再実行」と
  // 二重に走らせるため、useState の初期値で作った URL だとクリーンアップで
  // 即座に revoke されてしまい、画像が表示されなくなる。
  // effect 内で作れば、再実行のたびに新しい URL が作り直されるため安全
  // （Blob URL の生成・破棄は「外部システムとの同期」であり、setState はその結果を
  // 反映しているだけなので、このケースでは effect 内での setState が正しい）。
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  }

  function handleConfirm() {
    const image = imgRef.current;
    const c = completedCrop ?? crop;
    if (!image || !c || !c.width || !c.height) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const cropWidthPx = c.width * scaleX;
    const cropHeightPx = c.height * scaleY;

    const outputWidth = Math.min(cropWidthPx, MAX_OUTPUT_WIDTH);
    const outputHeight = outputWidth / aspect;

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      c.x * scaleX,
      c.y * scaleY,
      cropWidthPx,
      cropHeightPx,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) onCropped(blob);
      },
      'image/jpeg',
      0.9,
    );
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-5 shadow-lg"
      >
        <div>
          <p className="font-bold text-slate-900">画像を切り抜く</p>
          <p className="text-sm text-slate-600">
            表示される比率（横長16:9）に合わせて範囲をドラッグして調整してください。
          </p>
        </div>

        <div className="flex justify-center bg-slate-100 p-2">
          {imgSrc && (
            <ReactCrop
              crop={crop}
              aspect={aspect}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imgSrc}
                alt=""
                onLoad={handleImageLoad}
                className="max-h-[55vh] w-auto"
              />
            </ReactCrop>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm}>この範囲で決定</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
