// lib/auth-user-server.ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function getAuthUserWithRole(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true },
  });
  return user; // { id, role, name } | null
}