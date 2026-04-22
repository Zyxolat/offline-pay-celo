import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Smartphone, BookOpen, Fingerprint, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const infoItems = [
  {
    icon: Shield,
    title: "Passkey Security",
    description:
      "Your wallet credentials are securely stored using Passkey technology. Private keys never leave your device and are protected by your biometrics.",
  },
  {
    icon: Smartphone,
    title: "WebAuthn Required",
    description:
      "Your device must support WebAuthn (most modern smartphones and browsers do). Authentication uses fingerprint, face recognition, or device PIN.",
  },
  {
    icon: BookOpen,
    title: "Safe Wallet Usage",
    description:
      "Never share your Passkey credentials. Always verify transaction details before confirming. Your offline transactions sync automatically when connectivity returns.",
  },
];

type FlowState = "info" | "creating" | "success" | "error";

const InfoModal = ({ open, onOpenChange }: InfoModalProps) => {
  const [flowState, setFlowState] = useState<FlowState>("info");
  const [errorMsg, setErrorMsg] = useState("");

  const handleClose = (val: boolean) => {
    if (!val) {
      setTimeout(() => setFlowState("info"), 300);
    }
    onOpenChange(val);
  };

  const handleCreateWallet = async () => {
    setFlowState("creating");

    if (!window.PublicKeyCredential) {
      setErrorMsg("Your browser does not support WebAuthn. Please use a modern browser.");
      setFlowState("error");
      return;
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "zyxolat OfflinePay", id: window.location.hostname },
          user: {
            id: userId,
            name: `user-${Date.now()}@zyxolat.io`,
            displayName: "zyxolat User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256
            { alg: -257, type: "public-key" },  // RS256
          ],
          timeout: 120000,
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            residentKey: "preferred",
            userVerification: "required",
          },
          attestation: "none",
        },
      });

      setFlowState("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Passkey creation was cancelled or failed.";
      setErrorMsg(message);
      setFlowState("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl shadow-xl">
        <AnimatePresence mode="wait">
          {flowState === "info" && (
            <motion.div
              key="info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-display text-foreground">
                  Create Your Wallet
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Before you begin, here's what you need to know.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 mt-4">
                {infoItems.map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="flex gap-4 p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon size={20} className="text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm mb-1">{title}</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleCreateWallet}
                className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12 rounded-xl gap-2"
              >
                <Fingerprint size={18} /> Create Wallet with Passkey
              </Button>
            </motion.div>
          )}

          {flowState === "creating" && (
            <motion.div
              key="creating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 animate-pulse-glow">
                <Loader2 size={36} className="text-primary animate-spin" />
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground">
                Creating your Passkey…
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Complete the biometric verification on your device.
              </p>
            </motion.div>
          )}

          {flowState === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={40} className="text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground">
                Wallet Created!
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your Passkey is securely stored on this device. You're ready to send and receive payments offline.
              </p>
              <Button
                onClick={() => handleClose(false)}
                className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 rounded-xl px-8"
              >
                Get Started
              </Button>
            </motion.div>
          )}

          {flowState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={36} className="text-destructive" />
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground">
                Passkey Setup Failed
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                {errorMsg}
              </p>
              <div className="flex gap-3 justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => { setFlowState("info"); setErrorMsg(""); }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default InfoModal;
