import { useState } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, Fingerprint, Loader2, Shield, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const infoItems = [
  {
    icon: Shield,
    title: "Passkey Security",
    description:
      "Wallet credentials stay on the device and are protected by the biometric or secure unlock flow already trusted by the user.",
  },
  {
    icon: Smartphone,
    title: "WebAuthn Required",
    description:
      "Most modern phones and browsers support this flow. The user confirms with fingerprint, Face ID, or device PIN.",
  },
  {
    icon: BookOpen,
    title: "Operational Safety",
    description:
      "Offline transactions can be prepared without internet, then synchronized to Celo when connectivity is available again.",
  },
] as const;

type FlowState = "info" | "creating" | "success" | "error";

const InfoModal = ({ open, onOpenChange }: InfoModalProps) => {
  const [flowState, setFlowState] = useState<FlowState>("info");
  const [errorMessage, setErrorMessage] = useState("");

  const handleClose = (value: boolean) => {
    if (!value) {
      window.setTimeout(() => setFlowState("info"), 250);
    }

    onOpenChange(value);
  };

  const handleCreateWallet = async () => {
    setFlowState("creating");

    if (!window.PublicKeyCredential) {
      setErrorMessage("This browser does not support WebAuthn. Please switch to a modern browser and try again.");
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
          rp: { name: "zyxolat", id: window.location.hostname },
          user: {
            id: userId,
            name: `user-${Date.now()}@zyxolat.io`,
            displayName: "zyxolat User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
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
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Passkey creation was cancelled or could not be completed.");
      setFlowState("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="modal-fintech sm:max-w-xl">
        <AnimatePresence mode="wait">
          {flowState === "info" ? (
            <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <DialogHeader>
                <DialogTitle>Create Your Wallet</DialogTitle>
                <DialogDescription>Secure onboarding for passkey-based wallet access.</DialogDescription>
              </DialogHeader>

              <div className="modal-fintech__list">
                {infoItems.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="modal-fintech__item">
                    <div className="modal-fintech__icon">
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="modal-fintech__item-title">{title}</div>
                      <div className="modal-fintech__item-copy">{description}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="fintech-actions modal-fintech__actions">
                <Button onClick={() => void handleCreateWallet()}>
                  <Fingerprint size={18} />
                  Create Wallet with Passkey
                </Button>
              </div>
            </motion.div>
          ) : null}

          {flowState === "creating" ? (
            <motion.div
              key="creating"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="modal-fintech__state"
            >
              <div className="modal-fintech__state-icon modal-fintech__state-icon--loading">
                <Loader2 size={34} className="status-chip__spinner" />
              </div>
              <h3 className="flow-card__title">Creating your secure wallet</h3>
              <p className="modal-fintech__state-copy">Complete the biometric or passkey prompt on the device to finish setup.</p>
            </motion.div>
          ) : null}

          {flowState === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="modal-fintech__state"
            >
              <div className="modal-fintech__state-icon modal-fintech__state-icon--success">
                <CheckCircle2 size={34} />
              </div>
              <h3 className="flow-card__title">Wallet created</h3>
              <p className="modal-fintech__state-copy">
                Your passkey is now tied to this device, and the app is ready for secure offline payment flows.
              </p>
              <div className="fintech-actions modal-fintech__actions modal-fintech__actions--center">
                <Button onClick={() => handleClose(false)}>Get Started</Button>
              </div>
            </motion.div>
          ) : null}

          {flowState === "error" ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="modal-fintech__state"
            >
              <div className="modal-fintech__state-icon modal-fintech__state-icon--error">
                <AlertTriangle size={34} />
              </div>
              <h3 className="flow-card__title">Passkey setup failed</h3>
              <p className="modal-fintech__state-copy">{errorMessage}</p>
              <div className="fintech-actions modal-fintech__actions modal-fintech__actions--center">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setErrorMessage("");
                    setFlowState("info");
                  }}
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default InfoModal;
