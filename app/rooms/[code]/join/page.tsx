import PreferencesForm from "@/components/join/PreferencesForm";
import { getSession } from "@/lib/session";
import { pruneGuestParticipants } from "@/lib/guest";

export default async function JoinSeq() {
  // Lazily clean up stale guest room entries from the cookie
  await pruneGuestParticipants();

  const session = await getSession();

  // Autofill name from the session payload
  const user = session?.userData ? { name: session.userData.fname } : undefined;

  // if user is logged in, pass data.
  if (session) {
    return <PreferencesForm user={user} />;
  }

  return <PreferencesForm />;
}
