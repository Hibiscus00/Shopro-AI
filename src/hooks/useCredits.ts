/**
 * useCredits - 积分余额实时查询 Hook（P1-M04）
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { CreditLog } from '@/types/types';

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
    creditsTotal: 50, creditsUsed: 0, creditsLeft: 50,
    usagePercent: 0, loading: true, planName: '免费版',
  });

  const fetch = useCallback(async () => {
    if (!user) { setState(s => ({ ...s, loading: false })); return; }
    setState(s => ({ ...s, loading: true }));
    try {
      const { data } = await supabase
        .from('user_plans')
        .select('credits_total, credits_used, plans(name)')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        const total = data.credits_total ?? 50;
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
        // 兜底逻辑：无 user_plans 记录时默认给予 50 初始积分
        setState({
          creditsTotal: 50,
          creditsUsed: 0,
          creditsLeft: 50,
          usagePercent: 0,
          loading: false,
          planName: '免费版',
        });
      }
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  // 监听全局积分变动事件
  useEffect(() => {
    const handleChanged = () => { fetch(); };
    window.addEventListener('credits_changed', handleChanged);
    return () => window.removeEventListener('credits_changed', handleChanged);
  }, [fetch]);

  return { ...state, refresh: fetch };
}

/**
 * deductUserCredits - 扣除用户积分并写入流水明细
 */
export async function deductUserCredits(
  userId: string,
  amount: number,
  description: string,
  type: CreditLog['type'] = 'video_generate'
): Promise<{ success: boolean; creditsLeft: number; message?: string }> {
  if (!userId) {
    return { success: false, creditsLeft: 0, message: '请先登录账号' };
  }

  try {
    // 1. 查询当前用户套餐与积分状态
    const { data: planData } = await supabase
      .from('user_plans')
      .select('id, credits_total, credits_used, plan_id')
      .eq('user_id', userId)
      .maybeSingle();

    let creditsTotal = 50;
    let creditsUsed = 0;

    if (!planData) {
      // 找不到 user_plans 记录，查免费版 plan_id 并创建
      const { data: freePlan } = await supabase
        .from('plans')
        .select('id')
        .eq('name', '免费版')
        .maybeSingle();

      const planId = freePlan?.id || '8165825b-21c8-4fce-8764-2764457bcd52';
      const now = new Date().toISOString();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await supabase.from('user_plans').insert({
        user_id: userId,
        plan_id: planId,
        credits_total: 50,
        credits_used: 0,
        cycle_start: now,
        cycle_end: nextMonth.toISOString(),
        status: 'active',
      }).catch(e => console.warn('插入 user_plans 告警:', e));
    } else {
      creditsTotal = planData.credits_total ?? 50;
      creditsUsed = planData.credits_used ?? 0;
    }

    const currentLeft = Math.max(0, creditsTotal - creditsUsed);

    // 2. 检查积分是否足够
    if (currentLeft < amount) {
      return {
        success: false,
        creditsLeft: currentLeft,
        message: `积分余额不足！生成需消耗 ${amount} 积分，当前剩余 ${currentLeft} 积分。`,
      };
    }

    const newUsed = creditsUsed + amount;
    const newLeft = Math.max(0, creditsTotal - newUsed);

    // 3. 更新 user_plans 中的 credits_used
    const { error: updateErr } = await supabase
      .from('user_plans')
      .update({ credits_used: newUsed })
      .eq('user_id', userId);

    if (updateErr) {
      console.error('更新 user_plans 积分失败:', updateErr);
      return {
        success: false,
        creditsLeft: currentLeft,
        message: '扣除积分失败，请稍后重试',
      };
    }

    // 4. 写入积分记录明细 (credit_logs)
    const logData: any = {
      user_id: userId,
      type,
      amount: -Math.abs(amount),
      credits_after: newLeft,
      description,
    };

    const { error: logErr } = await supabase.from('credit_logs').insert(logData);
    if (logErr) {
      console.warn('插入 credit_logs 带 credits_after 失败，尝试标准字段:', logErr);
      delete logData.credits_after;
      await supabase.from('credit_logs').insert(logData).catch(e => console.error('写入积分流水错误:', e));
    }

    // 5. 广播全局积分变更事件
    window.dispatchEvent(new CustomEvent('credits_changed', { detail: { creditsLeft: newLeft } }));

    return {
      success: true,
      creditsLeft: newLeft,
    };
  } catch (err: any) {
    console.error('扣除积分过程产生错误:', err);
    return {
      success: false,
      creditsLeft: 0,
      message: '扣除积分过程产生错误',
    };
  }
}

