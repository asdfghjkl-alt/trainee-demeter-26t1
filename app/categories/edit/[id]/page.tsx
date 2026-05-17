import EditCategoryForm from "@/components/categories/EditCategoryForm";
import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Category } from "@/database";
import connectToDatabase from "@/lib/mongodb";

export const metadata: Metadata = {
  title: "Edit Category - Rendezvous",
  description: "Edit an existing category",
};

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  // Redirects user if not logged in or not admin
  if (!session || !session.userData || !session.userData.admin) {
    notFound();
  }

  // Fetch the category by ID
  await connectToDatabase();
  const { id } = await params;
  let category;
  try {
    category = await Category.findById(id);
  } catch (error) {
    // If ID is invalid format, mongoose will throw an error
    notFound();
  }

  if (!category) {
    notFound();
  }

  return (
    <EditCategoryForm
      categoryId={category._id.toString()}
      initialName={category.name}
    />
  );
}
