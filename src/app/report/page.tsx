'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Send, MapPin, ClipboardList, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ReportPage() {
  const [judul, setJudul] = useState('');
  const [urgensi, setUrgensi] = useState('low');
  const [deskripsi, setDeskripsi] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('laporan_kendala').insert([
      {
        title: judul,
        description: deskripsi,
        severity: urgensi,
        location: 'Stasiun Tangerang',
        status: 'pending',
      },
    ]);

    if (error) {
      alert('Gagal: ' + error.message);
    } else {
      // Setelah berhasil, arahkan kembali ke dashboard
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const getSeverityStyle = (lvl: string) => {
    switch (lvl) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-700 ring-red-500';
      case 'medium':
        return 'bg-amber-50 border-amber-200 text-amber-700 ring-amber-500';
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-emerald-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
      {/* Tombol Kembali (Floating Above Card) */}
      <div className="w-full max-w-xl mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors group"
        >
          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-all">
            <ArrowLeft size={18} />
          </div>
          Kembali ke Dashboard
        </Link>
      </div>

      <div className="w-full max-w-xl bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100">
        {/* Top Header Card */}
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-400 rounded-lg text-slate-900">
                <AlertTriangle
                  size={24}
                  strokeWidth={2.5}
                />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">STATION REPORT</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium flex items-center gap-1">
              <MapPin size={14} /> Stasiun Tangerang — Pelaporan Kendala Realtime
            </p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-7"
        >
          {/* Input Judul */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Nama Kendala</label>
            <div className="relative group">
              <ClipboardList
                className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                size={20}
              />
              <input
                type="text"
                placeholder="Misal: AC Lobby Mati"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all text-slate-900 font-semibold shadow-sm"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Pemilihan Urgensi */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Tingkat Prioritas (EWS)</label>
            <div className="grid grid-cols-3 gap-3">
              {['low', 'medium', 'high'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setUrgensi(lvl)}
                  className={`py-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                    urgensi === lvl ? `${getSeverityStyle(lvl)} shadow-md scale-[1.02] border-transparent ring-2` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Deskripsi */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Detail Kronologi & Lokasi</label>
            <textarea
              rows={4}
              placeholder="Jelaskan detail lokasi (Sisi Timur/Barat) dan kondisi saat ini..."
              className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all text-slate-900 font-medium shadow-sm"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              required
            />
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-5 rounded-2xl font-black text-white shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2 animate-pulse">
                  <Clock size={18} /> Memproses...
                </span>
              ) : (
                <>
                  <Send
                    size={18}
                    strokeWidth={3}
                  />
                  <span>KIRIM LAPORAN SEKARANG</span>
                </>
              )}
            </button>

            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center py-2 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors uppercase tracking-tighter"
            >
              Batal dan Kembali
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
