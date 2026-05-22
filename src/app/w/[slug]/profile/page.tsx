"use client";

import { use } from "react";
import ProfilePage from "@/app/(dashboard)/profile/page";

export default function WorkspaceProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <ProfilePage workspaceSlug={slug} />
    </div>
  );
}
