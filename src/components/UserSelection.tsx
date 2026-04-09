import React, { useState } from 'react';
import { User } from '../types';
import { cn } from '../lib/utils';
import { ShieldCheck, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

interface UserSelectionProps {
  users: User[];
  onSelect: (user: User) => void;
}

export default function UserSelection({ users, onSelect }: UserSelectionProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      onSelect(user);
    } else {
      setError('Invalid username or password');
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
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="flex items-center p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Username</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
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
              className="w-full py-4 bg-[#4A154B] text-white font-bold rounded-xl hover:bg-[#350D36] transition-all shadow-lg active:scale-[0.98]"
            >
              Sign In
            </button>
          </form>
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
