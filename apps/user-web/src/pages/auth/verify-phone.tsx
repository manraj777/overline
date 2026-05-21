import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Phone, CheckCircle, LogIn } from 'lucide-react';
import { Button, Input, Card, Alert } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useLogout, useFirebasePhoneLink } from '@/hooks/useAuth';
import api from '@/lib/api';
import {
  signInWithPhoneFirebase,
  confirmPhoneOtp,
  getFreshFirebaseIdToken,
} from '@/lib/firebase';
import type { ConfirmationResult } from 'firebase/auth';

export default function VerifyPhonePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { mutate: logoutMutate } = useLogout();

  const [phone, setPhone] = React.useState(user?.phone || '');
  const [otpCode, setOtpCode] = React.useState('');
  const [isOtpSent, setIsOtpSent] = React.useState(false);
  const [sendMethod, setSendMethod] = React.useState<'SMS' | 'WHATSAPP' | null>(null);
  const [firebaseConfirmation, setFirebaseConfirmation] = React.useState<ConfirmationResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  // shown when the phone is already linked to another account
  const [showLoginInstead, setShowLoginInstead] = React.useState(false);
  const firebasePhoneLink = useFirebasePhoneLink();

  React.useEffect(() => {
    if (user?.isPhoneVerified) {
      router.replace('/');
    }
  }, [user, router]);

  const handleSendOtp = async (method: 'SMS' | 'WHATSAPP' = 'SMS') => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Phone number must be exactly 10 digits starting with 6-9');
      return;
    }
    setError(null);
    setShowLoginInstead(false);
    setIsLoading(true);

    try {
      if (isAuthenticated && user) {
        try {
          await api.patch('/users/me', { phone });
        } catch (err: any) {
          const status = err?.response?.status;
          const msg = err?.response?.data?.message || '';
          if (
            status === 409 ||
            String(msg).toLowerCase().includes('already') ||
            String(msg).toLowerCase().includes('registered') ||
            String(msg).toLowerCase().includes('in use')
          ) {
            setError('This phone number is already registered. Please log in to that account.');
            setShowLoginInstead(true);
            setIsLoading(false);
            return;
          }
        }
      }

      setSendMethod(method);

      if (method === 'SMS') {
        const result = await signInWithPhoneFirebase(phone);
        setFirebaseConfirmation(result);
      } else {
        await api.post('/users/me/otp/send');
      }
      
      setIsOtpSent(true);
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || err?.message || 'Failed to send OTP';
      setError(msg);
      // If the error is about the number being taken, surface the login prompt
      if (
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('registered') ||
        msg.toLowerCase().includes('in use')
      ) {
        setShowLoginInstead(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      if (sendMethod === 'SMS' && firebaseConfirmation) {
        const userCredential = await confirmPhoneOtp(firebaseConfirmation, otpCode);
        const idToken = await getFreshFirebaseIdToken(userCredential);
        await firebasePhoneLink.mutateAsync({ idToken });
      } else {
        await api.post('/users/me/otp/verify', { code: otpCode });
      }
      router.replace('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Invalid or expired OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Verify Phone - Overline</title>
      </Head>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <Card variant="bordered" className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              {isOtpSent ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <Phone className="w-8 h-8 text-primary-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isOtpSent ? 'Verify your phone' : 'Add your mobile number'}
            </h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              {isOtpSent
                ? `We've sent a 6-digit code via WhatsApp to ${phone}.`
                : 'Phone verification via WhatsApp is required for bookings and communication.'}
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* "Log in instead" card shown when the phone is on another account */}
          {showLoginInstead && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <LogIn className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">This number is already registered</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    It looks like you already have an account with this number. Would you like to sign in instead?
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    logoutMutate();
                    router.replace('/auth/login');
                  }}
                >
                  Log in instead
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowLoginInstead(false);
                    setError(null);
                    setPhone('');
                    setIsOtpSent(false);
                    setOtpCode('');
                  }}
                >
                  Use different number
                </Button>
              </div>
            </div>
          )}

          <div id="recaptcha-container" className="h-0 overflow-hidden" />

          {!isOtpSent ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
              <Input
                label="Phone Number"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  onClick={() => handleSendOtp('SMS')}
                  className="w-full"
                  size="lg"
                  isLoading={isLoading && sendMethod === 'SMS'}
                  disabled={isLoading}
                >
                  Send OTP via SMS
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSendOtp('WHATSAPP')}
                  className="w-full flex items-center justify-center gap-2"
                  size="lg"
                  isLoading={isLoading && sendMethod === 'WHATSAPP'}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  Send OTP via WhatsApp
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} className="space-y-4">
              <Input
                label="OTP Code"
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-bold"
              />
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Verify &amp; Continue
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsOtpSent(false);
                  setOtpCode('');
                }}
                variant="outline"
                className="w-full"
                size="sm"
                disabled={isLoading}
              >
                Change Phone Number
              </Button>
            </form>
          )}

          {/* Always present escape hatch */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-400">
              Already verified on another account?{' '}
              <button
                onClick={() => { logoutMutate(); router.replace('/auth/login'); }}
                className="text-primary-600 font-semibold hover:underline"
              >
                Sign out &amp; log in
              </button>
            </p>
            <Link href="/" className="block text-xs text-gray-400 hover:text-gray-600">
              ← Back to home (verification required for bookings)
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
