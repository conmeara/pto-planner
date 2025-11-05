"use client";

import React, { useState } from 'react';
import { Save, Coffee, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface SaveTabProps {
  isLoggedIn: boolean;
  email?: string;
  onSignIn: (email: string) => Promise<void>;
  onSignOut: () => void;
  onSave: () => Promise<void>;
}

const SaveTab: React.FC<SaveTabProps> = ({
  isLoggedIn,
  email,
  onSignIn,
  onSignOut,
  onSave
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    try {
      await onSignIn(emailInput);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isLoggedIn ? (
        // Not logged in - show login form
        <>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Sign in to save your PTO plan. We'll send you a magic link to your email.
          </p>
          
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
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
              className="w-full"
              disabled={isSigningIn}
            >
              {isSigningIn ? 'Sending magic link...' : 'Sign in with magic link'}
            </Button>
          </form>
        </>
      ) : (
        // Logged in - show account info
        <>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md text-sm">
            <p className="text-green-800 dark:text-green-300">
              Signed in as <strong>{email}</strong>
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save PTO Plan'}
            </Button>
            
            <Button
              variant="outline"
              onClick={onSignOut}
              className="border-gray-300 dark:border-gray-600"
            >
              Sign out
            </Button>
          </div>
        </>
      )}
      
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md text-sm">
          <p className="text-green-800 dark:text-green-300">
            {isLoggedIn ? 'Your PTO plan has been saved!' : 'Magic link sent! Check your email.'}
          </p>
        </div>
      )}
      
      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <a 
          href="https://www.buymeacoffee.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full p-2 rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-800/50 text-amber-800 dark:text-amber-300 transition-colors"
        >
          <Coffee className="h-4 w-4" />
          <span className="text-sm font-medium">Buy me a coffee</span>
        </a>
      </div>
    </div>
  );
};

export default SaveTab; 