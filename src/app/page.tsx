'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    };

    checkSession();
  }, []);

  return <div>Loading...</div>;
}
