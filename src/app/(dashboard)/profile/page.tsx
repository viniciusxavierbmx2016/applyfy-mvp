"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUserStore } from "@/stores/user-store";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ProgressBar } from "@/components/progress-bar";
import { getLevelForPoints, getNextLevel } from "@/lib/utils";

interface ProfileCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

export default function ProfilePage() {
  const { user, isLoading } = useUserStore();
  const [courses, setCourses] = useState<ProfileCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    fetch("/api/profile/stats")
      .then((r) => (r.ok ? r.json() : { courses: [] }))
      .then((d) => setCourses(d.courses || []))
      .finally(() => setLoadingCourses(false));
  }, []);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentLevel = getLevelForPoints(user.points);
  const nextLevel = getNextLevel(user.points);
  const progressPercent = nextLevel
    ? ((user.points - currentLevel.points) /
        (nextLevel.points - currentLevel.points)) *
      100
    : 100;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Meu Perfil</h1>

      {/* Profile card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{user.email}</p>
        </div>
        <AvatarUploader />
      </div>

      <div className="mb-6">
        <ChangePasswordForm />
      </div>

      {/* Gamification card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gamificação</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl text-yellow-400">★</span>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pontos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{user.points}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Nível {currentLevel.level}</p>
            <p className="text-xl font-bold text-blue-400">
              {currentLevel.name}
            </p>
          </div>
        </div>
        {nextLevel && (
          <div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>{currentLevel.name}</span>
              <span>{nextLevel.name}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {nextLevel.points - user.points} pontos para o próximo nível
            </p>
          </div>
        )}
      </div>

      {/* Completed courses with certificate */}
      {(() => {
        const completed = courses.filter((c) => c.progress >= 100);
        if (completed.length === 0) return null;
        return (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Certificados
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Cursos concluídos — baixe seu certificado oficial.
            </p>
            <ul className="space-y-3">
              {completed.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-gray-800/40 border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {c.title}
                    </p>
                    <p className="text-xs text-green-400">
                      Concluído — {c.totalLessons} aulas
                    </p>
                  </div>
                  <a
                    href={`/api/certificates/${c.id}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                      />
                    </svg>
                    Baixar certificado
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Courses progress */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meus Cursos</h3>
        {loadingCourses ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-500 text-sm">
            Nenhum curso matriculado ainda.
          </p>
        ) : (
          <ul className="space-y-4">
            {courses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/course/${c.slug}`}
                  className="flex gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-800/50 transition"
                >
                  <div className="relative w-20 h-14 sm:w-24 sm:h-16 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {c.thumbnail ? (
                      <Image
                        src={c.thumbnail}
                        alt={c.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                        —
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {c.title}
                    </p>
                    <p className="text-xs text-gray-500 mb-1.5">
                      {c.completedLessons}/{c.totalLessons} aulas
                    </p>
                    <ProgressBar value={c.progress} showLabel />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
