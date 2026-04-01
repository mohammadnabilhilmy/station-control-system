'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Tag, Clock, CheckCircle, AlertTriangle, Calendar, FileImage, User, Activity } from 'lucide-react';
import Link from 'next/link';

interface ReportDetail {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved';
  created_at: string;
  location: string;
  kategori: string;
  foto_url: string | null;
}

const KATEGORI_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  unit_penjualan: { label: 'Unit Penjualan', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  unit_prasarana_sipil: { label: 'Unit Prasarana / Sipil', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  unit_pelayanan: { label: 'Unit Pelayanan', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  unit_keamanan_hse_safety: { label: 'Unit Keamanan / HSE / Safety', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
};

const SEVERITY_STYLE: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function DetailLaporanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgOpen, setImgOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.from('laporan_kendala').select('*').eq('id', id).single();
      if (!error) setReport(data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleResolve = async () => {
    if (!report) return;
    await supabase.from('laporan_kendala').update({ status: 'resolved' }).eq('id', report.id);
    setReport({ ...report, status: 'resolved' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-slate-400 font-black text-sm uppercase tracking-widest animate-pulse">Memuat data laporan...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-4">
        <AlertTriangle
          size={40}
          className="text-red-400"
        />
        <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Laporan tidak ditemukan</p>
        <Link
          href="/dashboard"
          className="text-blue-600 text-sm font-bold hover:underline"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const kat = KATEGORI_LABEL[report.kategori];
  const tanggal = new Date(report.created_at).toLocaleString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors group"
        >
          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-all">
            <ArrowLeft size={18} />
          </div>
          Kembali ke Dashboard
        </Link>

        {/* Header Card */}
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">ID Laporan: {report.id.slice(0, 8).toUpperCase()}</p>
                <h1 className="text-2xl font-black tracking-tight leading-tight">{report.title}</h1>
              </div>
              {/* Status Badge */}
              {report.status === 'resolved' ? (
                <span className="flex items-center gap-2 bg-emerald-500 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase">
                  <CheckCircle size={14} /> Selesai
                </span>
              ) : (
                <span className="flex items-center gap-2 bg-amber-500 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase animate-pulse">
                  <Clock size={14} /> Pending
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-3 pt-2">
              <span className="flex items-center gap-1.5 bg-white/10 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase">
                <MapPin size={11} /> {report.location || 'Area Stasiun'}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase">
                <Calendar size={11} /> {tanggal}
              </span>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl" />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Kategori */}
          <div className={`flex items-center gap-4 p-5 rounded-2xl border-2 bg-white ${kat?.bg ?? 'border-slate-100'}`}>
            <div className={`p-3 rounded-xl ${kat?.bg ?? 'bg-slate-50'}`}>
              <Tag
                size={20}
                className={kat?.color ?? 'text-slate-400'}
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kategori Unit</p>
              <p className={`font-black text-sm mt-0.5 ${kat?.color ?? 'text-slate-600'}`}>{kat?.label ?? report.kategori ?? '—'}</p>
            </div>
          </div>

          {/* Urgensi */}
          <div className={`flex items-center gap-4 p-5 rounded-2xl border-2 bg-white ${SEVERITY_STYLE[report.severity]}`}>
            <div className={`p-3 rounded-xl ${SEVERITY_STYLE[report.severity]}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tingkat Urgensi</p>
              <p className="font-black text-sm mt-0.5 capitalize">{report.severity} Priority</p>
            </div>
          </div>
        </div>

        {/* Deskripsi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <Activity size={13} /> Kronologi & Detail Lokasi
          </div>
          <p className="text-slate-700 font-medium text-sm leading-relaxed whitespace-pre-wrap">{report.description || 'Tidak ada deskripsi.'}</p>
        </div>

        {/* Foto Dokumentasi */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-7 py-5 border-b border-slate-100">
            <FileImage
              size={16}
              className="text-slate-400"
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Foto Dokumentasi</span>
          </div>

          {report.foto_url ? (
            <div className="p-6">
              <div
                className="relative rounded-2xl overflow-hidden cursor-zoom-in border border-slate-100 group"
                onClick={() => setImgOpen(true)}
              >
                <img
                  src={report.foto_url}
                  alt="Dokumentasi laporan"
                  className="w-full max-h-[420px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-800 text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-xl tracking-widest">Klik untuk perbesar</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-slate-300 gap-3">
              <FileImage size={36} />
              <p className="text-[11px] font-black uppercase tracking-widest">Tidak ada foto terlampir</p>
            </div>
          )}
        </div>

        {/* Action */}
        {report.status === 'pending' && (
          <button
            onClick={handleResolve}
            className="w-full py-5 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-slate-200 uppercase tracking-wider text-sm"
          >
            <CheckCircle size={18} /> Tandai Selesai / Close Ticket
          </button>
        )}
      </div>

      {/* ── Lightbox foto ── */}
      {imgOpen && report.foto_url && (
        <div
          className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setImgOpen(false)}
        >
          <img
            src={report.foto_url}
            alt="Foto fullscreen"
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setImgOpen(false)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
          >
            ✕ Tutup
          </button>
        </div>
      )}
    </div>
  );
}
