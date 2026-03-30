import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface RazorpayOrderResponse {
  method: 'RAZORPAY';
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  bookingNumber: string;
  shopName?: string;
}

interface PayAtShopResponse {
  method: 'PAY_AT_SHOP';
  status: string;
  message: string;
}

interface WalletPaymentResponse {
  method: 'WALLET';
  status: string;
  message: string;
}

interface StripeFallbackResponse {
  method: 'STRIPE';
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

export type CreatePaymentOrderResponse =
  | RazorpayOrderResponse
  | PayAtShopResponse
  | WalletPaymentResponse
  | StripeFallbackResponse;

interface VerifyRazorpayPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export function useCreatePaymentIntent() {
  return useMutation<CreatePaymentOrderResponse, Error, { bookingId: string }>({
    mutationFn: async ({ bookingId }) => {
      const { data } = await api.post('/payments/create-order', {
        bookingId,
        method: 'ONLINE',
      });
      return data;
    },
  });
}

export function useVerifyRazorpayPayment() {
  return useMutation<
    { status: string; message: string; bookingId: string },
    Error,
    VerifyRazorpayPayload
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post('/payments/verify', payload);
      return data;
    },
  });
}

export function usePayment(paymentId: string) {
  return useQuery({
    queryKey: ['payments', paymentId],
    queryFn: async () => {
      const { data } = await api.get(`/payments/${paymentId}`);
      return data;
    },
    enabled: !!paymentId,
  });
}
