"use client";

import React from "react";
import { 
  QrCode, 
  MapPin, 
  ShieldCheck, 
  BellRing, 
  Smartphone, 
  Layers, 
  Sparkles,
  BarChart3
} from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: QrCode,
      title: "Dynamic Anti-Proxy QR",
      description: "Attendance QR codes rotate automatically every 15-30 seconds with encrypted tokens, preventing students from screenshotting or sharing codes across chats.",
      badge: "Anti-Cheating Engine",
      glow: "rgba(56, 189, 248, 0.3)",
      color: "from-sky-500 to-blue-600",
    },
    {
      icon: MapPin,
      title: "Geofenced GPS Validation",
      description: "Locks attendance submission strictly within physical classroom or lecture hall coordinates, eliminating fake check-ins from hostel rooms or outside campus.",
      badge: "Precision Radius",
      glow: "rgba(6, 182, 212, 0.3)",
      color: "from-cyan-500 to-teal-600",
    },
    {
      icon: Layers,
      title: "4-Tier Role Isolation",
      description: "Dedicated interfaces tailored for Principal oversight, HOD departmental control, Teacher classroom conduction, and Student transparency.",
      badge: "Role-Based Access",
      glow: "rgba(168, 85, 247, 0.3)",
      color: "from-purple-500 to-indigo-600",
    },
    {
      icon: BellRing,
      title: "Automated Defaulter Alerts",
      description: "Instant triggers when student attendance drops below 75%, generating institutional warning letters, SMS alerts, and parent notification reports.",
      badge: "Automated Triggers",
      glow: "rgba(245, 158, 11, 0.3)",
      color: "from-amber-500 to-orange-600",
    },
    {
      icon: Smartphone,
      title: "Zero-Store PWA Install",
      description: "Installable directly via any mobile or desktop browser link without Google Play Store approval or delays, featuring offline caching and native app feel.",
      badge: "Universal Web App",
      glow: "rgba(16, 185, 129, 0.3)",
      color: "from-emerald-500 to-teal-600",
    },
    {
      icon: BarChart3,
      title: "Real-Time Cloud Ledger",
      description: "Instant synchronization across departments with zero delay, high-speed export to Excel/CSV, and auditable academic compliance records.",
      badge: "Audit Ready",
      glow: "rgba(59, 130, 246, 0.3)",
      color: "from-blue-600 to-sky-500",
    },
  ];

  return (
    <section id="features" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 backdrop-blur-md mb-4 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Precision Engineering</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Designed for Modern Academic Institutions
          </h2>
          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Every feature is built around the modern 3D Glassmorphism interface, providing smooth animations, intuitive dashboards, and enterprise-grade anti-proxy security.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div
                key={index}
                className="group relative p-7 rounded-3xl glass-card glass-card-interactive glass-specular border border-slate-200 dark:border-white/10 hover:border-sky-400/50 flex flex-col justify-between"
              >
                {/* Ambient glow in card background */}
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
                  style={{ backgroundColor: feat.glow }}
                />

                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`p-3.5 rounded-2xl bg-gradient-to-tr ${feat.color} text-white shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-sky-500/10 dark:bg-white/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 dark:border-white/10 backdrop-blur-md">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>Integrated with Clerk & MongoDB Architecture</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

