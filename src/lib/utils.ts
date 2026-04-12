import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffHour < 24) return `há ${diffHour}h`;
  if (diffDay < 30) return `há ${diffDay}d`;

  return date.toLocaleDateString("pt-BR");
}

export const GAMIFICATION = {
  POINTS: {
    COMPLETE_LESSON: 10,
    COMPLETE_MODULE: 50,
    COMPLETE_COURSE: 200,
    CREATE_POST: 5,
    RECEIVE_LIKE: 2,
  },
  LEVELS: [
    { level: 1, points: 0, name: "Iniciante" },
    { level: 2, points: 100, name: "Aprendiz" },
    { level: 3, points: 300, name: "Dedicado" },
    { level: 4, points: 600, name: "Avançado" },
    { level: 5, points: 1000, name: "Expert" },
  ],
} as const;

export function getLevelForPoints(points: number) {
  const levels = GAMIFICATION.LEVELS;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].points) return levels[i];
  }
  return levels[0];
}

interface CourseLike {
  modules: Array<{
    lessons: Array<{
      progress?: Array<{ completed: boolean }>;
    }>;
  }>;
}

export function calculateCourseProgress(course: CourseLike): number {
  const allLessons = course.modules.flatMap((m) => m.lessons);
  if (allLessons.length === 0) return 0;
  const completed = allLessons.filter((l) =>
    l.progress?.some((p) => p.completed)
  ).length;
  return (completed / allLessons.length) * 100;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export function getNextLevel(points: number) {
  const currentLevel = getLevelForPoints(points);
  const levels = GAMIFICATION.LEVELS;
  const nextIndex = levels.findIndex((l) => l.level === currentLevel.level) + 1;
  return nextIndex < levels.length ? levels[nextIndex] : null;
}
