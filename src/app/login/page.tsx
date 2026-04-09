'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, Activity, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Akses Ditolak: ' + error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      {/* BACKGROUND DECORATION (Light Glow) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-slate-800/20 blur-[100px] rounded-full"></div>

      <div className="w-full max-w-md p-4 relative z-10">
        {/* LOGO PERUSAHAAN */}
        <div className="flex justify-center mb-8">
          <div className="relative w-48 h-16">
            {/* TEMPAT LOGO: Masukkan file logo Mas ke folder public/logo.png */}
            <Image
              src="/logo.png"
              alt="KAI Commuter Logo"
              fill
              className="object-contain filter brightness-110"
              priority
            />
            {/* Jika file belum ada, ini akan jadi placeholder teks */}
            {!Image && (
              <div className="text-white font-black text-2xl italic">
                Stasiun <span className="text-blue-500">Tangerang</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl shadow-black/50">
          <div className="text-center mb-10">
            <h1 className="text-white text-2xl font-black tracking-tight mb-2">STATION CONTROL</h1>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
              <ShieldCheck
                size={14}
                className="text-blue-500"
              />{' '}
              Authorized Access Only
            </div>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-6"
          >
            {/* INPUT EMAIL */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Dinas</label>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors"
                  size={18}
                />
                <input
                  type="email"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium"
                  placeholder="staf@kci.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* INPUT PASSWORD */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors"
                  size={18}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-12 text-white outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 shadow-blue-900/20'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm tracking-widest">AUTENTIKASI...</span>
                </div>
              ) : (
                <span className="tracking-widest">MASUK SISTEM</span>
              )}
            </button>
          </form>

          {/* FOOTER */}
          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] leading-relaxed">
              Stasiun Tangerang — Operational System
              <br />© 2026 Stasiun Tangerang - bill and team all rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
