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
}

const KATEGORI_LABEL: Record<string, { label: string; color: string }> = {
  unit_penjualan: { label: 'Penjualan', color: 'bg-blue-50 text-blue-700' },
  unit_prasarana_sipil: { label: 'Prasarana', color: 'bg-violet-50 text-violet-700' },
  unit_pelayanan: { label: 'Pelayanan', color: 'bg-cyan-50 text-cyan-700' },
  unit_keamanan_hse_safety: { label: 'Keamanan/HSE', color: 'bg-rose-50 text-rose-700' },
};

export default function StationControlSystem() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Default tutup untuk Mobile
  const [filter, setFilter] = useState<'all' | 'high' | 'pending'>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitoring'>('dashboard');
  const router = useRouter();

  // Efek untuk buka sidebar otomatis jika di layar lebar (Laptop)
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

  const handleEdit = (id: string) => router.push(`/report?edit=${id}`);
  const handleDetail = (id: string) => router.push(`/laporan/${id}`);
  
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
      
      {/* ── Sidebar (Ngumpet di HP, Push di Laptop) ── */}
      <aside 
        className={`
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 lg:w-20 lg:translate-x-0'} 
          bg-slate-900 transition-all duration-300 flex flex-col text-slate-400 p-4 z-50 fixed lg:relative h-full
        `}
      >
        <div className="flex items-center gap-3 px-2 mb-10 h-10 overflow-hidden">
          <div className="bg-blue-600 p-2 rounded-xl text-white shrink-0"><Activity size={20} /></div>
          <span className={`font-black text-white tracking-widest text-sm ${isSidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'}`}>STATION OPS</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className="w-full">
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} isOpen={isSidebarOpen} />
          </button>
          <button onClick={() => setActiveTab('monitoring')} className="w-full">
            <SidebarItem icon={<MonitorDot size={20} />} label="Monitoring" active={activeTab === 'monitoring'} isOpen={isSidebarOpen} />
          </button>
          <Link href="/report">
            <SidebarItem icon={<ClipboardList size={20} />} label="Input Laporan" isOpen={isSidebarOpen} />
          </Link>
        </nav>

        <div className="pt-4 border-t border-slate-800 cursor-pointer" onClick={handleLogout}>
          <SidebarItem icon={<LogOut size={20} className="text-red-400" />} label="Logout" isOpen={isSidebarOpen} />
        </div>
      </aside>

      {/* Overlay: Klik luar sidebar untuk nutup (Khusus HP) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 flex flex-col h-screen bg-[#f8fafc]">
        
        {/* Navbar Tetap di Atas */}
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
               <MonitorDot size={14} /> {activeTab === 'dashboard' ? 'Live' : 'Stats'}
            </button>
            <button onClick={() => {}} className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-2 rounded-xl font-black text-[9px] uppercase border border-red-100"><FileText size={14} /></button>
            <button onClick={() => {}} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl font-black text-[9px] uppercase border border-emerald-100"><FileDown size={14} /></button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {activeTab === 'dashboard' ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Total" value={stats.total} icon={<LayoutDashboard />} color="blue" />
                  <StatCard title="High" value={stats.highPriority} icon={<ShieldAlert />} color="red" isAlert={stats.highPriority > 0} />
                  <StatCard title="Wait" value={stats.pending} icon={<Clock />} color="amber" />
                  <StatCard title="Done" value={stats.resolved} icon={<CheckCircle2 />} color="emerald" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-200">
                    <h3 className="font-black text-slate-800 text-xs mb-6 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp size={16} className="text-blue-600" /> Tren Kendala
                    </h3>
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
                    <div className="text-5xl font-black text-blue-500">{stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%</div>
                    <p className="text-slate-500 text-[10px] mt-2 italic">Performance Score</p>
                  </div>
                </div>
              </>
            ) : (
              <MonitoringTable reports={reports} limit={20} title="Monitoring Live" />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, isOpen }: any) {
  return (
    <div className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800 hover:text-white'}`}>
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
      <div className="text-xl font-black text-slate-800 mt-1">{value}</div>
    </div>
  );
}
