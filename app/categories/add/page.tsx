import AddCategoryForm from "@/components/categories/AddCategoryForm";
import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Category - Rendezvous",
  description: "Add a new category to Rendezvous",
};

export default async function AddCategoryPage() {
  const session = await getSession();

  // Redirects user if not logged in or not admin
  if (!session || !session.userData || !session.userData.admin) {
    notFound();
  }

  return <AddCategoryForm />;
}
