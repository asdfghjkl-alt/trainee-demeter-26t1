import CreateRoomForm from "@/components/rooms/CreateRoomForm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function CreateRoomPage() {
  const session = await getSession();

  // Redirect if user is not logged in at the moment
  //I think error at the moment with login so for  now leave
  //if (!session) {
  //    redirect("/auth/login");
  //}

    const user = session?.userData;

   return <CreateRoomForm user={user} />;
}