'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Send, MapPin, ClipboardList, Clock, ArrowLeft, ChevronDown, Calendar, Camera, X } from 'lucide-react';
import Link from 'next/link';

const KATEGORI_OPTIONS = [
  { value: 'unit_penjualan', label: 'Unit Penjualan' },
  { value: 'unit_prasarana_sipil', label: 'Unit Prasarana / Sipil' },
  { value: 'unit_pelayanan', label: 'Unit Pelayanan' },
  { value: 'unit_keamanan_hse_safety', label: 'Unit Keamanan / HSE / Safety' },
];

export default function ReportPage() {
  const [judul, setJudul] = useState('');
  const [urgensi, setUrgensi] = useState('low');
  const [kategori, setKategori] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoError, setFotoError] = useState('');
  const [tanggalLaporan, setTanggalLaporan] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ── Realtime clock ──────────────────────────────────────────────────────────
  useEffect(() => {
    const format = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    setTanggalLaporan(format(new Date()));
    const timer = setInterval(() => setTanggalLaporan(format(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Photo handler ───────────────────────────────────────────────────────────
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFotoError('');
    if (!file) return;

    const MAX_SIZE = 1 * 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE) {
      setFotoError('Ukuran foto melebihi batas maksimum 1 MB.');
      setFoto(null);
      setFotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const hapusFoto = () => {
    setFoto(null);
    setFotoPreview(null);
    setFotoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let foto_url: string | null = null;

    // Upload foto ke Supabase Storage (bucket: "laporan-foto")
    if (foto) {
      const ext = foto.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('laporan-foto').upload(fileName, foto, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        alert('Gagal upload foto: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrl } = supabase.storage.from('laporan-foto').getPublicUrl(uploadData.path);
      foto_url = publicUrl.publicUrl;
    }

    const { error } = await supabase.from('laporan_kendala').insert([
      {
        title: judul,
        description: deskripsi,
        severity: urgensi,
        kategori: kategori,
        location: 'Stasiun Tangerang',
        status: 'pending',
        foto_url,
        created_at: new Date().toISOString(), // Simpan timestamp ISO ke DB
      },
    ]);

    if (error) {
      alert('Gagal: ' + error.message);
    } else {
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
      {/* Back button */}
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
        {/* Header */}
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
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-7"
        >
          {/* ── Tanggal & Waktu Realtime ── */}
          <div className="flex items-center gap-3 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4">
            <Calendar
              size={18}
              className="text-blue-500 shrink-0"
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tanggal & Waktu Laporan</p>
              <p className="text-slate-800 font-black text-sm tracking-tight tabular-nums">{tanggalLaporan}</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
              LIVE
            </span>
          </div>

          {/* ── Nama Kendala ── */}
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

          {/* ── Kategori Dropdown ── */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Kategori Unit</label>
            <div className="relative group">
              <ChevronDown
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={18}
              />
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                required
                className="w-full appearance-none pl-5 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all text-slate-900 font-semibold shadow-sm cursor-pointer"
              >
                <option
                  value=""
                  disabled
                >
                  Pilih kategori unit...
                </option>
                {KATEGORI_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Tingkat Prioritas ── */}
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

          {/* ── Deskripsi ── */}
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

          {/* ── Upload Foto ── */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              Foto Dokumentasi <span className="text-slate-400 normal-case font-medium">(maks. 1 MB)</span>
            </label>

            {fotoPreview ? (
              /* Preview State */
              <div className="relative rounded-2xl overflow-hidden border-2 border-slate-100">
                <img
                  src={fotoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={hapusFoto}
                  className="absolute top-3 right-3 p-1.5 bg-slate-900/70 hover:bg-red-600 text-white rounded-xl transition-colors"
                >
                  <X size={16} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-slate-900/60 backdrop-blur-sm px-4 py-2">
                  <p className="text-white text-xs font-semibold truncate">{foto?.name}</p>
                  <p className="text-slate-300 text-[10px]">{foto ? (foto.size / 1024).toFixed(1) + ' KB' : ''}</p>
                </div>
              </div>
            ) : (
              /* Upload Trigger */
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all"
              >
                <Camera size={28} />
                <span className="text-xs font-bold uppercase tracking-wider">Pilih Foto</span>
                <span className="text-[11px]">JPG, PNG, WEBP — maks. 1 MB</span>
              </button>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFotoChange}
            />

            {/* Error message */}
            {fotoError && (
              <p className="text-red-500 text-xs font-semibold ml-1 flex items-center gap-1">
                <AlertTriangle size={12} /> {fotoError}
              </p>
            )}
          </div>

          {/* ── Actions ── */}
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
