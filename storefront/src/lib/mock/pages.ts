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

export function getMockPageBySlug(slug: string): MockPage | null {
  return pages.find((p) => p.slug === slug) ?? null;
}
