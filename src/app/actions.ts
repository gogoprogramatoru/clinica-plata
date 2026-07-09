"use server";

import { signOut } from "@/auth";

/** Deconectare — invalidează sesiunea și redirecționează la login. */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
