import React, { useState } from 'react';
import { User } from '../types';
import { cn } from '../lib/utils';
import { ShieldCheck, Lock, User as UserIcon, AlertCircle, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserSelectionProps {
  onSelect: (user: User) => void;
}

export default function UserSelection({ onSelect }: UserSelectionProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Map 'admin' username to a valid email format for Supabase Auth
    const loginEmail = email.toLowerCase() === 'admin' ? 'admin@bloomrix.com' : email;

    try {
      if (isSignUp) {
        // Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: loginEmail,
          password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Sign up failed');

        // Create user profile in 'users' table
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const initial = fullName.trim().split(' ')[0][0].toUpperCase();

        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              name: fullName || (email.toLowerCase() === 'admin' ? 'Administrator' : 'User'),
              email: loginEmail,
              color,
              initial: initial || 'A',
              role: email.toLowerCase() === 'admin' ? 'admin' : 'user',
            }
          ])
          .select()
          .single();

        if (profileError) throw profileError;
        onSelect(profileData as User);
      } else {
        // Sign In
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Sign in failed');

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;
        onSelect(profileData as User);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdmin = () => {
    setEmail('admin');
    setPassword('admin123');
    setIsSignUp(false);
  };

  return (
    <div className="min-h-screen bg-[#1A1D21] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">Bloomrix</h1>
          <p className="text-gray-400">
            {isSignUp ? 'Create an account to get started' : 'Enter your credentials to access the workspace'}
          </p>
        </div>

        <div className="bg-[#222529] p-8 rounded-2xl border border-[#303236] shadow-xl">
          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className="flex items-center p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm text-left">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              {isSignUp && (
                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-3 bg-[#1A1D21] border border-[#303236] rounded-xl text-white focus:ring-2 focus:ring-[#4A154B] focus:border-transparent transition-all outline-none"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email or Username</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="text" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin or name@company.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#1A1D21] border border-[#303236] rounded-xl text-white focus:ring-2 focus:ring-[#4A154B] focus:border-transparent transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-[#1A1D21] border border-[#303236] rounded-xl text-white focus:ring-2 focus:ring-[#4A154B] focus:border-transparent transition-all outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#4A154B] text-white font-bold rounded-xl hover:bg-[#350D36] transition-all shadow-lg active:scale-[0.98] flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#303236] flex flex-col space-y-4">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-[#4A154B] hover:text-[#350D36] font-semibold transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
            
            {!isSignUp && (
              <button 
                onClick={handleQuickAdmin}
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors flex items-center justify-center"
              >
                <ShieldCheck className="w-3 h-3 mr-1" />
                Quick Admin Login (Testing)
              </button>
            )}
          </div>
        </div>

        <div className="pt-8">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
            Internal Communication System
          </p>
        </div>
      </div>
    </div>
  );
}
