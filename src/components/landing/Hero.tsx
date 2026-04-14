import { motion } from "framer-motion";
import { ArrowRight, Play, Smartphone, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();
  
  return (
    <section className="hero-dark relative overflow-hidden pt-20 lg:pt-0">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto relative z-10 section-padding min-h-[90vh] lg:min-h-screen flex items-center">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-xs font-medium text-primary">Built on Celo Blockchain</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight text-secondary-foreground mb-6">
              Crypto Payments{" "}
              <span className="gradient-text">Without</span>{" "}
              Internet
            </h1>

            <p className="text-lg sm:text-xl text-secondary-foreground/70 max-w-xl mb-8 leading-relaxed">
              Send and receive crypto payments even when you're offline. Transactions sync automatically to the Celo blockchain when connectivity returns.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600 font-semibold text-base px-8 h-12 rounded-lg shadow-lg transition transform hover:scale-105 gap-2"
                onClick={() => navigate('/auth/signup')}
              >
                Start Sending Payments <ArrowRight size={18} />
              </Button>
              <Button
                size="lg"
                className="border-2 border-indigo-500 text-indigo-500 hover:bg-indigo-500 hover:text-white font-semibold text-base px-8 h-12 rounded-lg transition gap-2"
                onClick={() => navigate('/learn-more')}
              >
                <Play size={16} /> Learn More
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-6 text-secondary-foreground/50 text-sm">
              <div className="flex items-center gap-2">
                <WifiOff size={16} className="text-primary" />
                <span>Works Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-primary" />
                <span>Mobile-First</span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi size={16} className="text-primary" />
                <span>Auto-Sync</span>
              </div>
            </div>
          </motion.div>

          {/* Right — Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Phone frame */}
              <div className="w-[280px] sm:w-[320px] h-[560px] sm:h-[640px] rounded-[3rem] border-4 border-secondary-foreground/20 bg-secondary/80 backdrop-blur-xl p-6 flex flex-col animate-float">
                {/* Status bar */}
                <div className="flex items-center justify-between text-secondary-foreground/60 text-xs mb-6">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <WifiOff size={12} className="text-accent" />
                    <span className="text-accent font-medium">Offline</span>
                  </div>
                </div>

                {/* App header */}
                <div className="text-center mb-8">
                  <h3 className="font-display text-lg font-bold text-secondary-foreground">zyxolat</h3>
                  <p className="text-xs text-secondary-foreground/50 mt-1">Celo Wallet</p>
                </div>

                {/* Balance */}
                <div className="bg-primary/10 rounded-2xl p-4 mb-6 text-center">
                  <p className="text-xs text-secondary-foreground/50 mb-1">Balance</p>
                  <p className="font-display text-3xl font-bold text-secondary-foreground">$2,450.00</p>
                  <p className="text-xs text-primary mt-1">≈ 3,200 CELO</p>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {["Send", "Receive", "Scan"].map((action) => (
                    <div
                      key={action}
                      className="bg-secondary-foreground/5 rounded-xl p-3 text-center"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 mx-auto mb-1.5 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      </div>
                      <p className="text-xs text-secondary-foreground/70">{action}</p>
                    </div>
                  ))}
                </div>

                {/* Pending tx */}
                <div className="bg-accent/10 rounded-xl p-3 border border-accent/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <p className="text-xs font-medium text-accent">2 transactions queued</p>
                  </div>
                  <p className="text-xs text-secondary-foreground/40 mt-1 ml-4">Will sync when online</p>
                </div>
              </div>

              {/* Glow */}
              <div className="absolute -inset-8 rounded-[4rem] bg-primary/5 blur-2xl -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
