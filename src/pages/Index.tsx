import { lazy, Suspense } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Security from "@/components/landing/Security";
import Benefits from "@/components/landing/Benefits";
import PasskeyDemo from "@/components/landing/PasskeyDemo";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const OfflinePaymentDemoSection = lazy(() => import("@/components/wallet/OfflinePaymentDemoSection"));

const OfflinePaymentDemoFallback = () => (
  <section className="offlinepay-demo-section">
    <div className="offlinepay-demo-shell">
      <div className="offlinepay-demo-intro">
        <div className="offlinepay-demo-intro__copy">
          <span className="offlinepay-demo-intro__badge">Loading wallet tools</span>
          <h2>Preparing the live Celo payment demo</h2>
          <p>The wallet connection flow is loading separately so the landing page can render faster.</p>
        </div>
      </div>
    </div>
  </section>
);

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Suspense fallback={<OfflinePaymentDemoFallback />}>
        <OfflinePaymentDemoSection />
      </Suspense>
      <Features />
      <HowItWorks />
      <Security />
      <Benefits />
      <PasskeyDemo />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
