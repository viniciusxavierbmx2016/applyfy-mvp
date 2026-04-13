import { createServerSupabaseClient } from "./supabase-server";
import { prisma } from "./prisma";
import type { User } from "@prisma/client";

export async function getSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  // Use getUser() (not getSession) — it validates the JWT with the Auth server,
  // so it's reliable across middleware cookie refreshes on Vercel.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: authUser.email.toLowerCase() },
  });

  return user;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
}
