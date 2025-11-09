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
    <div className="space-y-3">
      {!isLoggedIn ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Email address
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
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
                <Button type="submit" className="bg-emerald-500 text-white hover:bg-emerald-600 min-w-24" size="sm" disabled={isSigningIn}>
                  <CheckCircle className="mr-2 h-3.5 w-3.5" />
                  {isSigningIn ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </form>
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-600 dark:border-rose-900/60 dark:bg-rose-500/15 dark:text-rose-200">
              ✗ {error}
            </div>
          )}
          {showSuccess && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/15 dark:text-emerald-200">
              <CheckCircle className="h-3.5 w-3.5" />
              Magic link on its way—check your email.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-500/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
              <CheckCircle className="h-4 w-4" />
              Synced account
            </div>
            <span className="text-xs text-emerald-600/80 dark:text-emerald-200/80">auto-save on</span>
          </div>
          <p className="text-xs text-emerald-700/90 dark:text-emerald-100">
            Signed in as <strong>{email}</strong>. Changes mirror across all devices instantly.
          </p>
          <Button variant="outline" onClick={handleSignOut} size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-700/30">
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/15 dark:text-amber-200">
        <div className="space-y-2">
          <span className="block">Enjoying PTO Planner?</span>
          <div className="flex gap-2">
            <a
              href="https://www.buymeacoffee.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-amber-600"
            >
              <Coffee className="h-3.5 w-3.5" />
              Support
            </a>
            <a
              href="https://github.com/conmeara/pto-planner-v3"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-700 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700"
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