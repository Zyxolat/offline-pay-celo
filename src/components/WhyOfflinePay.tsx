import { Clock3, ShieldCheck, Signal, Wallet } from "lucide-react";

const items = [
  {
    icon: Wallet,
    title: "Send money without internet",
    description: "Create and lock payment instructions locally so cashflow does not stop when connectivity drops.",
  },
  {
    icon: Clock3,
    title: "Claim later when online",
    description: "Recipients can come back after reconnecting and withdraw only once the unlock timer has fully elapsed.",
  },
  {
    icon: ShieldCheck,
    title: "Time-lock prevents fraud",
    description: "A visible unlock window adds confidence and reduces rushed transfers or premature redemption.",
  },
  {
    icon: Signal,
    title: "Built for low-connectivity regions",
    description: "Designed for field teams, merchants, and communities where stable internet cannot be assumed.",
  },
] as const;

export const WhyOfflinePay = () => {
  return (
    <section className="offlinepay-why-section">
      <div className="offlinepay-section-heading offlinepay-section-heading--center">
        <p className="offlinepay-eyebrow">Why OfflinePay</p>
        <h2>Built for real-world payment conditions</h2>
        <p>Offline-first money movement should still feel secure, elegant, and trustworthy at every step.</p>
      </div>

      <div className="offlinepay-why-grid">
        {items.map(({ description, icon: Icon, title }) => (
          <article key={title} className="offlinepay-why-card">
            <div className="offlinepay-why-card__icon">
              <Icon size={20} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default WhyOfflinePay;
