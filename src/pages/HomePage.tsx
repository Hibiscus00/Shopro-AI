import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, ChevronDown, ImageIcon, Video, Wand2,
  BarChart2, Droplets, ArrowUpCircle, Mic, Globe, RefreshCcw,
  MoreHorizontal, Maximize2, Copy, Plus, ChevronRight, Loader2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

// ── 工具卡片数据 ────────────────────────────────────────────────────────
const QUICK_TOOLS = [
  {
    id: 'replicate', label: '爆款复刻', sub: '快速生成可裂变的爆款视频',
    gradient: 'from-rose-800/80 to-pink-900/80',
    cover: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=180&fit=crop',
  },
  {
    id: 'prompt', label: '提示词反推', sub: '反推生成视频的AI提示词',
    gradient: 'from-violet-800/80 to-indigo-900/80',
    cover: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=300&h=180&fit=crop',
  },
  {
    id: 'subtitle', label: '去字幕', sub: '去除视频字幕',
    gradient: 'from-sky-800/80 to-blue-900/80',
    cover: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300&h=180&fit=crop',
  },
  {
    id: 'product-set', label: '商品套图', sub: '一键生成可上架的商品套图',
    gradient: 'from-amber-800/80 to-orange-900/80',
    cover: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&h=180&fit=crop',
  },
  {
    id: 'detail', label: 'A+ 详情图', sub: '生成专业电商详情图',
    gradient: 'from-teal-800/80 to-emerald-900/80',
    cover: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=180&fit=crop',
  },
  {
    id: 'tryon', label: '换装试穿', sub: 'AI虚拟试穿服装',
    gradient: 'from-fuchsia-800/80 to-purple-900/80',
    cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=180&fit=crop',
  },
];

const STRIP_TOOLS = [
  { icon: Droplets, label: '去水印', color: '#f97316' },
  { icon: ArrowUpCircle, label: '画质提升', color: '#22c55e' },
  { icon: Mic, label: '文字转语音', color: '#a855f7' },
  { icon: RefreshCcw, label: '多角度', color: '#3b82f6' },
  { icon: Globe, label: '图片翻译', color: '#ec4899' },
  { icon: Globe, label: '视频翻译', color: '#14b8a6' },
];

// 模型与对应后端标识
type ModelId = 'Kling' | 'Sora 2' | 'Wan 2.7';
const MODELS: { label: string; id: ModelId }[] = [
  { label: 'Kling 2.1', id: 'Kling' },
  { label: 'Sora 2',    id: 'Sora 2' },
  { label: 'Wan 2.7',   id: 'Wan 2.7' },
];
const RESOLUTIONS = ['720P · 9:16 · 5s', '1080P · 16:9 · 10s', '4K · 1:1 · 8s'];
const INSPIRE_IMGS = [
  'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=450&fit=crop',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=350&fit=crop',
  'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=420&fit=crop',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=380&fit=crop',
];

const MAIN_TABS = ['视频生成', '图片生成', '视频分析'];
const INPUT_TABS = ['参考', '首尾帧', '编辑'];

// ── 主页组件 ───────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState('视频生成');
  const [inputTab, setInputTab] = useState('参考');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<{ label: string; id: ModelId }>({ label: 'Kling 2.1', id: 'Kling' });
  const [resolution, setResolution] = useState('720P · 9:16 · 5s');
  const [modelOpen, setModelOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);

  // AI生成状态
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 提示词增强状态
  const [enhancing, setEnhancing] = useState(false);

  // 停止轮询
  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // 轮询可灵任务
  const pollKling = useCallback((tid: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 80) { stopPoll(); setGenerating(false); toast.error('视频生成超时，请重试'); return; }
      try {
        const { data, error } = await supabase.functions.invoke('kling-video-query', { body: { task_id: tid } });
        if (error) { const msg = await error?.context?.text(); console.error('kling-query', msg); return; }
        const status = data?.data?.task_status;
        if (status === 'succeed') {
          stopPoll(); setGenerating(false); setGenProgress(100);
          const url = data?.data?.task_result?.videos?.[0]?.publicUrl || data?.data?.task_result?.videos?.[0]?.url;
          if (url) { setResultVideo(url); toast.success('视频生成完成！'); }
        } else if (status === 'failed') {
          stopPoll(); setGenerating(false); toast.error('视频生成失败，请重试');
        } else {
          setGenProgress(Math.min(90, attempts * 5));
        }
      } catch (e) { console.error('poll error', e); }
    }, 7000);
  }, [stopPoll]);

  // 轮询 Sora 任务
  const pollSora = useCallback((vid: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 80) { stopPoll(); setGenerating(false); toast.error('视频生成超时，请重试'); return; }
      try {
        const { data, error } = await supabase.functions.invoke('sora-video-query', { body: { video_id: vid } });
        if (error) { const msg = await error?.context?.text(); console.error('sora-query', msg); return; }
        const status = data?.status;
        if (status === 'completed') {
          stopPoll(); setGenerating(false); setGenProgress(100);
          if (data?.video_url) { setResultVideo(data.video_url); toast.success('Sora 视频生成完成！'); }
        } else if (status === 'failed' || status === 'cancelled') {
          stopPoll(); setGenerating(false); toast.error('视频生成失败，请重试');
        } else {
          setGenProgress(Math.min(90, (data?.progress ?? attempts * 4)));
        }
      } catch (e) { console.error('sora poll error', e); }
    }, 8000);
  }, [stopPoll]);

  // 提交生成
  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('请输入视频描述'); return; }
    setGenerating(true); setResultVideo(null); setGenProgress(5); stopPoll();

    try {
      if (model.id === 'Sora 2') {
        // Sora
        const { data, error } = await supabase.functions.invoke('sora-video-create', {
          body: { prompt, size: resolution.includes('9:16') ? '720x1280' : '1280x720', seconds: 8 },
        });
        if (error) { const msg = await error?.context?.text(); throw new Error(msg || error.message); }
        const vid = data?.id;
        if (!vid) throw new Error('未获取到任务ID');
        setTaskId(vid); pollSora(vid);
      } else {
        // Kling（默认）
        const dur = resolution.includes('5s') ? '5' : resolution.includes('10s') ? '10' : '8';
        const ar = resolution.includes('9:16') ? '9:16' : resolution.includes('1:1') ? '1:1' : '16:9';
        const { data, error } = await supabase.functions.invoke('kling-video-create', {
          body: { prompt, model_name: 'kling-video-o1', mode: 'pro', aspect_ratio: ar, duration: dur },
        });
        if (error) { const msg = await error?.context?.text(); throw new Error(msg || error.message); }
        const tid = data?.data?.task_id;
        if (!tid) throw new Error('未获取到任务ID');
        setTaskId(tid); pollKling(tid);
      }
    } catch (e: unknown) {
      setGenerating(false); setGenProgress(0);
      toast.error(`生成失败：${(e as Error).message}`);
    }
  };

  // MiniMax 提示词增强
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) { toast.error('请先输入基础描述'); return; }
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('minimax-chat', {
        body: {
          messages: [{
            role: 'user',
            content: `请将以下简短视频描述扩展为一段专业的AI视频生成提示词，要求：画面细节丰富、镜头语言清晰、氛围感强、适合带货电商场景。原文：${prompt}`,
          }],
          max_completion_tokens: 512,
        },
      });
      if (error) { const msg = await error?.context?.text(); throw new Error(msg || error.message); }
      const enhanced = data?.choices?.[0]?.message?.content;
      if (enhanced) { setPrompt(enhanced); toast.success('提示词已增强'); }
    } catch (e: unknown) {
      toast.error(`增强失败：${(e as Error).message}`);
    } finally { setEnhancing(false); }
  };

  return (
    <div
      className="min-h-screen w-full text-white overflow-x-hidden"
      style={{ background: 'linear-gradient(160deg,#0e0e12 0%,#14111a 40%,#0c0e14 100%)' }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-10">

        {/* ── 大标题 ────────────────────────────────────────────────── */}
        <div className="text-center space-y-5">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance leading-tight">
            分析、复刻或生成爆款带货视频
          </h1>
          {/* 主 Tab */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-white/10 bg-white/5 backdrop-blur">
            {MAIN_TABS.map(t => (
              <button key={t} onClick={() => setMainTab(t)}
                className={cn('px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  mainTab === t ? 'bg-white text-black shadow' : 'text-white/60 hover:text-white/90')}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* ── 输入区 ───────────────────────────────────────────────── */}
        <div className="rounded-2xl" style={{ background: 'linear-gradient(135deg, #4f3fa8 0%, #1aad6b 50%, #d44800 100%)', padding: '1.5px' }}>
          <div className="rounded-[14px] bg-[#16151f]">
            {/* 顶部 Tab + 展开按钮 */}
            <div className="flex items-center justify-between px-3 md:px-4 pt-3 pb-1">
              <div className="flex items-center gap-0.5 overflow-x-auto">
                {INPUT_TABS.map(t => (
                  <button key={t} onClick={() => setInputTab(t)}
                    className={cn('flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap shrink-0',
                      inputTab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70')}
                  >
                    {t === '参考' && <ImageIcon className="w-3.5 h-3.5" />}
                    {t === '首尾帧' && <Copy className="w-3.5 h-3.5" />}
                    {t === '编辑' && <Wand2 className="w-3.5 h-3.5" />}
                    {t}
                  </button>
                ))}
              </div>
              <button className="text-white/30 hover:text-white/70 transition-colors shrink-0 ml-2">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* 文本输入 */}
            <div className="px-3 md:px-4 pb-2 flex items-start gap-2 md:gap-3">
              <div className="flex gap-1.5 pt-1 shrink-0">
                <button className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <ImageIcon className="w-3.5 h-3.5 text-white/60" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <Video className="w-3.5 h-3.5 text-white/60" />
                </button>
              </div>
              <textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="描述视频画面内容和动态过程，使用 @ 指定参考图或参考视频"
                className="flex-1 min-w-0 bg-transparent resize-none text-sm text-white/80 placeholder:text-white/25 outline-none min-h-[72px] leading-relaxed"
                disabled={generating}
              />
              {/* 提示词向导按钮 */}
              <button
                onClick={handleEnhancePrompt}
                disabled={enhancing || generating}
                className="shrink-0 mt-1 hidden md:flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors whitespace-nowrap border border-white/10 rounded-lg px-2.5 py-1.5 disabled:opacity-40"
              >
                {enhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                提示词向导
              </button>
            </div>

            {/* 生成进度条 */}
            {generating && (
              <div className="px-3 md:px-4 pb-2">
                <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-700" style={{ width: `${genProgress}%` }} />
                </div>
                <p className="text-[11px] text-white/30 mt-1">
                  正在生成中… {genProgress}% {taskId && <span className="text-white/20">#{taskId.slice(0, 8)}</span>}
                </p>
              </div>
            )}

            {/* 底部工具栏 */}
            <div className="flex items-center justify-between px-3 md:px-4 pb-3 pt-1 border-t border-white/5 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 模型选择 */}
                <div className="relative">
                  <button onClick={() => { setModelOpen(o => !o); setResOpen(false); }}
                    className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-xs text-white/70 transition-colors border border-white/8">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span className="hidden sm:inline">{model.label}</span>
                    <span className="sm:hidden">模型</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {modelOpen && (
                    <div className="absolute top-full mt-1 left-0 z-50 bg-[#1e1d2a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[140px]">
                      {MODELS.map(m => (
                        <button key={m.id} onClick={() => { setModel(m); setModelOpen(false); }}
                          className={cn('w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors', m.id === model.id ? 'text-emerald-400' : 'text-white/70')}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 分辨率 */}
                <div className="relative">
                  <button onClick={() => { setResOpen(o => !o); setModelOpen(false); }}
                    className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-xs text-white/70 transition-colors border border-white/8">
                    <BarChart2 className="w-3 h-3" />
                    <span className="hidden sm:inline">{resolution}</span>
                    <span className="sm:hidden">尺寸</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {resOpen && (
                    <div className="absolute top-full mt-1 left-0 z-50 bg-[#1e1d2a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[180px]">
                      {RESOLUTIONS.map(r => (
                        <button key={r} onClick={() => { setResolution(r); setResOpen(false); }}
                          className={cn('w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors', r === resolution ? 'text-emerald-400' : 'text-white/70')}>
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button className="hidden sm:flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-xs text-white/70 transition-colors border border-white/8">
                  <Copy className="w-3 h-3" />生成 1 条
                </button>
                <button onClick={handleEnhancePrompt} disabled={enhancing || generating}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-xs text-white/70 transition-colors border border-white/8 disabled:opacity-40">
                  {enhancing ? <Loader2 className="w-3 h-3 animate-spin text-amber-400" /> : <Sparkles className="w-3 h-3 text-amber-400" />}
                  提示词增强
                </button>
              </div>

              <div className="flex items-center gap-2 md:gap-3 ml-auto">
                <span className="text-xs text-white/25 hidden sm:block">{prompt.length}/8000</span>
                {generating ? (
                  <button onClick={() => { stopPoll(); setGenerating(false); setGenProgress(0); }}
                    className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
                    <X className="w-3.5 h-3.5" /> 取消
                  </button>
                ) : (
                  <button onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', boxShadow: '0 0 20px rgba(34,197,94,0.35)' }}>
                    <Plus className="w-3.5 h-3.5" /> 20
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 生成结果视频 */}
        {resultVideo && (
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#13121b]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <span className="text-sm font-medium text-white/80">生成结果</span>
              <button onClick={() => setResultVideo(null)} className="text-white/30 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <video src={resultVideo} controls autoPlay className="w-full max-h-[60vh] object-contain bg-black" />
          </div>
        )}

        {/* 我生成的视频 链接 */}
        <div className="text-center -mt-4">
          <button onClick={() => navigate('/works')} className="text-sm text-white/40 hover:text-white/70 transition-colors inline-flex items-center gap-1">
            我生成的视频 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── 功能区 ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* 左侧大卡：图片生成 */}
          <div className="lg:col-span-2 rounded-2xl p-6 flex flex-col justify-between min-h-[220px] relative overflow-hidden cursor-pointer group"
            style={{ background: 'linear-gradient(135deg,#1a1230 0%,#251840 100%)', border: '1px solid rgba(139,92,246,0.25)' }}
            onClick={() => navigate('/ai-toolbox')}>
            <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=280&fit=crop" alt="图片生成"
              className="absolute right-0 top-0 w-36 h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity" />
            <div className="relative z-10 space-y-2">
              <h3 className="text-xl font-bold">图片生成</h3>
              <p className="text-sm text-white/50">AI 文生图 / 图生图</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['GPT Image 2', 'Nano Banana 2/Pro', 'Seedream 5'].map(m => (
                  <span key={m} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/8 text-white/60 border border-white/10">{m}</span>
                ))}
              </div>
            </div>
            <button className="relative z-10 w-fit mt-4 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
              onClick={e => { e.stopPropagation(); navigate('/ai-toolbox'); }}>
              立即创作 →
            </button>
          </div>

          {/* 右侧 2×3 工具卡片 */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
            {QUICK_TOOLS.map(tool => (
              <button key={tool.id} onClick={() => navigate('/ai-toolbox')}
                className="relative rounded-xl overflow-hidden group h-[90px] flex items-end p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: '#1a1830', border: '1px solid rgba(255,255,255,0.07)' }}>
                <img src={tool.cover} alt={tool.label} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />
                <div className={cn('absolute inset-0 bg-gradient-to-r opacity-60', tool.gradient)} />
                <div className="relative z-10">
                  <p className="text-sm font-semibold text-white">{tool.label}</p>
                  <p className="text-[10px] text-white/50 leading-tight truncate">{tool.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── 工具条 ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 md:grid-cols-6 rounded-2xl overflow-hidden divide-x divide-white/6"
          style={{ background: '#13121b', border: '1px solid rgba(255,255,255,0.07)' }}>
          {STRIP_TOOLS.map(({ icon: Icon, label, color }) => (
            <button key={label} onClick={() => navigate('/ai-toolbox')}
              className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3 md:py-4 hover:bg-white/5 transition-colors group">
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" style={{ color }} />
              <span className="text-[11px] md:text-sm text-white/60 group-hover:text-white/90 transition-colors">{label}</span>
            </button>
          ))}
        </div>

        {/* ── 灵感广场 ──────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">灵感广场</h2>
            <button className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
              More <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* 筛选栏 */}
          <div className="flex items-center gap-2 flex-wrap">
            {['模型', '比例', '参考图', '首尾帧', '商品分类', '语言·2'].map(f => (
              <button key={f} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white/90 hover:bg-white/8 transition-colors border border-white/8">
                {f} <ChevronDown className="w-3 h-3" />
              </button>
            ))}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors border border-white/6 bg-white/4 ml-auto">
              🔍 搜索提示词或关键词
            </button>
          </div>

          {/* 瀑布流图片 4列 */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {INSPIRE_IMGS.map((src, i) => (
              <div key={i} className="break-inside-avoid rounded-xl overflow-hidden group cursor-pointer relative"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <img src={src} alt="" className="w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 text-white/80 backdrop-blur">Veo 3.1 Fast</span>
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
                    onClick={() => setPrompt(src)}>
                    <Copy className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
