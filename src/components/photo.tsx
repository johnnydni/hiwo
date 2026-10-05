"use client";

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
      ) : (
        <PhotoPlaceholder className={cx("h-full w-full", path && "animate-shimmer")} />
      )}
    </div>
  );
}
