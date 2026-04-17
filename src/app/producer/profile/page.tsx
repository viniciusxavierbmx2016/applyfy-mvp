"use client";

import { useUserStore } from "@/stores/user-store";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ChangePasswordForm } from "@/components/change-password-form";

export default function ProducerProfilePage() {
  const { user, isLoading } = useUserStore();

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
        Meu Perfil
      </h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {user.name}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {user.email}
          </p>
        </div>
        <AvatarUploader />
      </div>

      <div className="mb-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
