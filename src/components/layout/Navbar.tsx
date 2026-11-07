"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GraduationCap, Sparkles, Menu, X, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-sky-500/20 bg-white/80 dark:bg-slate-950/75 backdrop-blur-2xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-3 transition-transform hover:scale-105">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_25px_rgba(56,189,248,0.45)] border border-white/20">
            <GraduationCap className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 border-2 border-white dark:border-slate-950 shadow-sm" />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Academia</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600 dark:from-sky-400 dark:to-cyan-300">
                Sync
              </span>
              <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            </div>
            <div className="text-[10px] font-mono tracking-widest text-sky-600 dark:text-sky-400/80 -mt-0.5">
              SMART CAMPUS OS
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a
            href="#features"
            className="hover:text-sky-600 dark:hover:text-sky-300 transition-colors"
          >
            Features
          </a>
          <a
            href="#roles"
            className="hover:text-sky-600 dark:hover:text-sky-300 transition-colors"
          >
            Role Architecture
          </a>
          <a
            href="#pwa"
            className="hover:text-sky-600 dark:hover:text-sky-300 transition-colors"
          >
            Install PWA
          </a>
          <Link
            href="/dashboard"
            className="hover:text-sky-600 dark:hover:text-sky-300 transition-colors"
          >
            My Portal
          </Link>
        </nav>

        {/* Right CTA / Actions */}
        <div className="hidden sm:flex items-center gap-3.5">
          <InstallPwaPrompt />
          <ThemeToggle />

          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
          >
            Sign In
          </Link>

          <Link
            href="/dashboard"
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all cursor-pointer"
          >
            <span>Launch Portal</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden items-center gap-2">
          <InstallPwaPrompt />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-4 pt-2 pb-6 border-b border-slate-200 dark:border-sky-500/20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl space-y-3 animate-fade-in">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Features
          </a>
          <a
            href="#roles"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Role Architecture
          </a>
          <a
            href="#pwa"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Install PWA
          </a>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
            >
              Sign In with Clerk
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md"
            >
              Launch Dashboard &rarr;
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
