// Product picture and name for a shop link. A static site cannot read shop
// pages itself (CORS), so this asks a link-preview service: microlink.io by
// default (free, no key, ~50 links a day). Only the product link is sent.

const API = process.env.NEXT_PUBLIC_LINK_PREVIEW_API ?? "https://api.microlink.io";

export type LinkPreview = { title: string | null; image: string | null };

export function looksLikeUrl(text: string) {
  return /^https?:\/\/\S+$/i.test(text.trim()) || /^www\.\S+\.\S+$/i.test(text.trim());
}

export function normalizeUrl(text: string) {
  const t = text.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "KIVIK 3er-Sofa, beige - IKEA Deutschland" → "KIVIK 3er-Sofa, beige" */
export function cleanTitle(title: string) {
  const parts = title.split(/\s+[|–—-]\s+/);
  const first = parts[0].trim();
  return (first.length >= 3 ? first : title.trim()).slice(0, 120);
}

export async function fetchPreview(url: string): Promise<LinkPreview | null> {
  try {
    const res = await fetch(`${API}/?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const body = await res.json();
    const data = body?.data ?? {};
    const image = data.image?.url ?? data.logo?.url ?? null;
    const title = typeof data.title === "string" && data.title.trim() ? cleanTitle(data.title) : null;
    return { title, image: typeof image === "string" && /^https?:\/\//.test(image) ? image : null };
  } catch {
    return null;
  }
}
