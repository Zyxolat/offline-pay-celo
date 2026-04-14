import { motion } from "framer-motion";
import { Fingerprint, Send, Smartphone, Wifi } from "lucide-react";

const steps = [
  {
    icon: Fingerprint,
    number: "01",
    title: "Login with Passkey",
    description: "Authenticate securely using biometrics — fingerprint or face recognition. No passwords needed.",
  },
  {
    icon: Send,
    number: "02",
    title: "Send Payment Offline",
    description: "Create and authorize a crypto payment even without an internet connection.",
  },
  {
    icon: Smartphone,
    number: "03",
    title: "Stored Locally",
    description: "Your transaction is cryptographically signed and stored safely on your device.",
  },
  {
    icon: Wifi,
    number: "04",
    title: "Auto-Sync to Celo",
    description: "Once internet returns, the payment is automatically broadcast to the Celo blockchain.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="section-padding bg-muted/50">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">How It Works</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 text-foreground">
            Four Simple Steps
          </h2>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            From login to blockchain confirmation, everything works seamlessly — even offline.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="relative text-center"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-border" />
              )}

              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 relative">
                <step.icon size={32} className="text-primary" />
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {step.number}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
