import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { SendPayment } from "@/components/offline/SendPayment";
import { Button } from "@/components/ui/button";

export const SendPage = () => {
  const navigate = useNavigate();

  return (
    <div className="fintech-page">
      <header className="fintech-header">
        <div className="fintech-header__inner">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </Button>
          <div className="fintech-header__title">Send Payment</div>
          <div className="fintech-header__spacer" />
        </div>
      </header>

      <main className="fintech-main">
        <SendPayment />
      </main>
    </div>
  );
};
