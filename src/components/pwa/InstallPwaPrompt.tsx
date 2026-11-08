"use client";

import React, { useEffect, useState } from "react";
import { Download, Sparkles, CheckCircle, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If prompt isn't directly available (e.g., iOS or already prompted), show instructions modal
      setIsOpen(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("Installation failed", err);
      setIsOpen(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>PWA Installed</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="group relative inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-xl text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 dark:text-sky-200 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 dark:border-sky-500/30 hover:border-sky-400/60 transition-all duration-300 shadow-sm dark:shadow-[0_0_15px_rgba(56,189,248,0.15)] hover:dark:shadow-[0_0_20px_rgba(56,189,248,0.35)] backdrop-blur-lg cursor-pointer"
        title="Install this web app directly without Play Store"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
        </span>
        <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 group-hover:translate-y-0.5 transition-transform" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>

      {/* Guide Modal when browser requires manual action or iOS */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-sky-500/30 shadow-2xl dark:shadow-[0_0_40px_rgba(56,189,248,0.2)] text-slate-900 dark:text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Direct Web App Installation</h3>
                <p className="text-xs text-slate-500 dark:text-sky-300/80">No Play Store or App Store required</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {isIOS ? (
                <>
                  <p>To install on your iPhone or iPad:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                    <li>Tap the <span className="text-sky-600 dark:text-sky-400 font-semibold">Share</span> button in Safari (box with up arrow).</li>
                    <li>Scroll down and tap <span className="text-sky-600 dark:text-sky-400 font-semibold">&apos;Add to Home Screen&apos;</span>.</li>
                    <li>Tap <span className="text-sky-600 dark:text-sky-400 font-semibold">Add</span> in the top-right corner.</li>
                  </ol>
                </>
              ) : (
                <>
                  <p>To install on Chrome / Edge / Android:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                    <li>Look for the <span className="text-sky-600 dark:text-sky-400 font-semibold">Install icon</span> in your browser URL bar.</li>
                    <li>Or click the three dots menu &rarr; <span className="text-sky-600 dark:text-sky-400 font-semibold">&apos;Install AcademiaSync&apos;</span>.</li>
                    <li>The app will launch directly as a native standalone application!</li>
                  </ol>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-md cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

