/** Downscale + re-encode in the browser so uploads stay small and EXIF rotation is baked in. */
export async function prepareImage(file: File, maxSide = 2048): Promise<{ blob: Blob; width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
    );
    return { blob, width, height };
  } catch {
    // Format the browser can't decode (e.g. HEIC on desktop Chrome): upload as is.
    return { blob: file, width: 0, height: 0 };
  }
}
