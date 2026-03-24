import StorefrontPageEditor from "@/components/StorefrontPageEditor";

export default async function EditStorefrontPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StorefrontPageEditor mode="edit" pageId={id} />;
}