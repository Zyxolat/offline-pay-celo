import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type DemoMode = "login" | "payment";
type DemoState = "idle" | "authenticating" | "success";

const PasskeyDemo = () => {
  const [mode, setMode] = useState<DemoMode>("login");
  const [state, setState] = useState<DemoState>("idle");

  const handleAuth = async () => {
    setState("authenticating");

    // Attempt real WebAuthn if supported, otherwise simulate
    if (window.PublicKeyCredential) {
      try {
        // This will likely fail without a real server, but shows the browser prompt
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        if (mode === "login") {
          await navigator.credentials.get({
            publicKey: {
              challenge,
              timeout: 60000,
              rpId: window.location.hostname,
              userVerification: "preferred",
            },
          });
        } else {
          await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: "zyxolat" },
              user: {
                id: new Uint8Array(16),
                name: "demo@zyxolat.io",
                displayName: "Demo User",
              },
              pubKeyCredParams: [{ alg: -7, type: "public-key" }],
              timeout: 60000,
              authenticatorSelection: { userVerification: "preferred" },
            },
          });
        }
        setState("success");
      } catch {
        // Simulate success on rejection for demo purposes
        await new Promise((r) => setTimeout(r, 1500));
        setState("success");
      }
    } else {
      await new Promise((r) => setTimeout(r, 1500));
      setState("success");
    }

    setTimeout(() => setState("idle"), 3000);
  };

  return (
    <section className="section-padding bg-background">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Live Demo</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 text-foreground">
            Try <span className="gradient-text">Passkey</span> Authentication
          </h2>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            Experience passwordless login and payment authorization right in your browser.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md mx-auto"
        >
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-muted p-1 mb-8">
            {(["login", "payment"] as DemoMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setState("idle"); }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Passkey Login" : "Payment Auth"}
              </button>
            ))}
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--card-glow)" }}>
            <AnimatePresence mode="wait">
              {state === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {mode === "login" ? (
                    <>
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                        <Fingerprint size={40} className="text-primary" />
                      </div>
                      <h3 className="font-display text-xl font-semibold text-card-foreground mb-2">Login with Passkey</h3>
                      <p className="text-sm text-muted-foreground mb-6">Use biometrics to authenticate securely.</p>
                      <Button onClick={handleAuth} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold w-full h-12 rounded-xl gap-2">
                        <Fingerprint size={18} /> Authenticate with Passkey
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                        <Send size={36} className="text-accent" />
                      </div>
                      <h3 className="font-display text-xl font-semibold text-card-foreground mb-1">Confirm Payment</h3>
                      <p className="text-sm text-muted-foreground mb-4">Authorize with biometrics to send:</p>
                      <div className="bg-muted rounded-xl p-4 mb-6">
                        <p className="font-display text-2xl font-bold text-foreground">25.00 cUSD</p>
                        <p className="text-xs text-muted-foreground mt-1">To: 0x1a2b…9f3c</p>
                      </div>
                      <Button onClick={handleAuth} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold w-full h-12 rounded-xl gap-2">
                        <ShieldCheck size={18} /> Confirm with Passkey
                      </Button>
                    </>
                  )}
                </motion.div>
              )}

              {state === "authenticating" && (
                <motion.div
                  key="auth"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 animate-pulse-glow">
                    <Loader2 size={36} className="text-primary animate-spin" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-card-foreground">
                    {mode === "login" ? "Verifying identity…" : "Authorizing payment…"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">Complete biometric verification on your device.</p>
                </motion.div>
              )}

              {state === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 size={40} className="text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-card-foreground">
                    {mode === "login" ? "Authenticated!" : "Payment Authorized!"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {mode === "login"
                      ? "You're securely logged into zyxolat OfflinePay."
                      : "25.00 cUSD queued for blockchain sync."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PasskeyDemo;
