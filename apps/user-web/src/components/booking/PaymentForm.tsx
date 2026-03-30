import React from 'react';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Alert } from '@/components/ui';
import { useVerifyRazorpayPayment } from '@/hooks';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (response: any) => void) => void;
    };
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay is only available in the browser.'));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout SDK.'));
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

interface PaymentFormProps {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
  bookingNumber: string;
  shopName?: string;
  onSuccess: () => void;
  onError?: (message: string) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  orderId,
  keyId,
  amount,
  currency,
  bookingNumber,
  shopName,
  onSuccess,
  onError,
}) => {
  const verifyPayment = useVerifyRazorpayPayment();
  const [error, setError] = React.useState<string | null>(null);
  const [succeeded, setSucceeded] = React.useState(false);

  const formatAmount = (amt: number, cur: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: cur.toUpperCase(),
    }).format(amt / 100);
  };

  const handlePay = async () => {
    try {
      setError(null);
      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error('Razorpay checkout is not available.');
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'Overline',
        description: `Booking ${bookingNumber}`,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await verifyPayment.mutateAsync(response);
          setSucceeded(true);
          onSuccess();
        },
        modal: {
          ondismiss: () => {
            setError('Payment cancelled. You can try again.');
          },
        },
      });

      razorpay.on('payment.failed', (response: any) => {
        const message = response?.error?.description || 'Payment failed. Please try again.';
        setError(message);
        onError?.(message);
      });

      razorpay.open();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to start payment.';
      setError(message);
      onError?.(message);
    }
  };

  if (!keyId) {
    return (
      <Alert variant="info">
        <AlertCircle className="w-4 h-4 mr-2 inline" />
        Online payments are not configured yet. You can pay at the counter.
      </Alert>
    );
  }

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-500">
          Your payment of {formatAmount(amount, currency)} has been processed{shopName ? ` for ${shopName}` : ''}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error">
          <AlertCircle className="w-4 h-4 mr-2 inline" />
          {error}
        </Alert>
      )}

      <Button
        type="button"
        onClick={handlePay}
        isLoading={verifyPayment.isPending}
        className="w-full"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Pay {formatAmount(amount, currency)}
      </Button>

      <p className="text-xs text-center text-gray-400">
        Secured by Razorpay. You can also pay at the counter.
      </p>
    </div>
  );
};
