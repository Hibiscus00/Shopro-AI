/**
 * useCredits - 积分余额实时查询 Hook（P1-M04）
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface CreditsState {
  creditsTotal: number;
  creditsUsed: number;
  creditsLeft: number;
  usagePercent: number;
  loading: boolean;
  planName: string;
}

export function useCredits() {
  const { user } = useAuth();
  const [state, setState] = useState<CreditsState>({
    creditsTotal: 0, creditsUsed: 0, creditsLeft: 0,
    usagePercent: 0, loading: true, planName: '免费版',
  });

  const fetch = useCallback(async () => {
    if (!user) { setState(s => ({ ...s, loading: false })); return; }
    setState(s => ({ ...s, loading: true }));
    const { data } = await supabase
      .from('user_plans')
      .select('credits_total, credits_used, plans(name)')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const total = data.credits_total ?? 0;
      const used = data.credits_used ?? 0;
      const left = Math.max(0, total - used);
      setState({
        creditsTotal: total,
        creditsUsed: used,
        creditsLeft: left,
        usagePercent: total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0,
        loading: false,
        planName: (data.plans as { name?: string } | null)?.name ?? '免费版',
      });
    } else {
      setState(s => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...state, refresh: fetch };
}
