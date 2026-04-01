'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2, Clock, LayoutDashboard, TrendingUp, ShieldAlert, Activity, CheckCircle, FileDown, FileText, ClipboardList, Box, LogOut, Menu, Edit3, Trash2, Eye, Tag } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ── Interfaces ───────────────────────────────────────────────────────────────
interface Report {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved';
  created_at: string;
  location: string;
  kategori: string;
  foto_url: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const KATEGORI_LABEL: Record<string, { label: string; color: string }> = {
  unit_penjualan: { label: 'Penjualan', color: 'bg-blue-50 text-blue-700' },
  unit_prasarana_sipil: { label: 'Prasarana', color: 'bg-violet-50 text-violet-700' },
  unit_pelayanan: { label: 'Pelayanan', color: 'bg-cyan-50 text-cyan-700' },
  unit_keamanan_hse_safety: { label: 'Keamanan/HSE', color: 'bg-rose-50 text-rose-700' },
};

export default function StationControlSystem() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'pending'>('all');
  const router = useRouter();

  const fetchReports = async () => {
    const { data, error } = await supabase.from('laporan_kendala').select('*').order('created_at', { ascending: false });
    if (!error) setReports(data || []);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert('Gagal Logout: ' + error.message);
    else router.push('/login');
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus laporan "${title}"? Data tidak dapat dikembalikan.`)) return;
    const { error } = await supabase.from('laporan_kendala').delete().eq('id', id);
    if (error) alert('Gagal menghapus: ' + error.message);
    else fetchReports();
  };

  const handleEdit = (id: string) => router.push(`/report?edit=${id}`);
  const handleDetail = (id: string) => router.push(`/laporan/${id}`);
  const handleResolve = async (id: string) => {
    const { error } = await supabase.from('laporan_kendala').update({ status: 'resolved' }).eq('id', id);
    if (error) alert(error.message);
  };

  useEffect(() => {
    fetchReports();
    const channel = supabase.channel('realtime-analytics').on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_kendala' }, fetchReports).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredReports = useMemo(() => {
    if (filter === 'high') return reports.filter((r) => r.severity === 'high');
    if (filter === 'pending') return reports.filter((r) => r.status === 'pending');
    return reports;
  }, [reports, filter]);

  const stats = useMemo(() => {
    const total = reports.length;
    const highPriority = reports.filter((r) => r.severity === 'high').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    const pending = reports.filter((r) => r.status === 'pending').length;

    const chartData = reports
      .reduce((acc: any[], report) => {
        const date = new Date(report.created_at).toLocaleDateString('id-ID', { weekday: 'short' });
        const existing = acc.find((item) => item.day === date);
        if (existing) existing.count += 1;
        else acc.push({ day: date, count: 1 });
        return acc;
      }, [])
      .slice(0, 7)
      .reverse();

    return { total, highPriority, resolved, pending, chartData };
  }, [reports]);

  // ── Export ────────────────────────────────────────────────────────────────
  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('id-ID');
    doc.setFontSize(14);
    doc.text('LAPORAN KENDALA OPERASIONAL STASIUN', 14, 22);
    doc.setFontSize(10);
    doc.text(`Lokasi: Stasiun Tangerang | Tanggal: ${dateStr}`, 14, 30);
    autoTable(doc, {
      head: [['No', 'Judul', 'Kategori', 'Urgensi', 'Status', 'Tanggal']],
      body: reports.map((r, i) => [i + 1, r.title, KATEGORI_LABEL[r.kategori]?.label ?? r.kategori ?? '-', r.severity.toUpperCase(), r.status.toUpperCase(), new Date(r.created_at).toLocaleDateString('id-ID')]),
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 153] },
    });
    doc.save(`Laporan_KCI_Tangerang_${dateStr}.pdf`);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reports);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
    XLSX.writeFile(workbook, `Rekap_KCI_Tangerang_${Date.now()}.xlsx`);
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* ── Sidebar ── */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 transition-all duration-300 flex flex-col text-slate-400 p-4 z-50`}>
        <div className="flex items-center gap-3 px-2 mb-10 h-10 overflow-hidden">
          <div className="bg-blue-600 p-2 rounded-xl text-white shrink-0">
            <Activity size={20} />
          </div>
          <span className={`font-black text-white tracking-widest text-sm transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>STATION OPS</span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active
            isOpen={isSidebarOpen}
          />
          <Link href="/report">
            <SidebarItem
              icon={<ClipboardList size={20} />}
              label="Report Kendala"
              isOpen={isSidebarOpen}
            />
          </Link>
          <SidebarItem
            icon={<Box size={20} />}
            label="Coming Soon"
            isOpen={isSidebarOpen}
          />
        </nav>

        <div
          className="pt-4 border-t border-slate-800"
          onClick={handleLogout}
        >
          <SidebarItem
            icon={
              <LogOut
                size={20}
                className="text-red-400"
              />
            }
            label="Logout"
            isOpen={isSidebarOpen}
          />
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto h-screen">
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-black text-slate-800 text-xl tracking-tight uppercase">Dashboard Analytics</h1>
              <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">Stasiun Tangerang — KAI Commuter</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase border border-red-100 hover:bg-red-100 transition-colors"
            >
              <FileText size={14} /> PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase border border-emerald-100 hover:bg-emerald-100 transition-colors"
            >
              <FileDown size={14} /> EXCEL
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Temuan"
              value={stats.total}
              icon={<LayoutDashboard />}
              color="blue"
            />
            <StatCard
              title="Priority High"
              value={stats.highPriority}
              icon={<ShieldAlert />}
              color="red"
              isAlert={stats.highPriority > 0}
            />
            <StatCard
              title="Pending"
              value={stats.pending}
              icon={<Clock />}
              color="amber"
            />
            <StatCard
              title="Resolved"
              value={stats.resolved}
              icon={<CheckCircle2 />}
              color="emerald"
            />
          </div>

          {/* Chart + Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                  <TrendingUp className="text-blue-600" /> Tren Kendala
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['all', 'high', 'pending'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={stats.chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      fontSize={12}
                      fontWeight="800"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      fontSize={12}
                      fontWeight="800"
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '20px', border: 'none' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      radius={[10, 10, 0, 0]}
                      barSize={45}
                    >
                      {stats.chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.count > 5 ? '#ef4444' : '#003399'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <p className="text-blue-400 font-black text-[10px] tracking-[0.2em] uppercase mb-2">Operational Score</p>
                <h2 className="text-3xl font-black leading-tight">
                  Efisiensi
                  <br />
                  Penyelesaian
                </h2>
              </div>
              <div className="relative z-10 py-10">
                <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-500">{stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%</div>
                <p className="text-slate-400 text-sm mt-2 font-medium">Dari {stats.total} laporan</p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl" />
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">Monitoring Real-time</h3>
              <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase italic">Update Realtime Aktif</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left bg-white text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                    <th className="px-8 py-5">Detail Masalah</th>
                    <th className="px-6 py-5">Kategori Unit</th>
                    <th className="px-6 py-5 text-center">Urgensi</th>
                    <th className="px-6 py-5 text-center">Status</th>
                    <th className="px-8 py-5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReports.slice(0, 10).map((r) => {
                    const kat = KATEGORI_LABEL[r.kategori];
                    return (
                      <tr
                        key={r.id}
                        className="group hover:bg-slate-50/80 transition-all"
                      >
                        {/* Detail Masalah */}
                        <td className="px-8 py-5">
                          <div className="font-black text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{r.title}</div>
                          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1 uppercase">
                            <Activity size={10} /> {r.location || 'Area Stasiun'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5 tabular-nums">
                            {new Date(r.created_at).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="px-6 py-5">
                          {kat ? (
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wide ${kat.color}`}>
                              <Tag size={10} />
                              {kat.label}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">—</span>
                          )}
                        </td>

                        {/* Urgensi */}
                        <td className="px-6 py-5 text-center">
                          <span
                            className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider ${
                              r.severity === 'high' ? 'bg-red-50 text-red-600' : r.severity === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {r.severity}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-5 text-center">
                          {r.status === 'pending' ? (
                            <div className="flex items-center justify-center gap-1.5 text-amber-600 font-black text-[10px] uppercase italic">
                              <Clock size={13} /> Menunggu
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase">
                              <CheckCircle size={13} /> Selesai
                            </div>
                          )}
                        </td>

                        {/* Tindakan */}
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {/* Detail (foto & deskripsi lengkap) */}
                            <button
                              onClick={() => handleDetail(r.id)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Lihat Detail & Foto"
                            >
                              <Eye size={16} />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleEdit(r.id)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Edit Laporan"
                            >
                              <Edit3 size={16} />
                            </button>

                            {/* Hapus */}
                            <button
                              onClick={() => handleDelete(r.id, r.title)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Hapus Laporan"
                            >
                              <Trash2 size={16} />
                            </button>

                            {r.status === 'pending' && (
                              <button
                                onClick={() => handleResolve(r.id)}
                                className="bg-slate-900 text-white text-[9px] font-black px-4 py-2.5 rounded-xl hover:bg-blue-600 transition-all uppercase ml-1"
                              >
                                Close Ticket
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredReports.length === 0 && <div className="text-center py-16 text-slate-400 font-black text-sm uppercase tracking-widest">Tidak ada laporan ditemukan</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SidebarItem({ icon, label, active = false, isOpen }: any) {
  return (
    <div className={`flex items-center gap-4 px-3 py-3.5 rounded-2xl cursor-pointer transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'hover:bg-slate-800 hover:text-white'}`}>
      <div className="shrink-0">{icon}</div>
      <span className={`text-xs font-black tracking-wide transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>{label}</span>
    </div>
  );
}

function StatCard({ title, value, icon, color, isAlert = false }: any) {
  const colorMap: any = {
    blue: 'bg-blue-600 text-white',
    red: 'bg-red-500 text-white',
    amber: 'bg-amber-500 text-white',
    emerald: 'bg-emerald-500 text-white',
  };
  return (
    <div className={`p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${isAlert ? 'ring-2 ring-red-500 ring-offset-4 animate-pulse' : ''}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${colorMap[color]}`}>{icon}</div>
      <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{title}</div>
      <div className="text-4xl font-black text-slate-800 mt-1 tabular-nums">{value}</div>
    </div>
  );
}
