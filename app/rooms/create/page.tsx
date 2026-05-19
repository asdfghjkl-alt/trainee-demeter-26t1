import CreateRoomForm from "@/components/rooms/CreateRoomForm";
import { getSession } from "@/lib/session";
import connectToDatabase from "@/lib/mongodb";
import { Category } from "@/database";
import { redirect } from "next/navigation";

export default async function CreateRoomPage() {
  const session = await getSession();

  // Redirect if user is not logged in at the moment
  if (!session || !session.userData) {
    redirect("/auth/login");
  }

  const user = session?.userData;

  await connectToDatabase();
  const categoryDocs = await Category.find({}).sort({ name: 1 }).lean();
  const categories = categoryDocs.map((c: any) => ({
    _id: c._id.toString(),
    name: c.name,
  }));

  return <CreateRoomForm user={user} initialCategories={categories} />;
}
