'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const IDLE_TIME = 5 * 60 * 1000; // 5 Menit (Waktu tunggu sebelum countdown)
const COUNTDOWN_TIME = 30; // 30 Detik (Durasi countdown)

export default function IdleTimer() {
  const [isIdle, setIsIdle] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_TIME);
  const router = useRouter();

  const logout = useCallback(() => {
    // Tambahkan logic hapus session/cookie di sini jika ada
    router.push('/login');
  }, [router]);

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const resetTimer = () => {
      setIsIdle(false);
      setCountdown(COUNTDOWN_TIME);
      clearTimeout(idleTimer);

      // Mulai hitung mundur masa idle
      idleTimer = setTimeout(() => setIsIdle(true), IDLE_TIME);
    };

    // Deteksi aktivitas user (Mouse, Keyboard, Touch)
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      clearTimeout(idleTimer);
    };
  }, []);

  // Logic Hitung Mundur saat Idle
  useEffect(() => {
    if (isIdle && countdown > 0) {
      const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (countdown === 0) {
      logout();
    }
  }, [isIdle, countdown, logout]);

  if (!isIdle) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-xl shadow-2xl border-t-4 border-navy-kai text-center max-w-sm mx-4">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Sesi Akan Berakhir</h2>
        <p className="text-slate-600 mb-6">Tidak ada aktivitas terdeteksi. Anda akan dialihkan ke halaman login dalam:</p>
        <div className="text-5xl font-black text-orange-500 mb-6">{countdown}s</div>
        <button
          onClick={() => setIsIdle(false)}
          className="w-full py-3 bg-[#002d62] text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all"
        >
          SAYA MASIH DI SINI
        </button>
      </div>
    </div>
  );
}
