"use client";

import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user-store";
import { Avatar } from "@/components/ui/avatar";
import { getLevelForPoints } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { NotificationsBell } from "./notifications-bell";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout: logoutStore } = useUserStore();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLevel = user ? getLevelForPoints(user.points) : null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    const dest =
      user?.role === "ADMIN" ? "/admin/login" : "/producer/login";
    await fetch("/api/auth/logout", { method: "POST" });
    logoutStore();
    router.push(dest);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-[rgba(10,10,26,0.8)] backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.04]">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 -ml-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Search */}
        {user && (
          <div className="flex-1 max-w-md mx-3 sm:mx-4">
            <GlobalSearch />
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Gamification badge */}
          {user && currentLevel && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] rounded-full">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                {user.points} pts
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-600">|</span>
              <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                {currentLevel.name}
              </span>
            </div>
          )}

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Notifications */}
          {user && <NotificationsBell />}

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-all duration-200"
            >
              <Avatar
                src={user?.avatarUrl}
                name={user?.name || "U"}
                size="sm"
              />
              <span className="hidden sm:block text-sm text-gray-700 dark:text-gray-300 font-medium max-w-[120px] truncate">
                {user?.name}
              </span>
              <svg className="w-4 h-4 text-gray-500 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#0f0f1e] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-2xl py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-white/[0.06]">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
                {user?.role !== "ADMIN" && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      const dest =
                        user?.role === "PRODUCER" ||
                        user?.role === "COLLABORATOR"
                          ? "/producer/profile"
                          : "/profile";
                      router.push(dest);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors duration-200"
                  >
                    Meu Perfil
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors duration-200"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
