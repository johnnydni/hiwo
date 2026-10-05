/** Base path the app is served under (e.g. "/hiwo" on GitHub Pages). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Absolute URL of an app page, for links that leave the app (invites). */
export function appUrl(path: string) {
  return `${window.location.origin}${BASE_PATH}${path}`;
}
