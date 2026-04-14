import { SendPayment } from '@/components/offline/SendPayment';

export const SendPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <h1 className="flex-1 text-center font-display text-xl font-semibold">Send Payment</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto">
        <SendPayment />
      </div>
    </div>
  );
};
