"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { CustomSelect } from "@/components/custom-select";
import { formatRelativeTime } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { AdminPost, CommunityGroup } from "../_types";
import { typeLabels } from "../_lib/helpers";

interface PostsTabProps {
  posts: AdminPost[];
  loading: boolean;
  courseFilter: string;
  groupFilter: string;
  groupsForFilter: CommunityGroup[];
  onGroupFilterChange: (value: string) => void;
  onTogglePin: (id: string) => void;
  onDeletePost: (id: string) => void;
  setLightboxSrc: Dispatch<SetStateAction<string | null>>;
}

export function PostsTab({
  posts,
  loading,
  courseFilter,
  groupFilter,
  groupsForFilter,
  onGroupFilterChange,
  onTogglePin,
  onDeletePost,
  setLightboxSrc,
}: PostsTabProps) {
  return (
    <>
      {courseFilter && groupsForFilter.length > 0 && (
        <div className="flex">
          <CustomSelect
            value={groupFilter}
            onChange={onGroupFilterChange}
            className="min-w-[180px]"
            options={[
              { value: "", label: "Todos os grupos" },
              ...groupsForFilter.map((g) => ({
                value: g.id,
                label: g.name,
              })),
            ]}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/5 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">
            Nenhum post na comunidade ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const typeMeta = typeLabels[post.type];
            return (
              <div
                key={post.id}
                className={`bg-white dark:bg-white/5 border rounded-xl p-5 ${
                  post.status === "PENDING"
                    ? "border-amber-400/50"
                    : post.status === "REJECTED"
                    ? "border-red-400/50"
                    : "border-gray-200 dark:border-white/5"
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <Avatar
                    src={post.user.avatarUrl}
                    name={post.user.name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-gray-900 dark:text-white font-medium text-sm">
                        {post.user.name}
                      </span>
                      {post.user.role === "ADMIN" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/30 text-primary">
                          ADMIN
                        </span>
                      )}
                      {post.pinned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                          Fixado
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${typeMeta.color}`}
                      >
                        {typeMeta.label}
                      </span>
                      {post.group && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                          {post.group.name}
                        </span>
                      )}
                      {post.status === "PENDING" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-medium">
                          Pendente
                        </span>
                      )}
                      {post.status === "REJECTED" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                          Rejeitado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      <Link
                        href={`/course/${post.course.slug}/community`}
                        className="hover:text-gray-900 dark:hover:text-white"
                      >
                        {post.course.title}
                      </Link>
                      {" · "}
                      {formatRelativeTime(new Date(post.createdAt))}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onTogglePin(post.id)}
                      title={post.pinned ? "Desafixar" : "Fixar"}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePost(post.id)}
                      title="Excluir"
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a2 2 0 012-2h4a2 2 0 012 2v3"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  className="post-content prose-lesson text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(post.content),
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "IMG") {
                      e.preventDefault();
                      setLightboxSrc((target as HTMLImageElement).src);
                    }
                  }}
                />
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>
                    <svg className="w-3.5 h-3.5 inline mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    {post._count.likes}
                  </span>
                  <span>
                    <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    {post._count.comments}
                  </span>
                  <Link
                    href={`/course/${post.course.slug}/community`}
                    className="text-primary hover:text-primary ml-auto"
                  >
                    Responder
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
