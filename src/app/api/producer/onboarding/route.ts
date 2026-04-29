import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

function getField(type: string | null) {
  return type === "course"
    ? "courseOnboardingCompletedAt"
    : "onboardingCompletedAt";
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  const field = getField(type);
  const value = (user as Record<string, unknown>)[field];

  return Response.json({
    completed: !!value,
    completedAt: value ?? null,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  let type: string | null = null;
  try {
    const body = await req.json();
    type = body?.type ?? null;
  } catch {}

  const field = getField(type);

  await prisma.user.update({
    where: { id: user.id },
    data: { [field]: new Date() },
  });

  return Response.json({ completed: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");

  if (type) {
    const field = getField(type);
    await prisma.user.update({
      where: { id: user.id },
      data: { [field]: null },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompletedAt: null,
        courseOnboardingCompletedAt: null,
      },
    });
  }

  return Response.json({ completed: false });
}
