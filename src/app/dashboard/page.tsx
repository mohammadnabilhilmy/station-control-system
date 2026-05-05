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

// ── Helpers ──────────────────────────────────────────────────────────────────
const KATEGORI_LABEL: Record<string, { label: string; color: string }> = {
  unit_penjualan: { label: 'Penjualan', color: 'bg-blue-50 text-blue-700' },
  unit_prasarana_sipil: { label: 'Prasarana', color: 'bg-violet-50 text-violet-700' },
  unit_pelayanan: { label: 'Pelayanan', color: 'bg-cyan-50 text-cyan-700' },
  unit_keamanan_hse_safety: { label: 'Keamanan/HSE', color: 'bg-rose-50 text-rose-700' },
};

export default function StationControlSystem() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Default tutup untuk mobile
  const [filter, setFilter] = useState<'all' | 'high' | 'pending'>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitoring'>('dashboard');
  const [stationName, setStationName] = useState('Loading...'); // Untuk universal stasiun
  const router = useRouter();

  // ── Logic Fetch & Realtime ──
  const fetchReports = async () => {
    // Ambil Data Stasiun dari Profile (Universal)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('station').eq('id', user.id).single();
      if (profile) setStationName(profile.station);
    }

    // Ambil Data Laporan
    const { data, error } = await supabase.from('laporan_kendala').select('*').order('created_at', { ascending: false });
    if (!error) setReports(data || []);
  };

  useEffect(() => {
    fetchReports();
    // Buka sidebar otomatis jika layar lebar (Laptop)
    if (window.innerWidth > 1024) setSidebarOpen(true);

    const channel = supabase.channel('realtime-analytics').on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_kendala' }, fetchReports).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Logic Handlers ──
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
    else fetchReports();
  };

  // ── Data Processing ──
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

  // ── Export Logic ──
  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('id-ID');
    doc.setFontSize(14);
    doc.text('LAPORAN KENDALA OPERASIONAL STASIUN', 14, 22);
    doc.setFontSize(10);
    doc.text(`Lokasi: Stasiun ${stationName} | Tanggal: ${dateStr}`, 14, 30);
    autoTable(doc, {
      head: [['No', 'Judul', 'Kategori', 'Urgensi', 'Status', 'Tanggal']],
      body: reports.map((r, i) => [i + 1, r.title, KATEGORI_LABEL[r.kategori]?.label ?? r.kategori ?? '-', r.severity.toUpperCase(), r.status.toUpperCase(), new Date(r.created_at).toLocaleDateString('id-ID')]),
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 153] },
    });
    doc.save(`Laporan_Kendala_Stasiun_${dateStr}.pdf`);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reports);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
    XLSX.writeFile(workbook, `Rekap_laporan_Kendala_${Date.now()}.xlsx`);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* ── Sidebar (Responsive & Push) ── */}
      <aside 
        className={`
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 lg:translate-x-0 lg:w-20'} 
          bg-slate-900 transition-all duration-300 flex flex-col text-slate-400 p-4 z-50 fixed lg:relative h-full
        `}
      >
        <div className="flex items-center gap-3 px-2 mb-10 h-10 overflow-hidden">
          <div className="bg-blue-600 p-2 rounded-xl text-white shrink-0">
            <Activity size={20} />
          </div>
          <span className={`font-black text-white tracking-widest text-sm transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>STATION OPS</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 1024) setSidebarOpen(false); }} className="w-full text-left">
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} isOpen={isSidebarOpen} />
          </button>
          <button onClick={() => { setActiveTab('monitoring'); if(window.innerWidth < 1024) setSidebarOpen(false); }} className="w-full text-left">
            <SidebarItem icon={<MonitorDot size={20} />} label="Live Monitoring" active={activeTab === 'monitoring'} isOpen={isSidebarOpen} />
          </button>
          <Link href="/report">
            <SidebarItem icon={<ClipboardList size={20} />} label="Report Kendala" isOpen={isSidebarOpen} />
          </Link>
        </nav>

        <div className="pt-4 border-t border-slate-800 cursor-pointer" onClick={handleLogout}>
          <SidebarItem icon={<LogOut size={20} className="text-red-400" />} label="Logout" isOpen={isSidebarOpen} />
        </div>
      </aside>

      {/* Overlay Mobile (Klik area luar untuk tutup sidebar) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main Area ── */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-[#f8fafc]">
        {/* --- HEADER --- */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 sticky top-0 z-40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-black text-slate-800 text-sm md:text-xl tracking-tight uppercase">
                {activeTab === 'dashboard' ? 'Dashboard Analytics' : 'Real-time Monitoring'}
              </h1>
              <p className="text-[10px] md:text-xs text-slate-500 font-bold tracking-widest uppercase">
                Stasiun {stationName} — KAI Commuter
              </p>
            </div>
          </div>

          <div className="flex gap-1 md:gap-2 items-center">
            <button
              onClick={() => setActiveTab(activeTab === 'dashboard' ? 'monitoring' : 'dashboard')}
              className="hidden sm:flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              <MonitorDot size={14} /> 
              {activeTab === 'dashboard' ? 'Live Monitor' : 'Dashboard'}
            </button>

            <button onClick={exportToPDF} className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100"><FileText size={14} /></button>
            <button onClick={exportToExcel} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><FileDown size={14} /></button>
          </div>
        </header>

        {/* --- KONTEN SCROLLABLE --- */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {activeTab === 'dashboard' ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Total Temuan" value={stats.total} icon={<LayoutDashboard />} color="blue" />
                  <StatCard title="Priority High" value={stats.highPriority} icon={<ShieldAlert />} color="red" isAlert={stats.highPriority > 0} />
                  <StatCard title="Pending" value={stats.pending} icon={<Clock />} color="amber" />
                  <StatCard title="Resolved" value={stats.resolved} icon={<CheckCircle2 />} color="emerald" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-tight flex items-center gap-2">
                        <TrendingUp className="text-blue-600" /> Tren Kendala
                      </h3>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        {(['all', 'high', 'pending'] as const).map((f) => (
                          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div className="h-64 md:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={10} fontWeight="800" />
                          <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="800" />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none' }} />
                          <Bar dataKey="count" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={35}>
                            {stats.chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.count > 5 ? '#ef4444' : '#003399'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col justify-center text-center shadow-2xl relative overflow-hidden">
                    <p className="text-blue-400 font-black text-[10px] uppercase mb-2">Operational Score</p>
                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-500">{stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%</div>
                    <p className="text-slate-400 text-[10px] mt-2 italic font-medium">Berdasarkan Tiket Selesai</p>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl" />
                  </div>
                </div>

                <MonitoringTable reports={filteredReports} handleDetail={handleDetail} handleEdit={handleEdit} handleDelete={handleDelete} handleResolve={handleResolve} limit={5} title="Aktivitas Terakhir" />
              </>
            ) : (
              <MonitoringTable reports={filteredReports} handleDetail={handleDetail} handleEdit={handleEdit} handleDelete={handleDelete} handleResolve={handleResolve} title="Monitoring Real-time (Full View)" />
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
    <div className={`flex items-center gap-4 px-3 py-3.5 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
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
