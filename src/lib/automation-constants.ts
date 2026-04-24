import { prisma } from "@/lib/prisma";

export const TAG_COLORS: Record<string, string> = {
  LESSON_COMPLETED: "#10b981",
  MODULE_COMPLETED: "#3b82f6",
  COURSE_COMPLETED: "#8b5cf6",
  QUIZ_PASSED: "#f59e0b",
  STUDENT_ENROLLED: "#06b6d4",
  STUDENT_INACTIVE: "#ef4444",
  STUDENT_NEVER_ACCESSED: "#f97316",
  PROGRESS_BELOW: "#ec4899",
  PROGRESS_ABOVE: "#14b8a6",
  MODULE_NOT_STARTED: "#a855f7",
  HAS_TAG: "#7c3aed",
};

export async function autoTagStudent(
  workspaceId: string,
  userId: string,
  triggerType: string,
  automationName: string
): Promise<void> {
  try {
    const tagName = `auto:${automationName}`;
    const color = TAG_COLORS[triggerType] || "#6366f1";
    const tag = await prisma.tag.upsert({
      where: { workspaceId_name: { workspaceId, name: tagName } },
      create: { workspaceId, name: tagName, color, autoSource: "automation" },
      update: {},
    });
    await prisma.userTag.upsert({
      where: { userId_tagId: { userId, tagId: tag.id } },
      create: { userId, tagId: tag.id },
      update: {},
    });
  } catch {
    // non-critical
  }
}
