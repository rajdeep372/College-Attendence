import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { RoleShowcase } from "@/components/home/RoleShowcase";
import { PwaBannerSection } from "@/components/home/PwaBannerSection";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <RoleShowcase />
        <PwaBannerSection />
      </main>
      <Footer />
    </div>
  );
}
