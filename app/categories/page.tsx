import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Category } from "@/database";
import connectToDatabase from "@/lib/mongodb";

export const metadata: Metadata = {
  title: "Category Management - Rendezvous",
  description: "Manage categories in Rendezvous",
};

export default async function CategoriesPage() {
  const session = await getSession();

  // Redirects user if not logged in or not admin
  if (!session || !session.userData || !session.userData.admin) {
    notFound();
  }

  await connectToDatabase();
  const categories = await Category.find({}).sort({ name: 1 });

  return (
    <div className="container mx-auto py-10 px-4 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Category Management</h1>
        <Link 
          href="/categories/add" 
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          + Add Category
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-[#1a1a1a]">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ID
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#111] divide-y divide-gray-200 dark:divide-gray-800">
            {categories.map((category) => (
              <tr key={category._id.toString()} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {category.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {category._id.toString()}
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No categories found. Click the button above to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
