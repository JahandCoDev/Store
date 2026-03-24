import CollectionEditor from "@/components/CollectionEditor";

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CollectionEditor mode="edit" collectionId={id} />;
}