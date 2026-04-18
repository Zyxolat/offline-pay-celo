import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import OfflinePaymentDemo from "@/components/landing/OfflinePaymentDemo";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Security from "@/components/landing/Security";
import Benefits from "@/components/landing/Benefits";
import PasskeyDemo from "@/components/landing/PasskeyDemo";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <OfflinePaymentDemo />
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
