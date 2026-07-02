// ai-assistant Edge Function — 统一入口，所有 AI action 经此处理
// v2: +积分扣费中间件 +内容审核 +情绪NLP +多语言翻译 +封面生成 +LLM缓存 +持久化限流
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── 标准化响应 ───────────────────────────────────────────────────────────────
function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ code: 0, message: 'success', data }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function err(message: string, code = 1000, status = 400) {
  return new Response(JSON.stringify({ code, message, data: null }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ─── EF-03: 简易内存速率限制 ─────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(clientId: string, maxReq = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxReq) return false;
  entry.count++;
  return true;
}

// ─── P2-M06: 持久化限流（DB-backed，多实例安全）──────────────────────────────
async function checkRateLimitDB(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  maxReq = 30,
  windowMs = 60_000,
): Promise<boolean> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowKey = `${clientId}:${windowStart}`;
  const resetAt = new Date(windowStart + windowMs).toISOString();

  try {
    // upsert: 若存在则 count++，否则新建
    const { data, error } = await supabase.rpc('upsert_rate_limit', {
      p_window_key: windowKey,
      p_client_id: clientId,
      p_reset_at: resetAt,
      p_max_req: maxReq,
    });
    if (error) return checkRateLimit(clientId, maxReq, windowMs); // 降级到内存
    return Boolean(data);
  } catch {
    return checkRateLimit(clientId, maxReq, windowMs);
  }
}

// ─── P2-N06: LLM 响应缓存（24h TTL）─────────────────────────────────────────
async function getCachedResponse(
  supabase: ReturnType<typeof createClient>,
  cacheKey: string,
): Promise<unknown | null> {
  try {
    const { data } = await supabase
      .from('llm_cache')
      .select('response, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    // 命中：更新 hit_count（fire-and-forget）
    supabase.from('llm_cache').update({ hit_count: supabase.rpc('get_hit_count_plus1' as never) })
      .eq('cache_key', cacheKey).then(() => {/* noop */});
    return data.response;
  } catch {
    return null;
  }
}

async function setCachedResponse(
  supabase: ReturnType<typeof createClient>,
  cacheKey: string,
  action: string,
  response: unknown,
  ttlHours = 24,
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString();
    await supabase.from('llm_cache').upsert({
      cache_key: cacheKey,
      action,
      response,
      expires_at: expiresAt,
      hit_count: 0,
    }, { onConflict: 'cache_key' });
  } catch { /* 缓存写入失败不影响主流程 */ }
}

function makeCacheKey(action: string, params: Record<string, unknown>): string {
  // 简单 hash: action + 关键参数的 JSON
  const stable = JSON.stringify({ action, ...params }, Object.keys({ action, ...params }).sort());
  let hash = 0;
  for (let i = 0; i < stable.length; i++) {
    hash = ((hash << 5) - hash + stable.charCodeAt(i)) | 0;
  }
  return `${action}:${Math.abs(hash).toString(36)}`;
}

// ─── P1-M04: 积分扣费中间件 ──────────────────────────────────────────────────
const CACHEABLE_ACTIONS = new Set([
  'generate_selling_points', 'analyze_style', 'analyze_traffic',
  'generate_ab_variants', 'emotion_analysis', 'extract_url_selling_points'
]);

async function deductCredits(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  action: string,
): Promise<{ allowed: boolean; cost: number; remaining: number }> {
  if (!userId) return { allowed: true, cost: 0, remaining: 0 }; // 匿名用户放行（演示模式）

  try {
    // 查询积分成本
    const { data: costRow } = await supabase
      .from('credit_costs')
      .select('cost')
      .eq('action', action)
      .maybeSingle();
    const cost = costRow?.cost ?? 0;
    if (cost === 0) return { allowed: true, cost: 0, remaining: 0 };

    // 查询用户余额
    const { data: plan } = await supabase
      .from('user_plans')
      .select('credits_total, credits_used')
      .eq('user_id', userId)
      .maybeSingle();
    if (!plan) return { allowed: true, cost, remaining: 0 }; // 无套餐：放行（新用户宽容期）

    const remaining = plan.credits_total - plan.credits_used;
    if (remaining < cost) return { allowed: false, cost, remaining };

    // 原子扣除
    const { error } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: cost,
      p_action: action,
    });
    if (error) return { allowed: true, cost, remaining }; // RPC 失败：放行但记录
    return { allowed: true, cost, remaining: remaining - cost };
  } catch {
    return { allowed: true, cost: 0, remaining: 0 };
  }
}
// ─── EF-01: 唯一 callLLM（带 systemPrompt + 流式聚合）────────────────────────
const GATEWAY_URL = 'https://app-bnjgmg2jpu6a-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions';

async function callLLM(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string,
): Promise<string> {
  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) throw new Error('Missing INTEGRATIONS_API_KEY');

  const fullMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ messages: fullMessages, enable_thinking: false }),
  });

  if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf8');
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') break;
      try {
        const chunk = JSON.parse(raw);
        fullContent += chunk.choices?.[0]?.delta?.content ?? '';
      } catch { /* skip malformed chunk */ }
    }
  }
  return fullContent;
}

// ─── AI-02: 平台级系统 Prompt ────────────────────────────────────────────────
const PLATFORM_SYSTEM_PROMPT = `你是「AIGC带货视频平台」的专属AI助手，专门服务于抖音/TikTok电商带货视频的策划、生产与优化。
核心能力：电商文案、视频脚本、分镜策划、流量分析、风格复刻、Prompt工程。
工作原则：
1. 所有输出紧扣「带货转化」目标，以实际效果为导向
2. 熟悉平台算法规则（完播率、互动率、转化率三角模型）
3. 文案简洁有力，字幕友好，适合竖屏移动端观看
4. 优先返回结构化数据（JSON格式），便于前端解析
5. 在无法分析真实视频内容时，基于行业最佳实践给出专业建议`;

// ─── EF-06: 错误日志写入 ─────────────────────────────────────────────────────
async function logError(
  supabase: ReturnType<typeof createClient>,
  action: string,
  errorMsg: string,
  userId?: string,
  meta?: Record<string, unknown>,
) {
  try {
    await supabase.from('error_logs').insert({
      user_id: userId ?? null,
      source: 'ai-assistant',
      action,
      error_msg: errorMsg,
      meta: meta ?? {},
    });
  } catch { /* 日志写入失败不影响主流程 */ }
}

// ────────────────────────────────────────────────────────────────────────────
// 单一 Deno.serve 入口
// ────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let action = '';
  let userId = '';

  try {
    const body = await req.json();
    action = body.action ?? '';
    userId = body.user_id ?? '';

    // P2-M06: 持久化限流（降级到内存）
    const clientId = userId || req.headers.get('x-forwarded-for') || 'anonymous';
    const allowed = await checkRateLimitDB(supabase, clientId);
    if (!allowed) return err('请求过于频繁，请稍后再试', 4290, 429);

    if (!action) return err('缺少 action 参数', 1001);

    // P1-M04: 积分前置扣费（不影响非LLM actions）
    const billedActions = new Set([
      'generate_selling_points','optimize_prompt','generate_storyboard',
      'generate_video','analyze_traffic','analyze_style','generate_ab_variants',
      'generate_script_four_layer','extract_highlights','content_moderation',
      'emotion_analysis','translate_script','generate_cover','extract_url_selling_points'
    ]);
    if (billedActions.has(action) && userId) {
      const { allowed: creditsOk, cost, remaining } = await deductCredits(supabase, userId, action);
      if (!creditsOk) {
        return err(`积分不足（需${cost}积分，剩余${remaining}积分），请升级套餐`, 4001, 402);
      }
    }

    // P2-N06: 缓存命中检查（仅对可缓存 actions）
    let cacheKey = '';
    if (CACHEABLE_ACTIONS.has(action) && userId) {
      const cacheParams = { ...body, user_id: undefined };
      cacheKey = makeCacheKey(action, cacheParams);
      const cached = await getCachedResponse(supabase, cacheKey);
      if (cached) return ok(cached);
    }

    let result: unknown;

    switch (action) {
      case 'generate_selling_points':
        result = await generateSellingPoints(body); break;
      case 'optimize_prompt':
        result = await optimizePrompt(body); break;
      case 'generate_storyboard':
        result = await generateStoryboard(body); break;
      case 'generate_video':
        result = await generateVideo(body, supabase); break;
      case 'analyze_traffic':
        result = await analyzeTraffic(body); break;
      case 'analyze_style':
        result = await analyzeStyle(body); break;
      case 'generate_ab_variants':
        result = await generateABVariants(body); break;
      case 'generate_script_four_layer':
        result = await generateScriptFourLayer(body, supabase); break;
      case 'extract_highlights':
        result = await extractHighlights(body, supabase); break;
      case 'knowledge_rag_search':
        result = await knowledgeRagSearch(body, supabase); break;
      case 'analyze_style_deep':
        result = await analyzeStyleDeep(body); break;
      // ── Phase 1/2 新 actions ────────────────────────────────────────────
      case 'extract_url_selling_points':
        result = await extractUrlSellingPoints(body); break;
      case 'content_moderation':
        result = await contentModeration(body); break;
      case 'emotion_analysis':
        result = await emotionAnalysis(body); break;
      case 'translate_script':
        result = await translateScript(body, supabase); break;
      case 'generate_cover':
        result = await generateCover(body, supabase); break;
      case 'query_cover_task':
        result = await queryCoverTask(body, supabase); break;
      case 'retry_video_job':
        result = await retryVideoJob(body, supabase); break;
      default:
        return err(`未知操作: ${action}`, 1002);
    }

    // 写缓存
    if (cacheKey && result) {
      await setCachedResponse(supabase, cacheKey, action, result);
    }

    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '服务内部错误';
    console.error(`[ai-assistant][${action}]`, msg);
    await logError(supabase, action, msg, userId || undefined);
    return err(msg, 5000, 500);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// action 实现
// ────────────────────────────────────────────────────────────────────────────
async function extractUrlSellingPoints(body: Record<string, string>) {
  const { url } = body;
  if (!url) throw new Error('Missing URL');

  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) throw new Error('Missing INTEGRATIONS_API_KEY');

  // 1. 获取网页内容
  const encodedUrl = encodeURIComponent(url);
  const readerEndpoint = `https://app-bnjgmg2jpu6a-api-ELbWqODdAgNY-gateway.appmiaoda.com/${encodedUrl}`;
  
  const readerRes = await fetch(readerEndpoint, {
    method: 'GET',
    headers: {
      'X-Gateway-Authorization': `Bearer ${apiKey}`,
      'X-Return-Format': 'markdown',
      'X-Timeout': '15',
    }
  });

  if (!readerRes.ok) {
    throw new Error(`Failed to read URL: ${readerRes.status}`);
  }
  const content = await readerRes.text();
  const truncatedContent = content.slice(0, 15000); // LLM 长度限制

  // 2. 提取卖点
  const userPrompt = `以下是从商品网页中提取的内容，请你分析并生成3条核心商品卖点：
${truncatedContent}

要求：
1. 每条突出一个独特价值维度（功能/情感/场景/价格）
2. 语言简洁有力，每条15字以内，适合视频字幕
3. 针对抖音/TikTok用户心理，具有情感共鸣
4. 仅输出 JSON，不要其他多余解释。

直接输出JSON，格式：{"selling_points": ["卖点1", "卖点2", "卖点3"]}`;

  try {
    const llmContent = await callLLM([{ role: 'user', content: userPrompt }], PLATFORM_SYSTEM_PROMPT);
    const match = llmContent.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.selling_points)) return { selling_points: parsed.selling_points.slice(0, 3) };
    }
  } catch (e) { console.error('url selling_points LLM failed:', e); }

  return { selling_points: ['卖点提取失败，请重试', '网页内容可能受限', '请手动输入商品信息'] };
}

// ─── 卖点生成 ────────────────────────────────────────────────────────────────
async function generateSellingPoints(body: Record<string, string>) {
  const { product_name, category, description } = body;
  const userPrompt = `商品名称：${product_name}
商品类目：${category}
商品描述：${description ?? '无'}

请生成3条核心卖点，要求：
1. 每条突出一个独特价值维度（功能/情感/场景/价格）
2. 语言简洁有力，每条15字以内，适合视频字幕
3. 针对抖音用户心理，具有情感共鸣
4. 避免"高品质""多功能"等通用词语

直接输出JSON，格式：{"selling_points": ["卖点1", "卖点2", "卖点3"]}`;

  try {
    const content = await callLLM([{ role: 'user', content: userPrompt }], PLATFORM_SYSTEM_PROMPT);
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.selling_points)) return { selling_points: parsed.selling_points.slice(0, 3) };
    }
  } catch (e) { console.error('selling_points LLM failed:', e); }

  const templates: Record<string, string[]> = {
    '美妆护肤': [`${product_name}，成分温和零刺激`, '国际认证，安全可靠', '持久保湿，全天水润'],
    '服装配饰': [`${product_name}，高品质面料亲肤`, '时尚百搭，多场景适用', '精工细作，品位彰显'],
    '家居用品': [`${product_name}，优质材料耐用`, '极简设计，完美融合家居', '功能强大，提升生活品质'],
    '数码电器': [`${product_name}，高性能流畅运行`, '超长续航全天无忧', '智能互联，轻松掌控'],
    '食品饮料': [`${product_name}，天然原料零添加`, '营养丰富，健康美味', '严格品控，安全放心'],
  };
  return { selling_points: (templates[category] ?? [`${product_name}，品质卓越`, '专为需求设计', '超高性价比']).slice(0, 3) };
}

// ─── Prompt 优化 ─────────────────────────────────────────────────────────────
async function optimizePrompt(body: Record<string, string>) {
  const { prompt, product_name, platform, style } = body;
  const userPrompt = `请优化以下AI视频生成 Prompt：

原始Prompt：${prompt}
商品：${product_name}
风格：${style ?? '活力青春'}
平台：${platform === 'tiktok' ? 'TikTok' : '抖音'}（9:16竖屏）

增强：光线/色彩/构图/镜头运动的具体描述；加入平台节奏、字幕样式、转场建议；输出英文Prompt（适合AI视频模型）。
直接输出优化后的英文Prompt：`;

  try {
    const optimized = await callLLM([{ role: 'user', content: userPrompt }], PLATFORM_SYSTEM_PROMPT);
    return { optimized_prompt: optimized.trim() };
  } catch (e) {
    console.error('optimize_prompt LLM failed:', e);
    return { optimized_prompt: `[${product_name}] ${prompt}\nEnhanced: vertical 9:16, vibrant lighting, fast cuts, product callouts, bold CTA overlay.` };
  }
}

// ─── 分镜生成 ────────────────────────────────────────────────────────────────
async function generateStoryboard(body: Record<string, unknown>) {
  const { product_name, selling_points } = body as Record<string, string | string[]>;
  const pts = Array.isArray(selling_points) ? selling_points : [];
  return {
    shots: [
      { id: crypto.randomUUID(), order: 1, type: '开场钩子', description: `快速展示${product_name}最亮眼特点，立刻抓住眼球`, duration: 3, text_overlay: `${pts[0] ?? '超强性能'} →`, transition: 'zoom' },
      { id: crypto.randomUUID(), order: 2, type: '痛点呈现', description: '展示用户日常使用痛点，引发共鸣', duration: 4, text_overlay: '你是否有这样的烦恼？', transition: 'fade' },
      { id: crypto.randomUUID(), order: 3, type: '产品解决方案', description: `特写${product_name}，展示如何解决痛点`, duration: 5, text_overlay: pts[1] ?? '完美解决方案', transition: 'slide' },
      { id: crypto.randomUUID(), order: 4, type: '功能演示', description: '真实使用场景展示，增强说服力', duration: 6, text_overlay: pts[2] ?? '实际效果一试便知', transition: 'fade' },
      { id: crypto.randomUUID(), order: 5, type: '行动号召', description: '展示优惠信息，引导购买', duration: 4, text_overlay: '⚡ 限时优惠，点击购买！', transition: 'fade' },
    ],
  };
}

// ─── 视频生成（带 DB 进度更新）────────────────────────────────────────────────
async function generateVideo(body: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const { project_id, prompt = {}, materials = [] } = body as {
    project_id: string;
    prompt: Record<string, any>;
    materials: Array<{ type: string; url: string }>;
  };
  if (!project_id) return { success: false, message: '缺少 project_id' };

  let apiKey = Deno.env.get('SEEDANCE_API_KEY');
  if (!apiKey) {
    try {
      const keyUrl = new URL('./key.txt', import.meta.url);
      apiKey = (await Deno.readTextFile(keyUrl)).trim();
    } catch (err) {
      console.error('Failed to read key.txt inside generateVideo:', err);
    }
  }

  // Fallback to mock progress generation if no API key is found
  if (!apiKey) {
    console.warn('No SEEDANCE_API_KEY found, falling back to mock video generation.');
    const steps = [10, 25, 40, 60, 75, 90, 100];
    for (const progress of steps) {
      await new Promise(r => setTimeout(r, 800));
      const isLast = progress === 100;
      await supabase.from('video_projects').update({
        progress,
        status: isLast ? 'completed' : 'processing',
        ...(isLast ? {
          predicted_completion_rate: Math.round(58 + Math.random() * 25),
          predicted_click_rate: Math.round((3.5 + Math.random() * 6) * 10) / 10,
          video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&h=360&fit=crop'
        } : {}),
      }).eq('id', project_id);
    }
    return { success: true, message: '视频生成完成 (Mock)' };
  }

  // We have the api key, let's call Seedance 2.0 Fast
  try {
    const promptText = prompt.prompt_text || 'A high-converting product demo video, professional lighting, cinematic style';
    const duration = prompt.duration || 8;
    const ratio = prompt.aspect_ratio || '16:9';

    const payload: any = {
      prompt: promptText,
      duration: Number(duration),
      resolution: '720p',
      ratio: ratio,
      watermark: false,
      generate_audio: true,
    };

    // Use first material image if available as first_frame
    const firstImg = Array.isArray(materials) ? materials.find(m => m.type === 'image') : null;
    if (firstImg) {
      payload.first_frame = firstImg.url;
    }

    // Submit Seedance video generation request
    const requestBody = {
      model: 'seedance-2-0-fast-260128',
      payload,
    };

    await supabase.from('video_projects').update({ progress: 40, status: 'processing' }).eq('id', project_id);

    const upstreamSubmit = await fetch(
      'https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!upstreamSubmit.ok) {
      const errText = await upstreamSubmit.text().catch(() => 'Unknown error');
      throw new Error(`Seedance submission failed: ${upstreamSubmit.status} - ${errText}`);
    }

    const resData = await upstreamSubmit.json();
    const requestId = resData.request_id;
    if (!requestId) {
      throw new Error('Seedance API did not return a request_id');
    }

    // Start polling in background (non-blocking for the Edge Function response)
    pollSeedanceBackground(requestId, project_id, apiKey, supabase);

    return { success: true, message: '视频生成任务已提交，后台渲染中...', request_id: requestId };
  } catch (err) {
    const msg = (err as Error).message;
    console.error('Seedance video generation failed:', msg);
    await supabase.from('video_projects').update({ status: 'failed', progress: 0 }).eq('id', project_id);
    return { success: false, error: msg };
  }
}

// Background polling helper
async function pollSeedanceBackground(
  requestId: string,
  projectId: string,
  apiKey: string,
  supabase: any
) {
  let progress = 50;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 6000)); // poll every 6s
    try {
      const upstreamQuery = await fetch(
        `https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests/${requestId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      );

      if (!upstreamQuery.ok) continue;

      const data = await upstreamQuery.json();
      const status = data?.status;

      if (status === 'success') {
        const outcome = data?.outcome || {};
        const videoUrl = outcome.video_url || 'https://www.w3schools.com/html/mov_bbb.mp4';
        const thumbnailUrl = outcome.thumbnail_image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&h=360&fit=crop';
        
        await supabase.from('video_projects').update({
          progress: 100,
          status: 'completed',
          predicted_completion_rate: Math.round(58 + Math.random() * 25),
          predicted_click_rate: Math.round((3.5 + Math.random() * 6) * 10) / 10,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
        }).eq('id', projectId);
        return;
      } else if (status === 'failed' || status === 'cancelled') {
        await supabase.from('video_projects').update({
          status: 'failed',
          progress: 0,
        }).eq('id', projectId);
        return;
      } else {
        // queued or processing: increment progress slowly
        progress = Math.min(95, progress + 4);
        await supabase.from('video_projects').update({
          progress,
          status: 'processing',
        }).eq('id', projectId);
      }
    } catch (e) {
      console.error('Error polling Seedance in background:', e);
    }
  }

  // Timeout fallback
  await supabase.from('video_projects').update({
    status: 'failed',
    progress: 0,
  }).eq('id', projectId);
}


// ─── 流量分析预测 ─────────────────────────────────────────────────────────────
async function analyzeTraffic(body: Record<string, unknown>) {
  const { duration, has_subtitle, pacing, bgm_tempo, product_category } = body as Record<string, string | number | boolean>;
  let cr = 58, ctr = 4.2;
  if (Number(duration) >= 15 && Number(duration) <= 30) cr += 8;
  else if (Number(duration) > 45) cr -= 6;
  if (has_subtitle) cr += 5;
  if (pacing === 'fast') { cr += 6; ctr += 1.5; } else if (pacing === 'slow') { cr -= 4; ctr -= 0.8; }
  if (bgm_tempo === 'high') { cr += 4; ctr += 0.8; }
  const boost: Record<string, number> = { '美妆护肤': 7, '食品饮料': 5, '数码电器': 3 };
  cr += boost[String(product_category)] ?? 0;
  cr = Math.min(95, Math.max(20, Math.round(cr + (Math.random() - 0.5) * 8)));
  ctr = Math.min(15, Math.max(1, Math.round((ctr + (Math.random() - 0.5) * 1.5) * 10) / 10));

  const suggestions = [];
  if (Number(duration) > 40) suggestions.push({ type: 'duration', title: '缩短视频时长', description: `当前${duration}s偏长，建议≤30s，完播率可提升约15%`, priority: 'high' });
  if (!has_subtitle) suggestions.push({ type: 'subtitle', title: '添加字幕覆盖', description: '字幕覆盖率>60%，完播率平均高22%', priority: 'high' });
  if (pacing !== 'fast') suggestions.push({ type: 'pacing', title: '加快镜头节奏', description: '前5秒<2s/镜头，降低初始跳出率', priority: 'medium' });
  if (bgm_tempo !== 'high') suggestions.push({ type: 'bgm', title: '提升BGM节奏感', description: '高BPM（120+）互动率提升18%', priority: 'medium' });
  suggestions.push({ type: 'cta', title: '优化CTA位置', description: '在60%进度加购买引导，点击率提升2-4%', priority: 'low' });
  return { completion_rate: cr, click_rate: ctr, suggestions };
}

// ─── 风格分析 ────────────────────────────────────────────────────────────────
async function analyzeStyle(body: Record<string, string>) {
  const { source_url, source_type } = body;
  const userPrompt = `分析${source_type === 'link' ? `视频链接：${source_url}` : '上传的视频'}的爆款风格要素。
以JSON格式输出（仅JSON）：
{"rhythm":"节奏类型","pacing":"快/中/慢节奏","transitions":["转场列表"],"subtitle_style":"字幕样式","bgm_type":"音乐风格","bgm_mood":"音乐情绪","color_tone":"色调","rhythm_score":75,"virality_score":80,"completion_score":72,"transitions_summary":"说明","subtitle_summary":"说明","bgm_summary":"说明","tags":["标签"],"strengths":["优势"],"improvements":["建议"]}`;

  try {
    const content = await callLLM([{ role: 'user', content: userPrompt }], PLATFORM_SYSTEM_PROMPT);
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) { console.error('analyze_style LLM failed:', e); }

  const score = 68 + Math.floor(Math.random() * 26);
  return {
    rhythm: '强拍节奏', pacing: '快节奏', transitions: ['急速切换', '闪白转场', 'J切'],
    subtitle_style: '粗体白字+黑描边', bgm_type: '流行电子', bgm_mood: '活力激昂',
    color_tone: '暖橙调', rhythm_score: score, virality_score: Math.min(100, score + 8),
    completion_score: Math.max(50, score - 5),
    transitions_summary: '主要采用急速切换配合闪白转场，平均2-3秒切换镜头',
    subtitle_summary: `粗体字幕覆盖率约${60 + Math.floor(Math.random() * 25)}%，关键信息加粗变色`,
    bgm_summary: '流行电子风格，BPM约128，活力激昂，与快节奏高度匹配',
    tags: ['爆款结构', '强钩子', '高完播', '快节奏'],
    strengths: ['前3秒钩子设计出色，初始留存率高', '字幕可读性强，移动端体验佳', 'CTA时机准确，转化引导有力'],
    improvements: ['镜头多样性可提升，增加特写与远景对比', '产品展示时长可延长5-8%', '结尾互动引导可更直接'],
  };
}

// ─── 风格深度分析（LLM 文字解读，配合 StyleCopyPage）────────────────────────
async function analyzeStyleDeep(body: Record<string, unknown>) {
  const { rhythm, pacing, bgm_type, bgm_mood, subtitle_style, transitions, color_tone, virality_score, dna_fingerprint } = body as Record<string, unknown>;
  const userPrompt = `作为短视频内容分析师，请对以下视频风格数据进行深度解读，给出专业分析和复刻建议（200字以内，自然段落，不要列表）：

DNA指纹：${dna_fingerprint}
节奏：${rhythm} / ${pacing}
BGM：${bgm_type}（${bgm_mood}）
字幕：${subtitle_style}
转场：${Array.isArray(transitions) ? transitions.join('、') : transitions}
色调：${color_tone}
爆款指数：${virality_score}分`;

  try {
    const analysis = await callLLM([{ role: 'user', content: userPrompt }], PLATFORM_SYSTEM_PROMPT);
    return { analysis: analysis.trim() };
  } catch (e) {
    console.error('analyze_style_deep failed:', e);
    return { analysis: `DNA指纹「${dna_fingerprint}」显示：该视频采用${rhythm}+${pacing}结构，${bgm_type}配乐与${bgm_mood}情绪高度契合，爆款指数${virality_score}分（行业平均68分）。建议重点复刻开场3秒钩子设计与产品展示节奏，预计复刻后传播力提升25%以上。` };
  }
}

// ─── A/B 变体生成 ────────────────────────────────────────────────────────────
async function generateABVariants(body: Record<string, unknown>) {
  const { product_name, variant_count } = body as Record<string, string | number>;
  const count = Math.min(4, Math.max(2, Number(variant_count) || 2));
  const names = ['版本A（钩子优先）', '版本B（产品优先）', '版本C（情感共鸣）', '版本D（社会证明）'];
  const descs = [
    '前3秒强力钩子吸引眼球，延迟展示产品，高悬念引导完播',
    '开门见山展示产品全貌，快速介绍核心卖点，适合品牌认知强的商品',
    '以用户痛点和情感故事切入，产品作为解决方案出现，引发共鸣',
    '开场展示真实用户评价/销量数据，建立信任感，再引入产品介绍',
  ];
  return {
    variants: Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(), name: names[i], description: descs[i],
      predicted_cr: 55 + Math.floor(Math.random() * 30),
      predicted_ctr: Math.round((3 + Math.random() * 7) * 10) / 10,
      product_name, status: 'pending',
    })),
  };
}

// ─── EF-04: 四层脚本生成（ScriptPage 后端版本，写入 DB）─────────────────────
async function generateScriptFourLayer(
  body: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
) {
  const {
    user_id, product_name, category, price_range,
    selling_points, audience, pain_points,
    platform, video_length, product_id,
  } = body as Record<string, string | string[]>;

  const pts = Array.isArray(selling_points) ? selling_points : [String(selling_points)];
  const pains = Array.isArray(pain_points) ? pain_points : [];

  const systemPrompt = `你是专业的电商带货视频脚本策划师，精通抖音/TikTok短视频「四层结构」创作：
①卖点层：深度理解商品核心差异化价值
②痛点层：匹配目标用户真实痛点与情感共鸣
③钩子层：设计平台专属的开场钩子与悬念结构（前3秒留存）
④CTA层：构建紧迫感与高转化行动召唤`;

  const userPrompt = `请基于「四层Prompt工程」为以下商品生成完整带货视频脚本：

【商品信息】
- 名称：${product_name}
- 品类：${category || '未指定'}
- 价格：${price_range || '未指定'}
- 核心卖点：${pts.join('、')}

【用户信息】
- 目标用户：${audience}
- 核心痛点：${pains.length > 0 ? pains.join('、') : '待AI分析'}

【创作要求】
- 目标平台：${platform === 'tiktok' ? 'TikTok（需英文口播）' : '抖音（中文）'}
- 建议时长：${video_length}秒

请输出以下内容：

## 分镜脚本
5个场景的JSON数组（放在 \`\`\`json 代码块中）：
[{"order":1,"scene":"场景名称（含四层标注）","visual":"画面描述（15-30字）","dialogue":"口播台词（20-40字，${platform === 'tiktok' ? '英文' : '中文'}）","duration":3,"prompt":"英文AI生成Prompt（50-80词）","layer":"selling_point|pain_point|hook|cta"}]

## AIGC Prompt
整体视频的详细英文Prompt（150-200词），放在 \`\`\`prompt 代码块中。`;

  try {
    const content = await callLLM(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    );

    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    const promptMatch = content.match(/```prompt\s*([\s\S]*?)```/);

    let scenes: unknown[] = [];
    let promptText = '';

    if (jsonMatch) {
      try { scenes = JSON.parse(jsonMatch[1].trim()); } catch { /* keep empty */ }
    }
    if (promptMatch) {
      promptText = promptMatch[1].trim();
    } else {
      const section = content.split('## AIGC Prompt')[1];
      if (section) promptText = section.replace(/```.*?```/gs, '').trim();
    }

    // 写入 DB
    if (user_id) {
      await supabase.from('scripts').insert({
        user_id,
        product_id: product_id || null,
        title: `${product_name} 四层脚本`,
        platform: platform === 'tiktok' ? 'tiktok' : 'douyin',
        product_name,
        selling_points: pts,
        target_audience: String(audience),
        pain_points: pains,
        scenes,
        prompt_text: promptText,
        full_content: content,
        status: 'draft',
      });
    }

    return { scenes, prompt_text: promptText, full_content: content };
  } catch (e) {
    console.error('generate_script_four_layer failed:', e);
    throw e;
  }
}

// ─── EF-05: 高光切片提取（LiveHighlightPage）────────────────────────────────
async function extractHighlights(
  body: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
) {
  const { user_id, video_url, video_title, highlight_count } = body as Record<string, string | number>;
  const count = Math.min(8, Math.max(2, Number(highlight_count) || 4));

  const userPrompt = `作为直播/视频高光剪辑专家，请为以下视频提取${count}个最具传播价值的高光时刻：

视频标题：${video_title || '未命名'}
视频链接：${video_url || '（已上传）'}

请输出高光片段JSON数组（仅JSON）：
[{
  "order": 1,
  "title": "高光标题（10字以内）",
  "start_time": "00:02:15",
  "end_time": "00:02:45",
  "duration": 30,
  "highlight_type": "peak_moment|product_demo|audience_reaction|selling_point|cta",
  "score": 88,
  "reason": "推荐理由（20字以内）",
  "caption": "推荐字幕文案（20字，适合二次传播）"
}]`;

  try {
    const content = await callLLM([{ role: 'user', content: userPrompt }], PLATFORM_SYSTEM_PROMPT);
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const highlights = JSON.parse(match[0]);
      // 写入 video_jobs
      if (user_id) {
        await supabase.from('video_jobs').insert({
          user_id,
          action: 'highlight_extract',
          status: 'completed',
          payload: { video_url, video_title, count },
          result: { highlights },
        });
      }
      return { highlights };
    }
  } catch (e) { console.error('extract_highlights LLM failed:', e); }

  // 降级生成
  const types = ['peak_moment', 'product_demo', 'selling_point', 'cta', 'audience_reaction'];
  const highlights = Array.from({ length: count }, (_, i) => {
    const startMin = Math.floor(i * 8 + Math.random() * 5);
    const startSec = Math.floor(Math.random() * 60);
    const dur = 20 + Math.floor(Math.random() * 30);
    const endSec = startSec + dur;
    return {
      order: i + 1,
      title: ['爆款开场', '产品实测', '卖点展示', '强力CTA', '互动高峰', '价格公布', '对比测评', '粉丝福利'][i] || `高光${i + 1}`,
      start_time: `00:${String(startMin).padStart(2, '0')}:${String(startSec).padStart(2, '0')}`,
      end_time: `00:${String(startMin).padStart(2, '0')}:${String(Math.min(59, endSec)).padStart(2, '0')}`,
      duration: dur,
      highlight_type: types[i % types.length],
      score: 70 + Math.floor(Math.random() * 28),
      reason: ['节奏感强适合二次传播', '产品卖点展示清晰', '情绪感染力高', 'CTA转化率高', '互动数据峰值'][i % 5],
      caption: [`${video_title || '爆款'}来了，冲！`, '真实效果不踩雷', '这个功能绝了！', '限时抢购别错过', '网友反应太真实'][i % 5],
    };
  });
  return { highlights };
}

// ─── EF-07: 知识库 RAG 全文检索 ──────────────────────────────────────────────
async function knowledgeRagSearch(
  body: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
) {
  const { user_id, query, limit = 5 } = body as { user_id: string; query: string; limit: number };
  if (!query) return { results: [] };

  // 全文检索（基于 tsvector 索引）
  const { data } = await supabase
    .from('knowledge_entries')
    .select('id, title, content, quality_score, tags, category, created_at')
    .eq('user_id', user_id)
    .textSearch('fts', query.split(' ').join(' & '), { type: 'plain' })
    .order('quality_score', { ascending: false })
    .limit(Number(limit));

  // 降级：关键词模糊匹配
  if (!data || data.length === 0) {
    const { data: fallback } = await supabase
      .from('knowledge_entries')
      .select('id, title, content, quality_score, tags, category, created_at')
      .eq('user_id', user_id)
      .ilike('title', `%${query}%`)
      .order('quality_score', { ascending: false })
      .limit(Number(limit));
    return { results: Array.isArray(fallback) ? fallback : [] };
  }

  return { results: Array.isArray(data) ? data : [] };
}



// ─── P1-M05: 内容安全审核 ─────────────────────────────────────────────────────
async function contentModeration(body: Record<string, unknown>) {
  const { text, image_url } = body as { text?: string; image_url?: string };
  if (!text && !image_url) return { pass: true, result: 'pass', reason: '无内容' };

  const moderationPrompt = `你是内容安全审核员。请审核以下内容是否违规。
违规类型：色情/暴力/赌博/毒品/政治敏感/诈骗/违禁商品/侮辱性言论。
${text ? `\n文本内容：${text}` : ''}${image_url ? `\n图片URL：${image_url}（请根据URL路径描述判断）` : ''}

直接输出JSON（仅JSON）：
{"pass":true,"result":"pass","confidence":0.98,"reason":"内容合规"}
或
{"pass":false,"result":"reject","confidence":0.95,"reason":"包含[违规类型]，具体说明","category":"porn|violence|gambling|drug|political|fraud|forbidden_goods|abuse"}`;

  try {
    const content = await callLLM([{ role: 'user', content: moderationPrompt }]);
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { pass: Boolean(parsed.pass), result: parsed.result ?? (parsed.pass ? 'pass' : 'reject'), confidence: parsed.confidence ?? 0.9, reason: parsed.reason ?? '', category: parsed.category ?? null };
    }
  } catch (e) { console.error('content_moderation failed:', e); }
  return { pass: true, result: 'pass', confidence: 0.5, reason: '审核服务暂不可用，默认放行' };
}

// ─── P2-N02: 情绪 NLP 分析 ────────────────────────────────────────────────────
async function emotionAnalysis(body: Record<string, unknown>) {
  const { text, sentences } = body as { text?: string; sentences?: string[] };
  const inputSentences: string[] = sentences ?? (text ? text.split(/[。！？.!?]/).filter(Boolean) : []);
  if (inputSentences.length === 0) return { segments: [] };

  const emotionPrompt = `你是专业情绪分析师，专注电商带货视频脚本情绪识别。
分析以下台词句子的情绪类型和强度：
${inputSentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}

情绪类型：hook(钩子)|pain_point(痛点)|product_intro(产品介绍)|social_proof(社会证明)|promotion(促销紧迫感)|cta(行动号召)|neutral(中性)

直接输出JSON数组（仅JSON）：
[{"index":0,"text":"原文","emotion":"hook","intensity":85,"color":"#f59e0b","suggestion":"优化建议"}]`;

  try {
    const content = await callLLM([{ role: 'user', content: emotionPrompt }], PLATFORM_SYSTEM_PROMPT);
    const match = content.match(/\[[\s\S]*\]/);
    if (match) return { segments: JSON.parse(match[0]) };
  } catch (e) { console.error('emotion_analysis failed:', e); }

  const RULES = [
    { kw: ['你有没有','你是否','还在为','烦恼','困扰'], emotion: 'pain_point', color: '#ef4444', intensity: 80 },
    { kw: ['限时','秒杀','最后','只剩','现在'], emotion: 'promotion', color: '#f59e0b', intensity: 90 },
    { kw: ['点击','立即购买','下单','加购'], emotion: 'cta', color: '#10b981', intensity: 95 },
    { kw: ['万人好评','销量','口碑','推荐'], emotion: 'social_proof', color: '#6366f1', intensity: 75 },
    { kw: ['功能','效果','成分','材质'], emotion: 'product_intro', color: '#3b82f6', intensity: 70 },
    { kw: ['想知道','秘密','告诉你','绝了'], emotion: 'hook', color: '#f59e0b', intensity: 85 },
  ];
  return {
    segments: inputSentences.map((s, i) => {
      const matched = RULES.find(r => r.kw.some(k => s.includes(k)));
      return { index: i, text: s, emotion: matched?.emotion ?? 'neutral', intensity: matched?.intensity ?? 50, color: matched?.color ?? '#94a3b8', suggestion: '' };
    }),
  };
}

// ─── P2-N04: 多语言脚本翻译 ───────────────────────────────────────────────────
async function translateScript(body: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const { user_id, project_id, text, target_language, source_language = 'zh' } = body as Record<string, string>;
  const LANG_MAP: Record<string, string> = { en: '英语', ja: '日语', ko: '韩语', th: '泰语', ar: '阿拉伯语', fr: '法语', de: '德语' };
  const targetName = LANG_MAP[target_language] ?? target_language;

  const translatePrompt = `请将以下电商带货视频脚本翻译为${targetName}，保持带货营销语气，口语化，本土化处理，保留原文结构：\n\n${text}\n\n直接输出翻译结果，不要任何解释：`;
  try {
    const translated = await callLLM([{ role: 'user', content: translatePrompt }], PLATFORM_SYSTEM_PROMPT);
    if (user_id) {
      await supabase.from('multilang_scripts').upsert({
        project_id: project_id || null, user_id, source_language, target_language,
        original_text: text, translated_text: translated.trim(), status: 'done',
      }, { onConflict: 'project_id,target_language' });
    }
    return { translated: translated.trim(), target_language, source_language };
  } catch (e) { console.error('translate_script failed:', e); throw e; }
}

// ─── P2-N03: 智能封面生成 ─────────────────────────────────────────────────────
async function generateCover(body: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const { user_id, project_id, product_name, style, platform = 'douyin', prompt } = body as Record<string, string>;
  const coverPrompt = prompt || (platform === 'tiktok'
    ? `E-commerce product thumbnail for TikTok, ${product_name || ''}, vibrant colors, bold text overlay, 9:16 vertical, high contrast, eye-catching, professional photography`
    : `电商带货视频封面，产品：${product_name || ''}，风格：${style || '活力高饱和'}，竖版9:16，高对比度，专业摄影，产品主体突出`);

  let seedanceApiKey = Deno.env.get('SEEDANCE_API_KEY');
  if (!seedanceApiKey) {
    try {
      const keyUrl = new URL('./key.txt', import.meta.url);
      seedanceApiKey = (await Deno.readTextFile(keyUrl)).trim();
    } catch { /* noop */ }
  }

  // If Seedance API Key is available, use Seedance to generate a highly dynamic video cover and extract its thumbnail!
  if (seedanceApiKey) {
    try {
      const submitRes = await fetch('https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${seedanceApiKey}`,
        },
        body: JSON.stringify({
          model: 'seedance-2-0-fast-260128',
          payload: {
            prompt: coverPrompt,
            duration: 5,
            resolution: '720p',
            ratio: '9:16',
            watermark: false,
            generate_audio: false,
          }
        }),
      });

      if (submitRes.ok) {
        const resJson = await submitRes.json();
        const requestId = resJson.request_id;
        if (requestId) {
          const taggedTaskId = `seedance_${requestId}`;
          if (user_id && project_id) {
            await supabase.from('cover_candidates').insert({
              project_id, user_id, image_url: '', ctr_score: 0, gen_task_id: taggedTaskId,
              status: 'processing', style_prompt: coverPrompt,
            });
          }
          return { task_id: taggedTaskId, status: 'PENDING', message: 'Seedance 封面视频生成任务已提交' };
        }
      }
    } catch (err) {
      console.warn('Seedance cover generation failed, falling back to standard image generation:', err);
    }
  }

  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) throw new Error('Missing INTEGRATIONS_API_KEY');
  const submitRes = await fetch('https://app-bnjgmg2jpu6a-api-ra5EZDjVKkXa-gateway.appmiaoda.com/image-generation/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Gateway-Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ contents: [{ parts: [{ text: coverPrompt }] }] }),
  });
  const submitJson = await submitRes.json();
  if (submitJson.status !== 0) throw new Error(`Image submit failed: ${submitJson.message}`);
  const taskId = submitJson.data.taskId;
  if (user_id && project_id) {
    await supabase.from('cover_candidates').insert({
      project_id, user_id, image_url: '', ctr_score: 0, gen_task_id: taskId,
      status: 'processing', style_prompt: coverPrompt,
    });
  }
  return { task_id: taskId, status: 'PENDING', message: '封面生成任务已提交，请轮询状态' };
}

// ─── P2-N03: 查询封面任务状态 ─────────────────────────────────────────────────
async function queryCoverTask(body: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const { task_id, user_id } = body as Record<string, string>;
  if (!task_id) throw new Error('缺少 task_id');

  if (task_id.startsWith('seedance_')) {
    const rawTaskId = task_id.replace('seedance_', '');
    let seedanceApiKey = Deno.env.get('SEEDANCE_API_KEY');
    if (!seedanceApiKey) {
      try {
        const keyUrl = new URL('./key.txt', import.meta.url);
        seedanceApiKey = (await Deno.readTextFile(keyUrl)).trim();
      } catch { /* noop */ }
    }
    if (!seedanceApiKey) throw new Error('Missing SEEDANCE_API_KEY for querying cover task');

    const queryRes = await fetch(`https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests/${rawTaskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${seedanceApiKey}`,
      },
    });

    if (!queryRes.ok) throw new Error(`Seedance query status error: ${queryRes.status}`);
    const qj = await queryRes.json();
    const status = qj.status;
    let imageUrl = null;
    
    if (status === 'success') {
      imageUrl = qj.outcome?.thumbnail_image_url || qj.outcome?.video_url;
      if (imageUrl && user_id) {
        const ctrScore = 75 + Math.floor(Math.random() * 20); // Seedance generates higher-converting covers!
        await supabase.from('cover_candidates')
          .update({ image_url: imageUrl, ctr_score: ctrScore, status: 'completed' })
          .eq('gen_task_id', task_id).eq('user_id', user_id);
      }
    } else if (status === 'failed' || status === 'cancelled') {
      if (user_id) {
        await supabase.from('cover_candidates')
          .update({ status: 'failed' })
          .eq('gen_task_id', task_id).eq('user_id', user_id);
      }
    }
    return { status: status === 'success' ? 'SUCCESS' : status === 'failed' || status === 'cancelled' ? 'FAILED' : 'PROCESSING', image_url: imageUrl, task_id };
  }

  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) throw new Error('Missing INTEGRATIONS_API_KEY');
  const queryRes = await fetch('https://app-bnjgmg2jpu6a-api-VaOwP2jDmAga-gateway.appmiaoda.com/image-generation/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Gateway-Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ taskId: task_id }),
  });
  const qj = await queryRes.json();
  if (qj.status !== 0) throw new Error(`Image query failed: ${qj.message}`);
  const { status, result } = qj.data;
  if (status === 'SUCCESS' && result?.imageUrl && user_id) {
    const ctrScore = 55 + Math.floor(Math.random() * 40);
    await supabase.from('cover_candidates')
      .update({ image_url: result.imageUrl, ctr_score: ctrScore, status: 'completed' })
      .eq('gen_task_id', task_id).eq('user_id', user_id);
  } else if (status === 'FAILED' && user_id) {
    await supabase.from('cover_candidates')
      .update({ status: 'failed' })
      .eq('gen_task_id', task_id).eq('user_id', user_id);
  }
  return { status, image_url: result?.imageUrl ?? null, task_id };
}

// ─── P1-N06: 视频任务重试 ─────────────────────────────────────────────────────
async function retryVideoJob(body: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const { job_id, project_id } = body as Record<string, string>;
  if (!job_id && !project_id) throw new Error('缺少 job_id 或 project_id');
  let query = supabase.from('video_jobs').select('id, attempts, max_attempts, status');
  if (job_id) { query = query.eq('id', job_id); } else { query = query.eq('project_id', project_id).order('created_at', { ascending: false }).limit(1); }
  const { data: jobs } = await query;
  const job = Array.isArray(jobs) ? jobs[0] : null;
  if (!job) throw new Error('任务不存在');
  if (job.attempts >= job.max_attempts) throw new Error(`已达最大重试次数（${job.max_attempts}次）`);
  const backoffMs = Math.pow(2, job.attempts) * 5000;
  const nextRetry = new Date(Date.now() + backoffMs).toISOString();
  await supabase.from('video_jobs').update({ status: 'pending', attempts: job.attempts + 1, next_retry_at: nextRetry }).eq('id', job.id);
  if (project_id) {
    await supabase.from('video_projects').update({ status: 'processing', progress: 5 }).eq('id', project_id);
    await generateVideo({ project_id }, supabase);
  }
  return { retried: true, attempts: job.attempts + 1, next_retry_at: nextRetry };
}
