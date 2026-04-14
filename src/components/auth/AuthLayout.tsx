import { motion } from 'framer-motion';

export const AuthLayout = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Offline<span className="gradient-text">Pay</span>
          </h1>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8">{children}</div>
      </motion.div>
    </div>
  );
};
