import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon.svg"],
      manifest: {
        name: "Fluid Document Processing System",
        short_name: "Fluid System",
        description: "Modern SPA for document processing and management",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
          {
            src: "icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/graph\.microsoft\.com/,
            handler: "NetworkFirst",
            options: {
              cacheName: "microsoft-graph-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 300,
              },
            },
          },
          {
            urlPattern: /^https:\/\/login\.microsoftonline\.com/,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});
