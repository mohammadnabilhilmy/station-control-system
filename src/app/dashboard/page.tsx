'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2, Clock, LayoutDashboard, TrendingUp, ShieldAlert, Activity, CheckCircle, FileDown, FileText, ClipboardList, Box, LogOut, Menu, Edit3, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- INTERFACE ---
interface Report {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved';
  created_at: string;
  location: string;
}

export default function StationControlSystem() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'pending'>('all');
  const router = useRouter();

  const fetchReports = async () => {
    const { data, error } = await supabase.from('laporan_kendala').select('*').order('created_at', { ascending: false });
    if (!error) setReports(data || []);
  };

  // --- FUNGSI LOGOUT ---
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('Gagal Logout: ' + error.message);
    } else {
      router.push('/login');
    }
  };

  // --- FUNGSI DELETE DENGAN KONFIRMASI ---
  const handleDelete = async (id: string, title: string) => {
    const confirmDelete = window.confirm(`Apakah Mas Nabil yakin ingin menghapus laporan: "${title}"? Data yang dihapus tidak bisa dikembalikan.`);

    if (confirmDelete) {
      const { error } = await supabase.from('laporan_kendala').delete().eq('id', id);
      if (error) {
        alert('Gagal menghapus: ' + error.message);
      } else {
        fetchReports(); // Refresh data setelah hapus
      }
    }
  };

  // --- FUNGSI EDIT ---
  const handleEdit = (id: string) => {
    // Mengarahkan ke halaman report dengan query ID untuk diedit
    router.push(`/report?edit=${id}`);
  };

  useEffect(() => {
    fetchReports();
    const channel = supabase
      .channel('realtime-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_kendala' }, () => fetchReports())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- LOGIKA DATA (STATISTIK) ---
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
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ day: date, count: 1 });
        }
        return acc;
      }, [])
      .slice(0, 7)
      .reverse();

    return { total, highPriority, resolved, pending, chartData };
  }, [reports]);

  const handleResolve = async (id: string) => {
    const { error } = await supabase.from('laporan_kendala').update({ status: 'resolved' }).eq('id', id);
    if (error) alert(error.message);
  };

  // --- EXPORT FUNCTIONS ---
  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('id-ID');
    doc.setFontSize(18);
    doc.text('LAPORAN KENDALA OPERASIONAL STASIUN', 14, 22);
    doc.text(`Lokasi: Stasiun Tangerang | Tanggal: ${dateStr}`, 14, 30);
    const tableRows = reports.map((r, i) => [i + 1, r.title, r.severity.toUpperCase(), r.status.toUpperCase(), new Date(r.created_at).toLocaleDateString('id-ID')]);
    autoTable(doc, {
      head: [['No', 'Judul Kendala', 'Urgensi', 'Status', 'Tanggal']],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 153] },
    });
    doc.save(`Laporan_KCI_Tangerang_${dateStr}.pdf`);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reports);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
    XLSX.writeFile(workbook, `Rekap_KCI_Tangerang_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* --- SIDEBAR --- */}
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

      {/* --- MAIN CONTENT --- */}
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
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase border border-red-100"
            >
              <FileText size={14} /> PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase border border-emerald-100"
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                  <TrendingUp className="text-blue-600" /> Tren Kendala
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['all', 'high', 'pending'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f as any)}
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
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
            </div>
          </div>

          {/* Table List */}
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
                    <th className="px-8 py-5 text-center">Tingkat Urgensi</th>
                    <th className="px-8 py-5 text-center">Status Operasional</th>
                    <th className="px-8 py-5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReports.slice(0, 10).map((r) => (
                    <tr
                      key={r.id}
                      className="group hover:bg-slate-50/80 transition-all"
                    >
                      <td className="px-8 py-5">
                        <div className="font-black text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{r.title}</div>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1 uppercase">
                          <Activity size={10} /> {r.location || 'Area Stasiun'}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span
                          className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider ${r.severity === 'high' ? 'bg-red-50 text-red-600' : r.severity === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}
                        >
                          {r.severity}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {r.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2 text-amber-600 font-black text-[10px] uppercase italic">
                            <Clock size={14} /> Menunggu
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-[10px] uppercase">
                            <CheckCircle size={14} /> Selesai
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          {/* TOMBOL EDIT */}
                          <button
                            onClick={() => handleEdit(r.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit Laporan"
                          >
                            <Edit3 size={16} />
                          </button>

                          {/* TOMBOL HAPUS */}
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
                              className="bg-slate-900 text-white text-[9px] font-black px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all uppercase ml-2"
                            >
                              Close Ticket
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function SidebarItem({ icon, label, active = false, isOpen }: any) {
  return (
    <div className={`flex items-center gap-4 px-3 py-3.5 rounded-2xl cursor-pointer transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'hover:bg-slate-800 hover:text-white'}`}>
      <div className="shrink-0">{icon}</div>
      <span className={`text-xs font-black tracking-wide transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>{label}</span>
    </div>
  );
}

function StatCard({ title, value, icon, color, isAlert = false }: any) {
  const colorMap: any = { blue: 'bg-blue-600 text-white', red: 'bg-red-500 text-white', amber: 'bg-amber-500 text-white', emerald: 'bg-emerald-500 text-white' };
  return (
    <div className={`p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${isAlert ? 'ring-2 ring-red-500 ring-offset-4 animate-pulse' : ''}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${colorMap[color]}`}>{icon}</div>
      <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{title}</div>
      <div className="text-4xl font-black text-slate-800 mt-1 tabular-nums">{value}</div>
    </div>
  );
}
