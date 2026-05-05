'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2, Clock, LayoutDashboard, TrendingUp, ShieldAlert, Activity, FileDown, FileText, ClipboardList, LogOut, Menu, MonitorDot, X } from 'lucide-react';
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
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Default tutup di HP
  const [filter, setFilter] = useState<'all' | 'high' | 'pending'>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitoring'>('dashboard');
  const router = useRouter();

  // ── Logic Fetch & Realtime ──
  const fetchReports = async () => {
    const { data, error } = await supabase.from('laporan_kendala').select('*').order('created_at', { ascending: false });
    if (!error) setReports(data || []);
  };

  useEffect(() => {
    fetchReports();
    const channel = supabase.channel('realtime-analytics').on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_kendala' }, fetchReports).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Logic Handlers ──
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

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

  return (
    <div className="flex min-h-screen bg-[#f8fafc] overflow-hidden">
      
      {/* ── Overlay untuk Mobile ── */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (Responsive Push/Overlay) ── */}
      <aside 
        className={`
          fixed lg:relative z-50 h-full bg-slate-900 transition-all duration-300 flex flex-col p-4
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}
        `}
      >
        <div className="flex items-center justify-between px-2 mb-10 h-10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-blue-600 p-2 rounded-xl text-white shrink-0">
              <Activity size={20} />
            </div>
            <span className={`font-black text-white tracking-widest text-sm whitespace-nowrap ${isSidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'}`}>
              STATION OPS
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => {setActiveTab('dashboard'); if(window.innerWidth < 1024) setSidebarOpen(false)}} className="w-full">
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} isOpen={isSidebarOpen} />
          </button>
          <button onClick={() => {setActiveTab('monitoring'); if(window.innerWidth < 1024) setSidebarOpen(false)}} className="w-full">
            <SidebarItem icon={<MonitorDot size={20} />} label="Live Monitoring" active={activeTab === 'monitoring'} isOpen={isSidebarOpen} />
          </button>
          <Link href="/report" className="block">
            <SidebarItem icon={<ClipboardList size={20} />} label="Report Kendala" isOpen={isSidebarOpen} />
          </Link>
        </nav>

        <div className="pt-4 border-t border-slate-800 cursor-pointer" onClick={handleLogout}>
          <SidebarItem icon={<LogOut size={20} className="text-red-400" />} label="Logout" isOpen={isSidebarOpen} />
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 min-w-0 flex flex-col h-screen bg-[#f8fafc]">
        
        {/* --- HEADER --- */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-black text-slate-800 text-sm md:text-xl tracking-tight uppercase truncate max-w-[150px] md:max-w-none">
                {activeTab === 'dashboard' ? 'Dashboard' : 'Monitoring'}
              </h1>
              <p className="text-[9px] md:text-xs text-slate-500 font-bold tracking-widest uppercase truncate">
                Stasiun Tangerang
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 md:gap-2 items-center">
            {/* Tombol Export (PDF & Excel) */}
            <div className="flex gap-1">
              <button onClick={() => {}} className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100 md:px-4 md:py-2 md:text-[10px] md:font-black md:flex md:items-center md:gap-2">
                <FileText size={16} /> <span className="hidden md:block">PDF</span>
              </button>
              <button onClick={() => {}} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 md:px-4 md:py-2 md:text-[10px] md:font-black md:flex md:items-center md:gap-2">
                <FileDown size={16} /> <span className="hidden md:block">EXCEL</span>
              </button>
            </div>
          </div>
        </header>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            {activeTab === 'dashboard' ? (
              <>
                {/* Stats Grid - Responsive Columns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  <StatCard title="Total" value={stats.total} icon={<LayoutDashboard size={18}/>} color="blue" />
                  <StatCard title="High" value={stats.highPriority} icon={<ShieldAlert size={18}/>} color="red" isAlert={stats.highPriority > 0} />
                  <StatCard title="Pending" value={stats.pending} icon={<Clock size={18}/>} color="amber" />
                  <StatCard title="Done" value={stats.resolved} icon={<CheckCircle2 size={18}/>} color="emerald" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  {/* Chart - Responsive Height */}
                  <div className="lg:col-span-2 bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight text-sm md:text-base">
                        <TrendingUp className="text-blue-600" size={18} /> Tren Kendala
                      </h3>
                      <div className="flex bg-slate-100 p-1 rounded-xl self-start">
                        {['all', 'high', 'pending'].map((f) => (
                          <button key={f} onClick={() => setFilter(f as any)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div className="h-64 md:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={10} fontWeight="800" />
                          <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="800" />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none', fontSize: '10px' }} />
                          <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={window?.innerWidth < 640 ? 20 : 40}>
                            {stats.chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.count > 5 ? '#ef4444' : '#003399'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Operational Score */}
                  <div className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl flex flex-col justify-center min-h-[200px]">
                    <div className="relative z-10">
                      <p className="text-blue-400 font-black text-[9px] tracking-widest uppercase mb-1">Efficiency</p>
                      <h2 className="text-xl md:text-2xl font-black leading-tight">Operational Score</h2>
                    </div>
                    <div className="relative z-10 py-6 md:py-8">
                      <div className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-500">
                        {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl" />
                  </div>
                </div>

                <MonitoringTable reports={reports.slice(0, 5)} title="Aktivitas Terakhir" />
              </>
            ) : (
              <MonitoringTable reports={reports} title="Monitoring Real-time (Full View)" />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Shared UI Components ──
function SidebarItem({ icon, label, active = false, isOpen }: any) {
  return (
    <div className={`flex items-center gap-4 px-3 py-3 rounded-2xl cursor-pointer transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
      <div className="shrink-0">{icon}</div>
      <span className={`text-[11px] font-black tracking-wide ${isOpen ? 'block' : 'hidden lg:hidden'}`}>{label}</span>
    </div>
  );
}

function StatCard({ title, value, icon, color, isAlert = false }: any) {
  const colorMap: any = { blue: 'bg-blue-600', red: 'bg-red-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' };
  return (
    <div className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] bg-white border border-slate-200 shadow-sm transition-all ${isAlert ? 'ring-2 ring-red-500 ring-offset-2 animate-pulse' : ''}`}>
      <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 text-white shadow-md ${colorMap[color]}`}>{icon}</div>
      <div className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest truncate">{title}</div>
      <div className="text-xl md:text-4xl font-black text-slate-800 mt-0.5">{value}</div>
    </div>
  );
}
