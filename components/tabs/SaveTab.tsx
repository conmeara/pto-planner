"use client";

import React, { useState } from 'react';
import { Coffee, Mail, LogOut, CheckCircle } from 'lucide-react';
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
    <div className="space-y-4">
      {!isLoggedIn ? (
        // Not logged in - show local storage info + signup option
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-sm mb-4">
            <p className="text-blue-800 dark:text-blue-300 font-semibold mb-2">
              💾 Your data is saved locally
            </p>
            <p className="text-blue-700 dark:text-blue-400">
              Everything you've planned is saved on this device. Want to access it from other devices?
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              <strong>Create a free account</strong> to sync your PTO plan across all your devices. We'll send you a magic link - no password needed!
            </p>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="pl-8"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isSigningIn}
              >
                <Mail className="mr-2 h-4 w-4" />
                {isSigningIn ? 'Sending magic link...' : 'Create Account & Sync Data'}
              </Button>
            </form>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-sm mt-4">
                <p className="text-red-800 dark:text-red-300">
                  ✗ {error}
                </p>
              </div>
            )}

            {showSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md text-sm mt-4">
                <p className="text-green-800 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Magic link sent! Check your email to complete signup and sync your data.</span>
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        // Logged in - show account info
        <>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                You're signed in!
              </p>
            </div>
            <p className="text-sm text-green-700 dark:text-green-400">
              Signed in as <strong>{email}</strong>
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm">
            <p className="text-blue-800 dark:text-blue-300">
              💾 Your PTO selections are automatically saved as you make changes.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full border-gray-300 dark:border-gray-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </>
      )}

      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
          Enjoying PTO Planner? Support the project!
        </p>
        <a
          href="https://www.buymeacoffee.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full p-3 rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-800/50 text-amber-800 dark:text-amber-300 transition-colors"
        >
          <Coffee className="h-5 w-5" />
          <span className="text-sm font-medium">Buy me a coffee ☕</span>
        </a>
      </div>
    </div>
  );
};

export default SaveTab; 