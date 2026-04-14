import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ScanPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initCamera();
    return () => stopCamera();
  }, []);

  const initCamera = async () => {
    try {
      setLoading(true);
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to access camera. Please check permissions.');
      console.error('Camera error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleManualInput = () => {
    const address = prompt('Enter wallet address:');
    if (address) {
      navigate('/send', { state: { recipient: address } });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="flex-1 text-center font-display text-xl font-semibold">Scan QR Code</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
            <Loader2 size={40} className="animate-spin text-primary" />
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full aspect-video rounded-lg bg-black"
          />
        )}

        <Button
          onClick={handleManualInput}
          variant="outline"
          className="w-full mt-4 border-border rounded-lg h-12"
        >
          Enter Address Manually
        </Button>
      </div>
    </div>
  );
};
