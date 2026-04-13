import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';
import { isConfigured } from '../lib/supabase';

interface UserSelectionProps {
  onSelect: (user: User) => void;
}

export default function UserSelection({ onSelect }: UserSelectionProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isConfigured) {
      setError('Configuration Missing: Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Settings menu.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }
        onSelect(data.user);
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server returned non-JSON response (${response.status}). The backend might not be running correctly.`);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1D21] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">Bloomrix</h1>
          <p className="text-gray-400">Enter your credentials to access the workspace</p>
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
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Username or Email</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="text" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin"
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
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
