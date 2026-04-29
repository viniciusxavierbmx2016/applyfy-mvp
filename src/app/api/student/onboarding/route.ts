import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json({
    completed: !!user.studentOnboardingCompletedAt,
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { studentOnboardingCompletedAt: new Date() },
  });

  return Response.json({ completed: true });
}
