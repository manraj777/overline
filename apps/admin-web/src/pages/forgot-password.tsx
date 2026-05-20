import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = React.useState<string | null>(null);

  const [step, setStep] = React.useState<'request' | 'verify'>('request');
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = React.useState(0);
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  const otpInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier) {
      setLocalError('Please enter your email or phone number.');
      return;
    }
    setLocalError(null);
    setLocalSuccess(null);
    setIsSendingOtp(true);
    try {
      const isEmail = identifier.includes('@');
      if (isEmail) {
        await api.post('/otp/email/send', { email: identifier, purpose: 'EMAIL_LOGIN' });
      } else {
        await api.post('/otp/send', { phone: identifier, purpose: 'LOGIN' });
      }
      setStep('verify');
      setResendCountdown(60);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 0);
    } catch (err: any) {
      setLocalError(err?.message || err.response?.data?.message || 'Failed to send OTP. User may not exist.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = sanitized;
    setOtpDigits(nextDigits);

    if (sanitized && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasteData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasteData.length; i++) {
      nextDigits[i] = pasteData[i];
    }
    setOtpDigits(nextDigits);
    
    const focusIndex = Math.min(pasteData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setLocalError('Please enter a valid 6-digit OTP');
      return;
    }
    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters long');
      return;
    }

    setIsResetting(true);
    try {
      await api.post('/auth/reset-password', { identifier, otp, newPassword });
      setLocalSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setLocalError(err?.response?.data?.message || err?.message || 'Password reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password — Overline</title>
      </Head>

      <div className="min-h-screen flex overflow-hidden bg-surface">
        {/* ── Left: Visual Hero ── */}
        <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
          <div className="absolute inset-0 z-0">
            <img
              alt="Professional grooming salon"
              src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=80"
              crossOrigin="anonymous"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/90 via-primary/40 to-transparent" />
          </div>
          <div className="relative z-10 flex flex-col justify-between p-16 w-full">
            <div className="flex items-center gap-3">
              <img src="/overline-logo.png" alt="Overline" className="h-10 w-auto object-contain brightness-0 invert" />
            </div>
            <div className="max-w-md">
              <h1 className="text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                Secure your account.
              </h1>
              <p className="text-white/80 text-lg leading-relaxed">
                Follow the steps to regain access to your Overline account securely.
              </p>
            </div>
            <div className="flex items-center gap-4 text-white/60 text-sm">
              <span className="w-12 h-[1px] bg-white/30" />
              <span className="tracking-[0.2em] uppercase font-medium">Est. 2024</span>
            </div>
          </div>
        </section>

        {/* ── Right: Content Canvas ── */}
        <section className="w-full lg:w-1/2 flex flex-col bg-surface relative">
          <div className="lg:hidden p-8">
            <Link href="/" className="flex items-center gap-3">
              <img src="/overline-logo.png" alt="Overline" className="h-8 w-auto object-contain dark:invert" />
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center px-8 lg:px-24">
            <div className="w-full max-w-[440px]">
              <div className="mb-10">
                <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">
                  Reset Password
                </h2>
                <p className="text-on-surface-variant font-medium">
                  {step === 'request'
                    ? 'Enter your phone number or email to receive a secure code.'
                    : 'Enter the 6-digit code and choose a new password.'}
                </p>
              </div>

              {localError && (
                <div className="mb-6 p-4 bg-error-container/50 border border-error/20 rounded-xl text-error text-sm font-medium">
                  {localError}
                </div>
              )}
              {localSuccess && (
                <div className="mb-6 p-4 bg-primary-fixed/30 border border-primary/15 rounded-xl text-sm text-on-surface font-medium text-center">
                  {localSuccess}
                </div>
              )}

              {step === 'request' ? (
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="identifier" className="label-m3">Email or Phone</label>
                    <input
                      id="identifier"
                      type="text"
                      autoComplete="username"
                      placeholder="+91XXXXXXXXXX or name@company.com"
                      className="input-m3"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </div>
                  <div className="pt-2">
                    <Button
                      type="submit"
                      isLoading={isSendingOtp}
                      className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-button hover:shadow-button-hover active:scale-[0.97] transition-all"
                    >
                      Send Code
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-on-surface">Sent to {identifier}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('request');
                          setOtpDigits(['', '', '', '', '', '']);
                        }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Change
                      </button>
                    </div>
                    <div className="grid grid-cols-6 gap-3">
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-digit-${index}`}
                          name={`otp-digit-${index}`}
                          ref={(el) => {
                            otpInputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          onPaste={handleOtpPaste}
                          className="h-14 rounded-xl bg-surface-container-low text-center text-lg font-bold text-on-surface border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="label-m3">New Password</label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="input-m3 pr-12"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      isLoading={isResetting}
                      className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-button hover:shadow-button-hover active:scale-[0.97] transition-all"
                    >
                      Reset Password
                    </Button>
                  </div>

                  <div className="text-center text-sm text-on-surface-variant">
                    {resendCountdown > 0 ? (
                      <span>Resend code in {resendCountdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="font-bold text-primary hover:underline underline-offset-4"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </form>
              )}

              <p className="mt-8 text-center text-sm text-on-surface-variant font-medium">
                Remember your password?{' '}
                <Link href="/login" className="text-primary hover:text-primary-container hover:underline underline-offset-4 font-bold transition-all">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
