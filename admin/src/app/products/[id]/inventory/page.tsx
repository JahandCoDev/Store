import { ProductInventoryManager } from "@/components/ProductInventoryManager";

export default async function ProductInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ProductInventoryManager productId={id} />;
}