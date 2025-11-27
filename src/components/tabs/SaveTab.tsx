"use client";

import React, { useEffect, useRef, useState, useTransition } from 'react';
import {
  Coffee,
  Mail,
  LogOut,
  CheckCircle,
  Github,
  MailCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlanner } from '@/contexts/PlannerContext';
import { signInWithMagicLinkAction, signOutAction } from '@/app/actions';
import { MagicLinkRequestSchema } from '@/types';
import {
  MAGIC_LINK_STORAGE_KEY,
  MAGIC_LINK_RESEND_WINDOW_SECONDS,
} from '@/lib/auth/constants';

const SaveTab: React.FC = () => {
  const { plannerData } = usePlanner();
  const [emailInput, setEmailInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isSendingLink, startMagicLinkTransition] = useTransition();
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLoggedIn = !!plannerData?.user;
  const email = plannerData?.user?.email;

  const clearStoredCooldown = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
    }
  };

  const persistResendTimestamp = (timestamp: number) => {
    setResendAvailableAt(timestamp);
    if (typeof window !== 'undefined') {
      localStorage.setItem(MAGIC_LINK_STORAGE_KEY, timestamp.toString());
    }
  };

  const displaySuccessMessage = (message: string) => {
    setSuccessMessage(message);
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage(null);
      successTimeoutRef.current = null;
    }, 7000);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = localStorage.getItem(MAGIC_LINK_STORAGE_KEY);
    if (!stored) {
      return;
    }

    const parsed = Number.parseInt(stored, 10);
    if (!Number.isNaN(parsed) && parsed > Date.now()) {
      setResendAvailableAt(parsed);
    } else {
      clearStoredCooldown();
    }
  }, []);

  useEffect(() => {
    if (!resendAvailableAt) {
      setCooldownSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const remainingMs = resendAvailableAt - Date.now();
      if (remainingMs <= 0) {
        setCooldownSeconds(0);
        setResendAvailableAt(null);
        clearStoredCooldown();
        return;
      }
      setCooldownSeconds(Math.ceil(remainingMs / 1000));
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [resendAvailableAt]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Handle sign in with magic link
  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (cooldownSeconds > 0) {
      setError(`Please wait ${cooldownSeconds}s before requesting another magic link.`);
      return;
    }

    const parsedForm = MagicLinkRequestSchema.safeParse({ email: emailInput });
    if (!parsedForm.success) {
      setError(parsedForm.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }

    setError(null);
    startMagicLinkTransition(() => {
      const formData = new FormData();
      formData.append('email', parsedForm.data.email);

      signInWithMagicLinkAction(formData)
        .then((result) => {
          if (result.resendAvailableAt) {
            persistResendTimestamp(result.resendAvailableAt);
          }

          if (result.success) {
            displaySuccessMessage(result.message ?? 'Check your email for the magic link!');
            setEmailInput('');
          } else {
            setSuccessMessage(null);
            setError(result.error ?? 'Failed to send magic link. Please try again.');
          }
        })
        .catch((err) => {
          console.error('Sign in error:', err);
          setSuccessMessage(null);
          setError('Failed to send magic link. Please try again.');
        });
    });
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOutAction();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="space-y-4">
      {!isLoggedIn ? (
        <div className="space-y-3 rounded-3xl bg-card px-3 py-3 sm:px-4 sm:py-4">
          <form onSubmit={handleSignIn} className="space-y-2 sm:space-y-3" noValidate>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70 sm:left-3 sm:h-4 sm:w-4" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="h-9 pl-8 text-sm sm:h-10 sm:pl-9"
                  autoComplete="email"
                  aria-describedby="magic-link-helper"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSendingLink || cooldownSeconds > 0}
                className="h-9 w-full text-sm sm:h-10 sm:w-auto"
              >
                {isSendingLink ? (
                  'Sending...'
                ) : cooldownSeconds > 0 ? (
                  `Resend in ${cooldownSeconds}s`
                ) : (
                  <>
                    <MailCheck className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                    Send Magic Link
                  </>
                )}
              </Button>
            </div>
            <p id="magic-link-helper" className="text-[11px] text-muted-foreground sm:text-xs">
              We&apos;ll email you a secure sign-in link. For your safety, requests are limited to one every {MAGIC_LINK_RESEND_WINDOW_SECONDS} seconds.
            </p>
          </form>

          {error && (
            <div
              className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive sm:px-3 sm:py-2 sm:text-xs"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] text-primary sm:px-3 sm:py-2 sm:text-xs"
              role="status"
              aria-live="polite"
            >
              {successMessage}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 rounded-3xl border border-border bg-muted/60 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground sm:text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
              Synced account
            </div>
            <span className="text-[10px] text-muted-foreground sm:text-xs">auto-save on</span>
          </div>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Signed in as <strong className="text-foreground">{email}</strong>. We&apos;ll keep your PTO days, holidays, and settings synced everywhere you use this email.
          </p>
          <Button variant="outline" onClick={handleSignOut} size="sm" className="h-8 text-xs sm:h-9">
            <LogOut className="mr-1.5 h-3 w-3 sm:mr-2 sm:h-3.5 sm:w-3.5" />
            Sign out
          </Button>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card px-3 py-2.5 text-sm text-foreground sm:px-4 sm:py-3">
        <div className="space-y-2">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Enjoying PTO Planner?
          </span>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm" className="h-8 flex-1 cursor-not-allowed text-xs opacity-50 pointer-events-none sm:h-9" disabled>
              <a className="inline-flex items-center justify-center gap-1">
                <Coffee className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Support
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 flex-1 text-xs sm:h-9">
              <a href="https://github.com/conmeara/pto-planner-v3" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1">
                <Github className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveTab; 
