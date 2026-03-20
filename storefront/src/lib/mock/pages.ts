export type MockPage = {
  slug: string;
  title: string;
  body: string;
};

const pages: MockPage[] = [
  {
    slug: "contact",
    title: "Contact",
    body: "Contact page placeholder. We can port the Legacy contact form and wire it to your backend once we confirm the desired submission target.",
  },
  {
    slug: "custom-apparel",
    title: "Custom Apparel",
    body: "Custom apparel page placeholder (Legacy: page.custom-apparel.json).",
  },
];

// Dev store specific pages — rendered by dedicated route handlers, not this mock list.
// These slugs are handled by /app/[store]/pages/[slug]/page.tsx which routes them
// to their own rich components. This list is the fallback for any slug not matched.
export function getMockPageBySlug(slug: string): MockPage | null {
  return pages.find((p) => p.slug === slug) ?? null;
}
