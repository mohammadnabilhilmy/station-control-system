'use client';

import React from 'react';
import { Activity, Tag, Clock, CheckCircle, Eye, Edit3, Trash2 } from 'lucide-react';

// Copy Helper dari file utama agar warna kategori tetap konsisten
const KATEGORI_LABEL: Record<string, { label: string; color: string }> = {
  unit_penjualan: { label: 'Penjualan', color: 'bg-blue-50 text-blue-700' },
  unit_prasarana_sipil: { label: 'Prasarana', color: 'bg-violet-50 text-violet-700' },
  unit_pelayanan: { label: 'Pelayanan', color: 'bg-cyan-50 text-cyan-700' },
  unit_keamanan_hse_safety: { label: 'Keamanan/HSE', color: 'bg-rose-50 text-rose-700' },
};

interface MonitoringTableProps {
  reports: any[];
  handleDetail: (id: string) => void;
  handleEdit: (id: string) => void;
  handleDelete: (id: string, title: string) => void;
  handleResolve: (id: string) => void;
  title?: string;
  limit?: number;
}

export default function MonitoringTable({ reports, handleDetail, handleEdit, handleDelete, handleResolve, title = 'Monitoring Real-time', limit }: MonitoringTableProps) {
  const displayReports = limit ? reports.slice(0, limit) : reports;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">{title}</h3>
        <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase italic animate-pulse">Update Realtime Aktif</span>
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
            {displayReports.map((r) => {
              const kat = KATEGORI_LABEL[r.kategori];
              return (
                <tr
                  key={r.id}
                  className="group hover:bg-slate-50/80 transition-all"
                >
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

                  <td className="px-6 py-5">
                    {kat ? (
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wide ${kat.color}`}>
                        <Tag size={10} /> {kat.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">—</span>
                    )}
                  </td>

                  <td className="px-6 py-5 text-center">
                    <span
                      className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider ${
                        r.severity === 'high' ? 'bg-red-50 text-red-600' : r.severity === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {r.severity}
                    </span>
                  </td>

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

                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      <button
                        onClick={() => handleDetail(r.id)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Detail"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(r.id)}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, r.title)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Hapus"
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
        {displayReports.length === 0 && <div className="text-center py-16 text-slate-400 font-black text-sm uppercase tracking-widest">Tidak ada laporan ditemukan</div>}
      </div>
    </div>
  );
}
