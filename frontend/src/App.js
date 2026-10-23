import { useEffect } from "react";
import Lenis from "lenis";
import { Toaster } from "sonner";
import "@/App.css";
import { Navbar } from "@/components/karat/Navbar";
import { Hero } from "@/components/karat/Hero";
import { Marquee } from "@/components/karat/Marquee";
import { Bento } from "@/components/karat/Bento";
import { Jewelers } from "@/components/karat/Jewelers";
import { FAQ } from "@/components/karat/FAQ";
import { FinalCTA } from "@/components/karat/FinalCTA";
import { Footer } from "@/components/karat/Footer";

function App() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, anchors: { offset: -20 } });
    let id;
    const raf = (t) => { lenis.raf(t); id = requestAnimationFrame(raf); };
    id = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(id); lenis.destroy(); };
  }, []);

  return (
    <div className="App bg-onyx">
      <Toaster position="bottom-center" theme="dark" />
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Bento />
        <Jewelers />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

export default App;
