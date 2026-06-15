// 微信支付回调 Webhook
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Aes } from 'npm:wechatpay-axios-plugin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, wechatpay-signature, wechatpay-timestamp, wechatpay-nonce, wechatpay-serial',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function decryptTradeState(
  MCH_API_V3_KEY: string,
  associatedData: string,
  nonce: string,
  ciphertext: string,
): Promise<{ status: string; order_no: string }> {
  const plaintext = await Aes.AesGcm.decrypt(ciphertext, MCH_API_V3_KEY, nonce, associatedData);
  const obj = JSON.parse(plaintext);
  return {
    status: (obj.trade_state ?? '').toString() === 'SUCCESS' ? 'SUCCESS' : 'OTHERS',
    order_no: obj.out_trade_no ?? '',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const body = await req.json();
    const { resource } = body as {
      resource: { algorithm: string; associated_data: string; nonce: string; ciphertext: string };
    };

    const MCH_API_V3_KEY = Deno.env.get('MCH_API_V3_KEY');
    if (!MCH_API_V3_KEY) {
      console.error('[webhook] MCH_API_V3_KEY 未配置');
      return new Response('ok', { status: 200 }); // 返回 200 避免微信重试
    }

    const { status, order_no } = await decryptTradeState(
      MCH_API_V3_KEY,
      resource.associated_data,
      resource.nonce,
      resource.ciphertext,
    );

    if (status !== 'SUCCESS' || !order_no) {
      return new Response('ok', { status: 200 });
    }

    // 乐观锁：只有 pending 状态才处理（防重放）
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('order_no', order_no)
      .eq('status', 'pending')
      .select('id, user_id, plan_id, total_amount')
      .maybeSingle();

    if (error || !updated) {
      console.log(`[webhook] 订单 ${order_no} 已处理或不存在，跳过`);
      return new Response('ok', { status: 200 });
    }

    console.log(`[webhook] 订单 ${order_no} 支付成功，开通套餐`);

    // 查询套餐详情
    const { data: plan } = await supabase
      .from('plans')
      .select('id, credits, name, level')
      .eq('id', updated.plan_id)
      .maybeSingle();

    if (plan && updated.user_id) {
      if (plan.level < 0) {
        // 流量加油包逻辑：仅增加积分
        const { data: currentPlan } = await supabase
          .from('user_plans')
          .select('credits_total, plan_id, status')
          .eq('user_id', updated.user_id)
          .maybeSingle();

        const currentCreditsTotal = currentPlan?.credits_total || 0;
        
        await supabase.from('user_plans').upsert({
          user_id: updated.user_id,
          credits_total: currentCreditsTotal + plan.credits,
          // 如果没有套餐，默认给个状态
          status: currentPlan?.status || 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        // 写入积分日志
        await supabase.from('credit_logs').insert({
          user_id: updated.user_id,
          action: 'booster_purchase',
          amount: plan.credits,
          balance_after: currentCreditsTotal + plan.credits,
        });
      } else {
        // 更新 user_plans：开通套餐 + 重置积分
        const now = new Date();
        const expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

        await supabase.from('user_plans').upsert({
          user_id: updated.user_id,
          plan_id: plan.id,
          credits_total: plan.credits,
          credits_used: 0,
          expires_at: expiresAt,
          status: 'active',
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id' });

        // 写入积分日志
        await supabase.from('credit_logs').insert({
          user_id: updated.user_id,
          action: 'plan_purchase',
          amount: plan.credits,
          balance_after: plan.credits,
        });
      }
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('[webhook] error:', e instanceof Error ? e.message : e);
    return new Response('ok', { status: 200 }); // 始终返回 200 避免重试风暴
  }
});
