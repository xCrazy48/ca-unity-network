import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "";

export const Route = createFileRoute("/api/public/sitemap")({
  loader: async () => {
    const entries = [
      { path: "/", changefreq: "weekly", priority: "1.0" },
      { path: "/auth", changefreq: "monthly", priority: "0.3" },
    ];
    const urls = entries.map(
      (e) =>
        `  <url><loc>${BASE_URL}${e.path}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`,
    );
    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...urls,
      `</urlset>`,
    ].join("\n");
    
    // In TanStack Start, loaders usually return data, but since we want a raw Response
    // for an XML feed, and this is a server route file, we should ideally use server-side 
    // response handling. However, 'server' property is being rejected, likely due to 
    // incorrect file path for a server route or type mismatch.
    // Moving it to src/routes/api/public/sitemap.ts and using 'server' should work if
    // the router is configured correctly.
    
    return new Response(xml, {
      headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
    });
  },
});
