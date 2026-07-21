import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Skyline Cycle Terminal",
    short_name: "Skyline",
    description:
      "Bitcoin & Ethereum Macro Cycle Intelligence — on-chain, macro liquidity, ETF flows, and price-structure data in one terminal.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
