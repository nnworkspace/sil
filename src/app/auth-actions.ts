"use server";

import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { isDemoMode } from "@/lib/demo";

/** Sign the owner out and return to the sign-in page (#119). In demo mode
 *  (local demos only) there is no session to end, so it just goes home. */
export async function signOutAction() {
  if (isDemoMode()) redirect("/");
  await signOut({ redirectTo: "/signin" });
}
