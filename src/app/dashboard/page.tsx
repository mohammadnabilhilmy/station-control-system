'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2, Clock, LayoutDashboard, TrendingUp, ShieldAlert, Activity, FileDown, FileText, ClipboardList, LogOut, Menu, MonitorDot } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// IMPORT KOMPONEN EXTERNAL
import MonitoringTable from '@/components/MonitoringTable';

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

const KATEGORI_LABEL: Record<string, { label: string; color: string }> = {
  unit_penjualan: { label: 'Penjualan', color: 'bg-blue-50 text-blue-700' },
  unit_prasarana_sipil: { label: 'Prasarana', color: 'bg-violet-50 text-violet-700' },
  unit_pelayanan: { label: 'Pelayanan', color: 'bg-cyan-50 text-cyan-700' },
  unit_keamanan_hse_safety: { label: 'Keamanan/HSE', color: 'bg-rose-50 text-rose-700' },
};

export default function StationControlSystem() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Sembunyi default di Mobile
  const [filter, setFilter] = useState<'all' | 'high' | 'pending'>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitoring'>('dashboard');
  const router = useRouter();

  // Inisialisasi Sidebar: Terbuka otomatis hanya di Layar Lebar
  useEffect(() => {
    if (window.innerWidth > 1024) {
      setSidebarOpen(true);
    }
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase.from('laporan_kendala').select('*').order('created_at', { ascending: false });
    if (!error) setReports(data || []);
  };

  useEffect(() => {
    fetchReports();
    const channel = supabase.channel('realtime-analytics').on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_kendala' }, fetchReports).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus laporan "${title}"?`)) return;
    const { error } = await supabase.from('laporan_kendala').delete().eq('id', id);
    if (!error) fetchReports();
  };

  const handleEdit = (id: string) => router.push(`/report?edit=${id}`);
  const handleDetail = (id: string) => router.push(`/laporan/${id}`);
  const handleResolve = async (id: string) => {
    const { error } = await supabase.from('laporan_kendala').update({ status: 'resolved' }).eq('id', id);
    if (!error) fetchReports();
  };

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
    const chartData = reports.reduce((acc: any[], report) => {
      const date = new Date(report.created_at).toLocaleDateString('id-ID', { weekday: 'short' });
      const existing = acc.find((item) => item.day === date);
      if (existing) existing.count += 1;
      else acc.push({ day: date, count: 1 });
      return acc;
    }, []).slice(0, 7).reverse();
    return { total, highPriority, resolved, pending, chartData };
  }, [reports]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['No', 'Judul', 'Urgensi', 'Status']],
      body: reports.map((r, i) => [i + 1, r.title, r.severity, r.status]),
      startY: 40,
      theme: 'grid',
    });
    doc.save(`Laporan_KAI_${Date.now()}.pdf`);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reports);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
    XLSX.writeFile(workbook, `Rekap_KAI_${Date.now()}.xlsx`);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      
      {/* ── SIDEBAR ── */}
      <aside 
        className={`
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 lg:translate-x-0 lg:w-20'} 
          bg-slate-900 transition-all duration-300 flex flex-col text-slate-400 p-4 z-50 fixed h-full lg:relative
        `}
      >
        <div className="flex items-center gap-3 px-2 mb-10 h-10 overflow-hidden">
          <div className="bg-blue-600 p-2 rounded-xl text-white shrink-0"><Activity size={20} /></div>
          <span className={`font-black text-white tracking-widest text-sm ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>STATION OPS</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => {setActiveTab('dashboard'); if(window.innerWidth < 1024) setSidebarOpen(false);}} className="w-full text-left">
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} isOpen={isSidebarOpen} />
          </button>
          <button onClick={() => {setActiveTab('monitoring'); if(window.innerWidth < 1024) setSidebarOpen(false);}} className="w-full text-left">
            <SidebarItem icon={<MonitorDot size={20} />} label="Live Monitor" active={activeTab === 'monitoring'} isOpen={isSidebarOpen} />
          </button>
          <Link href="/report">
            <SidebarItem icon={<ClipboardList size={20} />} label="Input Laporan" isOpen={isSidebarOpen} />
          </Link>
        </nav>

        <div className="pt-4 border-t border-slate-800 cursor-pointer" onClick={handleLogout}>
          <SidebarItem icon={<LogOut size={20} className="text-red-400" />} label="Logout" isOpen={isSidebarOpen} />
        </div>
      </aside>

      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── MAIN AREA ── */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        
        {/* Header Tetap di Atas */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 sticky top-0 z-40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-black text-slate-800 text-sm md:text-xl tracking-tight uppercase">
                {activeTab === 'dashboard' ? 'Dashboard' : 'Monitoring'}
              </h1>
              <p className="text-[9px] md:text-xs text-slate-500 font-bold tracking-widest uppercase">
                Stasiun Tangerang — KAI
              </p>
            </div>
          </div>

          <div className="flex gap-1 md:gap-2">
            <button onClick={() => setActiveTab(activeTab === 'dashboard' ? 'monitoring' : 'dashboard')} className="hidden sm:flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase border border-blue-100">
               <MonitorDot size={14} /> {activeTab === 'dashboard' ? 'Monitor' : 'Stats'}
            </button>
            <button onClick={exportToPDF} className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100"><FileText size={14} /></button>
            <button onClick={exportToExcel} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><FileDown size={14} /></button>
          </div>
        </header>

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {activeTab === 'dashboard' ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Total" value={stats.total} icon={<LayoutDashboard />} color="blue" />
                  <StatCard title="High" value={stats.highPriority} icon={<ShieldAlert />} color="red" isAlert={stats.highPriority > 0} />
                  <StatCard title="Pending" value={stats.pending} icon={<Clock />} color="amber" />
                  <StatCard title="Resolved" value={stats.resolved} icon={<CheckCircle2 />} color="emerald" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-200">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-600" /> Tren Mingguan
                      </h3>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['all', 'high', 'pending'].map((f) => (
                          <button key={f} onClick={() => setFilter(f as any)} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.chartData}>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={10} fontWeight="800" />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none' }} />
                          <Bar dataKey="count" fill="#003399" radius={[5, 5, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-center text-center">
                    <p className="text-blue-400 font-black text-[10px] uppercase mb-2">Efficiency</p>
                    <div className="text-6xl font-black text-blue-500">{stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%</div>
                    <p className="text-slate-500 text-[10px] mt-2 italic font-medium">Berdasarkan Tiket Selesai</p>
                  </div>
                </div>
                <MonitoringTable reports={filteredReports} handleDetail={handleDetail} handleEdit={handleEdit} handleDelete={handleDelete} handleResolve={handleResolve} limit={5} title="Aktivitas Terakhir" />
              </>
            ) : (
              <MonitoringTable reports={filteredReports} handleDetail={handleDetail} handleEdit={handleEdit} handleDelete={handleDelete} handleResolve={handleResolve} title="Live Monitoring (Full View)" />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── UI Components ────────────────────────────────────────────────────────────
function SidebarItem({ icon, label, active = false, isOpen }: any) {
  return (
    <div className={`flex items-center gap-4 px-3 py-3 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800 hover:text-white'}`}>
      <div className="shrink-0">{icon}</div>
      <span className={`text-[10px] font-black uppercase tracking-wide ${isOpen ? 'block' : 'hidden'}`}>{label}</span>
    </div>
  );
}

function StatCard({ title, value, icon, color, isAlert = false }: any) {
  const colorMap: any = { blue: 'bg-blue-600', red: 'bg-red-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' };
  return (
    <div className={`p-4 rounded-[1.5rem] bg-white border border-slate-200 shadow-sm ${isAlert ? 'ring-2 ring-red-500 animate-pulse' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-white ${colorMap[color]}`}>{icon}</div>
      <div className="text-slate-400 text-[8px] font-black uppercase tracking-widest">{title}</div>
      <div className="text-2xl font-black text-slate-800 mt-1 tabular-nums">{value}</div>
    </div>
  );
}
