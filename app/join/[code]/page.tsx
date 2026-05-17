import PreferencesForm from "@/components/join/PreferencesForm";
import { getSession } from "@/lib/session";

export default async function JoinSeq() {
    const session = await getSession();
    
    // Autofill name from the session payload
    const user = session?.userData
        ? { name: session.userData.fname }
        : undefined;

    // if user is logged in, pass data.
    if (session){
        return <PreferencesForm user={user} />;
    } 

    return <PreferencesForm />;
}