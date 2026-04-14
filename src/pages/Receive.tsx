import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  HelpCircle,
  Loader2,
  Mail,
  Network,
  QrCode,
  Share2,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { walletAPI } from '@/services/apiClient';
import { ReceivePayment } from '@/components/offline/ReceivePayment';
import {
  buildWalletShareLink,
  buildWalletShareText,
  copyTextToClipboard,
  downloadDataUrl,
  formatWalletAddress,
} from '@/lib/wallet';

export const ReceivePage = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    loadWalletAddress();
  }, []);

  const shareText = useMemo(() => buildWalletShareText(address), [address]);
  const shareLink = useMemo(() => buildWalletShareLink(address), [address]);
  const whatsappLink = useMemo(() => `https://wa.me/?text=${encodeURIComponent(shareText)}`, [shareText]);
  const mailtoLink = useMemo(
    () => `mailto:?subject=${encodeURIComponent('My OfflinePay wallet address')}&body=${encodeURIComponent(`${shareText}\n${shareLink}`)}`,
    [shareLink, shareText],
  );

  const loadWalletAddress = async () => {
    try {
      const res = await walletAPI.getAddress();
      setAddress(res.data.data.address);
      setQrCode(res.data.data.qrCode);
    } catch (error: any) {
      toast.error(error?.message || 'Error loading wallet address.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(address);
      setCopyFeedback('Address copied!');
      toast.success('Address copied!');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to copy address.');
    }
  };

  const handleShare = async () => {
    if (!address) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'OfflinePay wallet address',
          text: `${shareText}\n${shareLink}`,
        });
        toast.success('Share options opened.');
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          setShareDialogOpen(true);
        }
      }
      return;
    }

    setShareDialogOpen(true);
  };

  const handleCopyShareLink = async () => {
    try {
      await copyTextToClipboard(shareLink);
      toast.success('Wallet share link copied.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to copy share link.');
    }
  };

  const handleDownloadQr = () => {
    try {
      downloadDataUrl(qrCode, 'offlinepay-wallet-qr.png');
      toast.success('QR code download started.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to download QR code.');
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_50%,_#f8fafc_100%)] pb-20">
      <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="flex-1 text-center font-display text-xl font-semibold text-slate-950">Receive Payment</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={40} className="mx-auto animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                <CardHeader className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.98))] text-white">
                  <div className="mb-4 inline-flex w-fit rounded-2xl bg-white/10 p-3 text-emerald-200">
                    <QrCode size={22} />
                  </div>
                  <CardTitle className="text-3xl">Share your wallet address</CardTitle>
                  <CardDescription className="max-w-2xl text-slate-200">
                    Receive CELO or cUSD by sharing your public blockchain address or the QR code below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  {qrCode && (
                    <div className="flex justify-center">
                      <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-inner">
                        <img src={qrCode} alt="Wallet QR Code" className="h-56 w-56 rounded-2xl bg-white p-3" />
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Your wallet address</p>
                    <p className="mt-3 break-all font-mono text-sm text-slate-900">{address}</p>
                    <p className="mt-2 text-xs text-slate-500">Short view: {formatWalletAddress(address)}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button onClick={handleCopy} className="h-12 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                      <Copy size={16} />
                      Copy Address
                    </Button>
                    <Button onClick={handleShare} variant="outline" className="h-12 rounded-xl border-slate-200">
                      <Share2 size={16} />
                      Share Address / QR Code
                    </Button>
                  </div>

                  {copyFeedback && (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      <CheckCircle2 size={18} />
                      <span>{copyFeedback}</span>
                    </div>
                  )}

                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                    Share this address or QR code with anyone sending funds on the Celo network.
                  </div>
                </CardContent>
              </Card>

              <ReceivePayment />
            </div>

            <div className="space-y-6">
              <Card className="border-slate-200 bg-white shadow-lg shadow-slate-200/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-slate-950">
                    <HelpCircle className="text-emerald-600" size={20} />
                    How your wallet address works
                  </CardTitle>
                  <CardDescription>
                    A quick guide for sharing your public wallet safely.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    Each user has a unique blockchain address used to send and receive crypto.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    It works like a public bank account number: safe to share for incoming payments, but not secret keys.
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                    The same address can receive both CELO and cUSD.
                  </div>
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
                    Sending on the wrong network or with the wrong token setup can result in loss, so always confirm the network first.
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-lg shadow-slate-200/50">
                <CardHeader>
                  <CardTitle className="text-slate-950">Why this matters offline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <Smartphone size={18} className="mt-0.5 text-emerald-600" />
                    <p>You can still exchange wallet details locally even when mobile data is weak or unavailable.</p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <Network size={18} className="mt-0.5 text-sky-600" />
                    <p>OfflinePay captures payment intent first, then syncs with the blockchain once connectivity returns.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="border-slate-200 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Share wallet address</DialogTitle>
            <DialogDescription>
              Native share is not available here, so you can copy the link, download the QR code, or use the manual options below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Wallet share link</p>
              <p className="mt-2 break-all font-mono text-sm text-slate-900">{shareLink}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={handleCopyShareLink} className="h-11 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                <Copy size={16} />
                Copy link
              </Button>
              <Button onClick={handleDownloadQr} variant="outline" className="h-11 rounded-xl border-slate-200">
                <Download size={16} />
                Download QR
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              >
                <Smartphone size={16} />
                Share via WhatsApp
              </a>
              <a
                href={mailtoLink}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              >
                <Mail size={16} />
                Share via Gmail
              </a>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              On supported phones, the system share sheet can open options like WhatsApp, Bluetooth, Gmail, social apps, and copy actions directly.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceivePage;
