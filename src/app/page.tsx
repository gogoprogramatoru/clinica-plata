import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/rbac";

/** Rută rădăcină: redirecționează în funcție de rol (sau la login). */
export default async function RootPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  redirect(ROLE_HOME[session.user.role]);
}
