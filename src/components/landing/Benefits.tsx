import { motion } from "framer-motion";
import { Globe, WifiOff, KeyRound, Smartphone, ShieldCheck } from "lucide-react";

const benefits = [
  { icon: Globe, title: "Financial Inclusion", description: "Bring crypto payments to the 1.4 billion unbanked adults worldwide." },
  { icon: WifiOff, title: "Low-Connectivity Ready", description: "Designed for regions where internet access is unreliable or expensive." },
  { icon: KeyRound, title: "Passwordless Auth", description: "No seed phrases, no passwords. Just your biometrics." },
  { icon: Smartphone, title: "Mobile-First Design", description: "Optimized for the devices people actually use in emerging markets." },
  { icon: ShieldCheck, title: "Blockchain Security", description: "Every payment settled on Celo — transparent, immutable, trustless." },
];

const Benefits = () => {
  return (
    <section id="benefits" className="section-padding bg-background">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Benefits</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 text-foreground">
            Real Impact for{" "}
            <span className="gradient-text">Real People</span>
          </h2>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-6">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-start gap-5 rounded-2xl border border-border bg-card p-5 lg:p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                <b.icon size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-card-foreground">{b.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{b.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
