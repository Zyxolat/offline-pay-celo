import { motion } from "framer-motion";
import { WifiOff, RefreshCw, QrCode, Wallet, Fingerprint, CircleDollarSign } from "lucide-react";

const features = [
  {
    icon: WifiOff,
    title: "Offline Transaction Queue",
    description: "Create and sign transactions without internet. Payments are securely queued on your device.",
  },
  {
    icon: RefreshCw,
    title: "Automatic Blockchain Sync",
    description: "Queued transactions are automatically submitted to the Celo blockchain once connectivity is restored.",
  },
  {
    icon: QrCode,
    title: "QR Code Payments",
    description: "Send and receive payments by scanning QR codes — no addresses to copy, no mistakes.",
  },
  {
    icon: Wallet,
    title: "Secure Wallet Integration",
    description: "Non-custodial wallet backed by the Celo blockchain. Your keys, your funds.",
  },
  {
    icon: Fingerprint,
    title: "Passkey Authentication",
    description: "Login and authorize payments with biometrics. No passwords or seed phrases to manage.",
  },
  {
    icon: CircleDollarSign,
    title: "Low-Fee Mobile Payments",
    description: "Celo's lightweight blockchain enables sub-cent transaction fees, even for micro-payments.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const Features = () => {
  return (
    <section id="features" className="section-padding bg-background">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Features</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 text-foreground">
            Everything You Need for{" "}
            <span className="gradient-text">Offline Payments</span>
          </h2>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            A full crypto payment stack designed for unreliable connectivity.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={cardVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group rounded-2xl border border-border bg-card p-6 lg:p-8 hover:shadow-lg transition-shadow"
              style={{ boxShadow: "var(--card-glow)" }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <feature.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
