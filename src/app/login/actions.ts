"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { loginSchema } from "@/lib/validation/auth";
import { clientKeyFromHeaders, rateLimit } from "@/lib/rate-limit";

export interface LoginState {
  error?: string;
}

// Max 5 încercări de login per IP la fiecare 5 minute.
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

/**
 * Server action de autentificare (protejat CSRF de Next). Aplică rate limiting
 * pe IP, validează cu Zod și delegă verificarea parolei către NextAuth.
 *
 * Mesajele de eroare sunt intenționat generice — nu dezvăluie dacă
 * username-ul există.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const requestHeaders = await headers();
  const key = `login:${clientKeyFromHeaders(requestHeaders)}`;
  const limit = rateLimit(key, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!limit.success) {
    return { error: "Prea multe încercări. Reîncercați peste câteva minute." };
  }

  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Date de autentificare invalide." };
  }

  try {
    // redirect:false → nu aruncă NEXT_REDIRECT; controlăm noi navigarea.
    await signIn("credentials", {
      username: parsed.data.username,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Nume de utilizator sau parolă incorecte." };
    }
    return { error: "A apărut o eroare. Reîncercați." };
  }

  // Succes: rădăcina redirecționează la home-ul rolului. redirect() aruncă
  // NEXT_REDIRECT (comportament normal) — deci în afara try/catch.
  redirect("/");
}
