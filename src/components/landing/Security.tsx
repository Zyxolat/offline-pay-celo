import { motion } from "framer-motion";
import { Shield, Fingerprint, Lock, CheckCircle2 } from "lucide-react";

const securityPoints = [
  {
    icon: Fingerprint,
    title: "Passkey Protection",
    description: "Passkeys use public-key cryptography bound to your device. No shared secrets that can be phished or stolen.",
  },
  {
    icon: Shield,
    title: "Biometric Payment Auth",
    description: "Every transaction requires biometric confirmation — fingerprint or face scan — before it's signed.",
  },
  {
    icon: Lock,
    title: "WebAuthn Standard",
    description: "Built on FIDO2/WebAuthn, the industry standard for passwordless authentication adopted by major platforms.",
  },
  {
    icon: CheckCircle2,
    title: "Blockchain Verified",
    description: "All transactions are cryptographically signed and verified on the Celo blockchain — tamper-proof by design.",
  },
];

const Security = () => {
  return (
    <section id="security" className="section-padding hero-dark relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Security</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 text-secondary-foreground">
            Bank-Grade Security,{" "}
            <span className="gradient-text">Zero Passwords</span>
          </h2>
          <p className="text-secondary-foreground/60 text-lg mt-4 max-w-2xl mx-auto">
            Passkeys and blockchain cryptography work together to protect every transaction.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {securityPoints.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-2xl border border-secondary-foreground/10 bg-secondary-foreground/5 backdrop-blur-sm p-6 lg:p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
                <point.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-secondary-foreground mb-2">{point.title}</h3>
              <p className="text-sm text-secondary-foreground/60 leading-relaxed">{point.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Security;
