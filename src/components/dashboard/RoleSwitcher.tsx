"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLES, UserRole } from "@/types/roles";
import { ShieldCheck, Layers } from "lucide-react";

export function RoleSwitcher() {
  const pathname = usePathname();

  const currentRoleKey = (Object.keys(ROLES) as UserRole[]).find((key) =>
    pathname.includes(key)
  ) || "principal";

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/60 border border-sky-500/20 backdrop-blur-md shadow-[0_0_15px_rgba(56,189,248,0.1)]">
      <div className="hidden sm:flex items-center gap-1 px-2.5 text-xs font-semibold text-sky-400">
        <Layers className="w-3.5 h-3.5" />
        <span>Switch View:</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {(Object.keys(ROLES) as UserRole[]).map((roleKey) => {
          const role = ROLES[roleKey];
          const isActive = pathname.startsWith(role.route);

          return (
            <Link
              key={roleKey}
              href={role.route}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_0_15px_rgba(56,189,248,0.35)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {roleKey.toUpperCase()}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

