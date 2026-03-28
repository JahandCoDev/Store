import Link from "next/link";

import { resolveStorefrontHref } from "@/lib/storefront/routing";

export async function DesignGalleryPage({
  publicBasePath,
}: {
  publicBasePath: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Design Gallery</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">
          Browse the gallery of designs.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/portal")}>
            Open Design Portal
          </Link>
          <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/portal/request-custom-design")}>
            Request a custom design
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="relative w-full" style={{ paddingTop: "128.1690%" }}>
            <iframe
              title="Design Gallery"
              loading="lazy"
              className="absolute left-0 top-0 h-full w-full border-0"
              src="https://www.canva.com/design/DAGxvcb98RA/U9HTlXOlKsoFjhx86zTeaA/view?embed"
              allow="fullscreen"
              allowFullScreen
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-zinc-400">
          <a
            className="text-white hover:underline"
            href="https://www.canva.com/design/DAGxvcb98RA/U9HTlXOlKsoFjhx86zTeaA/view"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open gallery in a new tab
          </a>
        </div>
      </div>
    </div>
  );
}
