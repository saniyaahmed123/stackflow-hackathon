import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "./home/Navbar";
import Header from "../components/Header";
import PlatformOverview from "../components/YardlineServices";
import StatsSection from "../components/StatsSection";
import ProcessSection from "../components/ProcessSection";
import YardlineGridSection from "../components/YardlineGridSection";
import YardlineInvoiceSection from "../components/YardlineInvoiceSection";
import Footer from "../components/Footer";

export default function Home() {
  useEffect(() => {
    let active = true;

    ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.06,
      wheelMultiplier: 0.85,
      smoothWheel: true,
      syncTouch: false,
      overscroll: false,
      anchors: { offset: -80, duration: 1.4 },
      prevent: () => document.body.style.overflow === "hidden",
      respectReducedMotion: true,
      autoRaf: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    document.fonts?.ready.then(() => {
      if (active) ScrollTrigger.refresh();
    });

    return () => {
      active = false;
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white font-body text-pp-navy">
      <Navbar />
      <Header />
      <StatsSection />

      <PlatformOverview />
      <ProcessSection />
      <YardlineGridSection />
      <YardlineInvoiceSection />
      <Footer />
    </div>
  );
}
