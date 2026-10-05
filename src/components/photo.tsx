"use client";

import { Camera } from "lucide-react";
import { usePhotoUrl } from "./app-context";
import { PhotoPlaceholder, cx } from "./ui";

/** A private photo from the data repo, with a calm placeholder while it loads. */
export function Photo({
  path,
  alt = "",
  className,
  imgClassName,
}: {
  path: string | null | undefined;
  alt?: string;
  className?: string;
  imgClassName?: string;
}) {
  const url = usePhotoUrl(path);
  return (
    <div className={cx("relative overflow-hidden bg-line", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className={cx("animate-fade-in h-full w-full object-cover", imgClassName)} />
      ) : path ? (
        <PhotoPlaceholder className="animate-shimmer h-full w-full" />
      ) : (
        <PhotoPlaceholder className="h-full w-full">
          <span className="absolute inset-0 flex items-center justify-center text-ink/25">
            <Camera size={26} strokeWidth={1.3} aria-label="Noch kein Foto" />
          </span>
        </PhotoPlaceholder>
      )}
    </div>
  );
}
