import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "hiwo – hier wohne ich.",
    short_name: "hiwo",
    start_url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`,
    display: "standalone",
    background_color: "#F7F6F2",
    theme_color: "#F7F6F2",
    lang: "de",
    icons: [
      { src: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
  };
}
