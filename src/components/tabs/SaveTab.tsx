"use client";

import React, { useState } from 'react';
import {
  Coffee,
  Mail,
  LogOut,
  CheckCircle,
  Github,
  MailCheck,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { usePlanner } from '@/contexts/PlannerContext';
import { signInWithMagicLinkAction, signOutAction } from '@/app/actions';

const SaveTab: React.FC = () => {
  const { plannerData } = usePlanner();
  const [emailInput, setEmailInput] = useState('');
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!plannerData?.user;
  const email = plannerData?.user?.email;

  // Handle sign in with magic link
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingLink(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('email', emailInput);

      const result = await signInWithMagicLinkAction(formData);

      if ('success' in result && result.success) {
        setShowSuccess(true);
        setEmailInput('');
        setTimeout(() => setShowSuccess(false), 5000);
      } else if ('error' in result) {
        setError(result.error || 'An unknown error occurred');
      }
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setIsSendingLink(false);
    }
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
        <div className="space-y-3 rounded-3xl border border-border bg-card px-4 py-4">
          <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <div className="flex items-start gap-2 text-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <p className="font-medium">
                Your plan auto-saves on this browser—no account required.
              </p>
            </div>
            <p>
              Want your selected days and settings to travel with you? Enter your email and we&apos;ll send a password-free magic link that syncs everything securely across devices.
            </p>
          </div>
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Email address
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/80" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="!h-8 pl-8 pr-2 text-xs"
                    required
                  />
                </div>
                <Button type="submit" size="sm" className="min-w-24" disabled={isSendingLink}>
                  <MailCheck className="mr-2 h-3.5 w-3.5" />
                  {isSendingLink ? 'Sending…' : 'Send link'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                We&apos;ll email a one-time sign-in link—no password to remember.
              </p>
            </div>
          </form>
          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
              ✗ {error}
            </div>
          )}
          {showSuccess && (
            <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-primary" />
              Magic link sent! Open it on any device to sync your PTO plan.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 rounded-3xl border border-border bg-muted/60 px-4 py-4">
          <div className="flex items-center justify-between text-sm font-semibold text-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Synced account
            </div>
            <span className="text-xs text-muted-foreground">auto-save on</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Signed in as <strong className="text-foreground">{email}</strong>. We&apos;ll keep your PTO days, holidays, and settings synced everywhere you use this email.
          </p>
          <Button variant="outline" onClick={handleSignOut} size="sm">
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground">
        <div className="space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Enjoying PTO Planner?
          </span>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm" className="flex-1 opacity-50 cursor-not-allowed pointer-events-none" disabled>
              <a className="inline-flex items-center justify-center gap-1">
                <Coffee className="h-3.5 w-3.5" />
                Support
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1">
              <a href="https://github.com/conmeara/pto-planner-v3" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1">
                <Github className="h-3.5 w-3.5" />
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
