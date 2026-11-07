"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { 
  motion, 
  useScroll, 
  useTransform, 
  useSpring, 
  useMotionValue 
} from "framer-motion";
import { 
  Sparkles, 
  ArrowRight, 
  QrCode, 
  MapPin, 
  ShieldCheck, 
  Users, 
  Smartphone, 
  TrendingUp, 
  CheckCircle2, 
  Zap,
  Activity,
  Layers,
  Radio,
  Lock
} from "lucide-react";

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Scroll-driven animations with Framer Motion
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Parallax and 3D rotations driven by scroll
  const heroRotateX = useTransform(smoothProgress, [0, 0.6], [12, -2]);
  const heroRotateY = useTransform(smoothProgress, [0, 0.6], [-8, 4]);
  const heroScale = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.04, 0.92]);
  const heroTranslateY = useTransform(smoothProgress, [0, 1], [0, -60]);
  const satelliteSpreadLeft = useTransform(smoothProgress, [0, 0.8], [0, -35]);
  const satelliteSpreadRight = useTransform(smoothProgress, [0, 0.8], [0, 35]);
  const backgroundParallax = useTransform(smoothProgress, [0, 1], [0, 120]);
  const textOpacity = useTransform(smoothProgress, [0, 0.75], [1, 0.3]);

  // 2. Interactive Mouse 3D Tilt Tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 150, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 25 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x * 20); // max 10 deg tilt
      mouseY.set(-y * 20);
    }
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[92vh] pt-12 pb-24 md:pt-20 md:pb-36 overflow-hidden bg-grid-tech flex items-center"
    >
      {/* Background Animated Ambient Lights with Scroll Parallax */}
      <motion.div
        style={{ y: backgroundParallax }}
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-sky-600/20 via-blue-600/25 to-indigo-600/15 rounded-full blur-[100px] opacity-75" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-cyan-400/15 rounded-full blur-[80px]" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/15 rounded-full blur-[90px]" />
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Hero Text Content */}
          <motion.div
            style={{ opacity: textOpacity }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
          >
            {/* Glowing Innovation Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-sky-400/30 text-xs font-semibold text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              <span>Scroll-Driven 3D Campus OS</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-cyan-400 font-mono">PWA Enabled</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]">
              Next-Gen College <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-400 to-cyan-300 neon-text-glow">
                Management & Attendance
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Eliminate proxy attendance forever. Built with dynamic anti-proxy QR codes, geofenced GPS verification, and isolated dashboards for Principal, HOD, Teacher, and Student.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm sm:text-base font-bold text-white bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_35px_rgba(56,189,248,0.45)] hover:shadow-[0_0_50px_rgba(56,189,248,0.7)] transition-all cursor-pointer"
              >
                <span>Launch Role Portals</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </Link>

              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm sm:text-base font-semibold text-slate-200 hover:text-white glass-card hover:bg-slate-800/60 border border-white/15 hover:border-sky-400/40 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Clerk Auth Sign In</span>
              </Link>
            </div>

            {/* Micro Highlights */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/10 max-w-lg mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <div className="text-2xl font-black text-white">99.8%</div>
                <div className="text-xs text-sky-300/80">Anti-Proxy Accuracy</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-black text-white">4 Portals</div>
                <div className="text-xs text-sky-300/80">Role Isolated</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-black text-white">Instant PWA</div>
                <div className="text-xs text-sky-300/80">No Play Store Req.</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Scroll-Driven 3D Animated Hero Composition */}
          <div className="lg:col-span-6 relative flex items-center justify-center [perspective:1400px]">
            {/* Main Interactive 3D Card Stage */}
            <motion.div
              style={{
                rotateX: heroRotateX,
                rotateY: heroRotateY,
                scale: heroScale,
                y: heroTranslateY,
              }}
              className="relative w-full max-w-lg transition-transform duration-100 ease-out [transform-style:preserve-3d]"
            >
              {/* Central Holographic Attendance Terminal Card */}
              <div className="p-6 sm:p-7 rounded-3xl glass-card border border-sky-400/40 shadow-[0_25px_60px_rgba(2,132,199,0.35)] relative overflow-hidden backdrop-blur-2xl">
                {/* Specular Light Bar */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                {/* Card Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        Live Attendance Station <Sparkles className="w-3 h-3 text-sky-400" />
                      </h4>
                      <p className="text-[11px] text-sky-300 font-mono">CSE Block &bull; Hall CS-301</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    REAL-TIME SYNC
                  </span>
                </div>

                {/* Main Visual Center: Circular Progress & Laser QR Scanner */}
                <div className="my-5 p-5 rounded-2xl bg-slate-900/80 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* Attendance Gauge */}
                  <div className="text-center sm:text-left">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Overall Session Attendance
                    </span>
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-200 to-sky-400 mt-0.5">
                      94.2%
                    </div>
                    <div className="text-xs text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>58 of 62 Students Checked In</span>
                    </div>
                  </div>

                  {/* Dynamic QR Scanner Simulation Box with Laser Scan line */}
                  <div className="relative w-28 h-28 p-2 rounded-2xl bg-slate-950 border border-sky-500/30 flex items-center justify-center shadow-inner overflow-hidden shrink-0">
                    <QrCode className="w-20 h-20 text-sky-400" />
                    
                    {/* Animated Laser Scan Bar */}
                    <motion.div
                      animate={{ y: [-38, 38, -38] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8]"
                    />
                  </div>
                </div>

                {/* Geofence GPS Distance Slider */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <span>Geofenced Coordinate Lock</span>
                    </span>
                    <span className="text-emerald-400 font-bold">&le; 25m Precision Verified</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden p-0.5">
                    <div className="bg-gradient-to-r from-sky-400 via-blue-500 to-emerald-400 h-full rounded-full w-[94%]" />
                  </div>
                </div>

                {/* Footer Micro Status */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Token TTL: <strong className="text-slate-200 font-mono">14s</strong> (Anti-Proxy)
                  </span>
                  <Link href="/dashboard/teacher" className="text-sky-400 hover:text-sky-300 font-semibold">
                    Open Console &rarr;
                  </Link>
                </div>
              </div>

              {/* Satellite Card 1: Top Right - HOD / Principal Institutional Pulse */}
              <motion.div
                style={{ x: satelliteSpreadRight }}
                animate={{ y: [-6, 6, -6] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="hidden sm:flex absolute -top-8 -right-8 p-4 rounded-2xl glass-card border border-purple-400/40 shadow-[0_0_30px_rgba(168,85,247,0.3)] items-center gap-3.5 backdrop-blur-xl z-20"
              >
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-purple-300 uppercase font-mono font-bold">Faculty Status</div>
                  <div className="text-xs font-bold text-white">144 / 150 On-Duty Today</div>
                </div>
              </motion.div>

              {/* Satellite Card 2: Bottom Left - Student Safe Margin Calculator */}
              <motion.div
                style={{ x: satelliteSpreadLeft }}
                animate={{ y: [8, -8, 8] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="hidden sm:flex absolute -bottom-8 -left-8 p-4 rounded-2xl glass-card border border-sky-400/40 shadow-[0_0_30px_rgba(56,189,248,0.3)] items-center gap-3.5 backdrop-blur-xl z-20"
              >
                <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-sky-300 uppercase font-mono font-bold">Student Eligibility</div>
                  <div className="text-xs font-bold text-white">88.5% &bull; Safe Zone (&gt;75%)</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
