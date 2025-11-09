"use client";

import React, { useState } from 'react';
import { Coffee, Mail, LogOut, CheckCircle, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { usePlanner } from '@/contexts/PlannerContext';
import { signInWithMagicLinkAction, signOutAction } from '@/app/actions';

const SaveTab: React.FC = () => {
  const { plannerData } = usePlanner();
  const [emailInput, setEmailInput] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!plannerData?.user;
  const email = plannerData?.user?.email;

  // Handle sign in with magic link
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
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
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setIsSigningIn(false);
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
    <div className="space-y-3 text-[hsl(var(--ghibli-forest))]">
      {!isLoggedIn ? (
        <div className="space-y-3 rounded-3xl border border-[hsl(var(--border) / 0.7)] bg-[hsl(var(--card) / 0.78)] p-4 shadow-[0_36px_90px_-48px_rgba(38,73,70,0.55)] backdrop-blur-sm">
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ghibli-forest) / 0.6)]"
              >
                Email address
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[hsl(var(--primary) / 0.5)]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="!h-8 rounded-lg border-[hsl(var(--border) / 0.7)] bg-[hsl(var(--card))] pl-8 pr-2 text-xs shadow-[0_18px_40px_-30px_rgba(38,73,70,0.45)]"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="min-w-24 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-[0_18px_40px_-30px_rgba(68,118,102,0.55)] hover:bg-[hsl(var(--secondary) / 0.9)]"
                  size="sm"
                  disabled={isSigningIn}
                >
                  <CheckCircle className="mr-2 h-3.5 w-3.5" />
                  {isSigningIn ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </form>
          {error && (
            <div className="rounded-2xl border border-[hsl(var(--destructive) / 0.4)] bg-[hsl(var(--destructive) / 0.16)] px-3 py-1.5 text-xs text-[hsl(var(--destructive))] shadow-[0_18px_40px_-30px_rgba(199,109,94,0.45)]">
              ✗ {error}
            </div>
          )}
          {showSuccess && (
            <div className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--secondary) / 0.4)] bg-[hsl(var(--secondary) / 0.2)] px-3 py-1.5 text-xs text-[hsl(var(--secondary-foreground))] shadow-[0_18px_40px_-30px_rgba(68,118,102,0.45)]">
              <CheckCircle className="h-3.5 w-3.5" />
              Magic link on its way—check your email.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-3xl border border-[hsl(var(--secondary) / 0.5)] bg-[hsl(var(--secondary) / 0.22)] p-4 shadow-[0_32px_80px_-48px_rgba(68,118,102,0.55)] backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--secondary-foreground))]">
              <CheckCircle className="h-4 w-4" />
              Synced account
            </div>
            <span className="text-xs text-[hsl(var(--secondary-foreground) / 0.7)]">auto-save on</span>
          </div>
          <p className="text-xs text-[hsl(var(--secondary-foreground) / 0.85)]">
            Signed in as <strong>{email}</strong>. Changes mirror across all devices instantly.
          </p>
          <Button
            variant="outline"
            onClick={handleSignOut}
            size="sm"
            className="border-[hsl(var(--secondary) / 0.45)] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary) / 0.2)]"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      )}

      <div className="rounded-3xl border border-[hsl(var(--accent) / 0.45)] bg-[hsl(var(--accent) / 0.22)] px-3 py-2.5 text-xs text-[hsl(var(--accent-foreground))] shadow-[0_32px_80px_-48px_rgba(189,169,90,0.45)] backdrop-blur-sm">
        <div className="space-y-2">
          <span className="block">Enjoying PTO Planner?</span>
          <div className="flex gap-2">
            <a
              href="https://www.buymeacoffee.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[hsl(var(--accent))] px-3 py-1 text-[11px] font-medium text-[hsl(var(--accent-foreground))] shadow-[0_16px_36px_-28px_rgba(189,169,90,0.55)] hover:bg-[hsl(var(--accent) / 0.9)]"
            >
              <Coffee className="h-3.5 w-3.5" />
              Support
            </a>
            <a
              href="https://github.com/conmeara/pto-planner-v3"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[hsl(var(--primary) / 0.8)] px-3 py-1 text-[11px] font-medium text-[hsl(var(--primary-foreground))] shadow-[0_16px_36px_-28px_rgba(70,118,135,0.45)] hover:bg-[hsl(var(--primary) / 0.9)]"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveTab; 