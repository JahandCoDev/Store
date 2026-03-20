export type MockProduct = {
  handle: string;
  title: string;
  description?: string;
  price: number;
};

export type MockCollection = {
  handle: string;
  title: string;
  description?: string;
  products: MockProduct[];
};

const products: MockProduct[] = [
  {
    handle: "example-tee",
    title: "Example Tee",
    description: "Placeholder product used during the Legacy → React migration.",
    price: 29.0,
  },
  {
    handle: "example-hoodie",
    title: "Example Hoodie",
    description: "Placeholder product used during the Legacy → React migration.",
    price: 59.0,
  },
];

const collections: MockCollection[] = [
  {
    handle: "all",
    title: "All Products",
    description: "Temporary collection backed by mock data.",
    products,
  },
];

export function getMockProductByHandle(handle: string): MockProduct | null {
  return products.find((p) => p.handle === handle) ?? null;
}

export function getMockCollectionByHandle(handle: string): MockCollection | null {
  return collections.find((c) => c.handle === handle) ?? null;
}
