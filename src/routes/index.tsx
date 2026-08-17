import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const SamvidScene = lazy(() => import("@/components/samvid/SamvidScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SAMVID — Living 3D Digital Identity Field" },
      {
        name: "description",
        content:
          "A holographic digital human inside a living 3D security field, with spatial data attributes and blockchain-backed consent connections.",
      },
      { property: "og:title", content: "SAMVID — Living 3D Digital Identity Field" },
      {
        property: "og:description",
        content:
          "Touch the digital human to unseal a volumetric security field of personal data attributes and consent-based connections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="samvid-root">
      <h1 className="sr-only">SAMVID — a living 3D digital identity field</h1>
      {mounted ? (
        <Suspense fallback={<div className="samvid-boot">initializing identity field…</div>}>
          <SamvidScene />
        </Suspense>
      ) : (
        <div className="samvid-boot">initializing identity field…</div>
      )}
    </main>
  );
}
