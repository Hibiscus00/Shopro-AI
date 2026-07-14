import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Sparkles, ChevronDown, ImageIcon, Video, Wand2,
  BarChart2, Droplets, ArrowUpCircle, Mic, Globe, RefreshCcw,
  MoreHorizontal, Maximize2, Copy, Plus, ChevronRight, Loader2, X, Download, Image as ImageIcon2, Layers, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ProductVideoWizard from './VideoCreatePage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sendDeepSeekStreamRequest, sendStepAudioASR, submitSeedanceVideo, querySeedanceVideo } from '@/lib/sse';
import { audioRecorder } from '@/lib/audioRecorder';



const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ── 工具卡片数据 ────────────────────────────────────────────────────────
const QUICK_TOOLS = [
  {
    id: 'script', label: 'AI智能脚本', sub: '智能生成短视频爆款带货脚本',
    gradient: 'from-rose-800/80 to-pink-900/80',
    cover: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=180&fit=crop',
    path: '/script',
  },
  {
    id: 'style-copy', label: '爆款风格复刻', sub: '一键复刻高转化内容风格',
    gradient: 'from-violet-800/80 to-indigo-900/80',
    cover: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=300&h=180&fit=crop',
    path: '/style-copy',
  },
  {
    id: 'competitor', label: '竞品爆款分析', sub: '抓取竞品爆款视频策略',
    gradient: 'from-sky-800/80 to-blue-900/80',
    cover: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300&h=180&fit=crop',
    path: '/competitor',
  },
  {
    id: 'analytics', label: '流量分析', sub: '实时追踪完播率与转化漏斗',
    gradient: 'from-amber-800/80 to-orange-900/80',
    cover: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&h=180&fit=crop',
    path: '/analytics',
  },
  {
    id: 'live-highlight', label: '直播高光切片', sub: 'AI自动识别直播精华',
    gradient: 'from-teal-800/80 to-emerald-900/80',
    cover: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=180&fit=crop',
    path: '/live-highlight',
  },
  {
    id: 'knowledge', label: '知识库', sub: '沉淀带货话术，AI语义检索',
    gradient: 'from-fuchsia-800/80 to-purple-900/80',
    cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=180&fit=crop',
    path: '/knowledge',
  },
];



// 模型与对应后端标识
type ModelId = 'Seedance' | 'Kling' | 'Krea' | 'Luma' | 'pixverse' | 'happyhorse' | 'wan';
const MODELS: { label: string; id: ModelId }[] = [
  { label: 'Seedance 2.0', id: 'Seedance' },
  { label: 'happyhorse 1.0', id: 'happyhorse' },
  { label: 'wan2.7', id: 'wan' },
  { label: 'Kling', id: 'Kling' },
  { label: 'Krea', id: 'Krea' },
  { label: 'Luma', id: 'Luma' },
  { label: 'pixverse', id: 'pixverse' },
];
const RESOLUTIONS = ['720P · 9:16 · 5s', '1080P · 16:9 · 10s', '4K · 1:1 · 8s'];
const INSPIRE_VIDEOS = [
  {
    url: '/Video/CreatOK_2.mp4',
    prompt: '时尚秋季外套女款展示，微风吹拂，高级质感，落叶背景',
    model: 'Seedance 2.0',
    ratio: '9:16',
    refImage: '有参考图',
    firstLast: '无首尾帧',
    category: '服装',
    language: '中文'
  },
  {
    url: '/Video/CreatOK_4.mp4',
    prompt: 'Makeup foundation application, close up on skin smooth blending, soft natural lighting',
    model: 'Kling',
    ratio: '16:9',
    refImage: '无参考图',
    firstLast: '有首尾帧',
    category: '美妆',
    language: '英文'
  },
  {
    url: '/Video/CreatOK_5.mp4',
    prompt: 'Smart watch rotate view, carbon fiber strap, holographic display neon accent',
    model: 'Luma',
    ratio: '1:1',
    refImage: '有参考图',
    firstLast: '有首尾帧',
    category: '数码',
    language: '英文'
  },
  {
    url: '/Video/CreatOK_6.mp4',
    prompt: '美味草莓芝士蛋糕切片，淋上红莓果酱，慢动作，诱人甜点',
    model: 'Krea',
    ratio: '9:16',
    refImage: '无参考图',
    firstLast: '无首尾帧',
    category: '食品',
    language: '中文'
  },
  {
    url: '/Video/CreatOK_7.mp4',
    prompt: 'Nordic style living room, cozy sofa, plant leaf shadow, warm aesthetic room tour',
    model: 'pixverse',
    ratio: '16:9',
    refImage: '有参考图',
    firstLast: '无首尾帧',
    category: '家居',
    language: '德文'
  },
  {
    url: '/Video/CreatOK_8.mp4',
    prompt: '运动女鞋减震底测试，慢镜头起跳落地，水花四溅效果',
    model: 'Seedance 2.0',
    ratio: '9:16',
    refImage: '无参考图',
    firstLast: '有首尾帧',
    category: '服装',
    language: '中文'
  },
  {
    url: '/Video/CreatOK_9.mp4',
    prompt: 'Organic lipstick swatch on hand, gloss reflection, flowers around, cosmetic brand ad',
    model: 'Kling',
    ratio: '9:16',
    refImage: '有参考图',
    firstLast: '有首尾帧',
    category: '美妆',
    language: '英文'
  },
  {
    url: '/Video/CreatOK_10.mp4',
    prompt: 'Wireless earbuds falling into water, high speed splash capture, blue ambient lighting',
    model: 'Luma',
    ratio: '3:4',
    refImage: '无参考图',
    firstLast: '无首尾帧',
    category: '数码',
    language: '日文'
  },
  {
    url: '/Video/CreatOK_11.mp4',
    prompt: '咖啡拿铁拉花艺术过程，心形图案，温暖日光，精致陶瓷杯',
    model: 'Krea',
    ratio: '9:16',
    refImage: '有参考图',
    firstLast: '无首尾帧',
    category: '食品',
    language: '中文'
  }
];

const FILTER_CONFIG = [
  { key: 'model', label: '模型', options: ['全部', 'Seedance 2.0', 'happyhorse 1.0', 'wan2.7', 'Kling', 'Krea', 'Luma', 'pixverse'] },
  { key: 'ratio', label: '比例', options: ['全部', '9:16', '16:9', '1:1', '3:4'] },
  { key: 'refImage', label: '参考图', options: ['全部', '有参考图', '无参考图'] },
  { key: 'firstLast', label: '首尾帧', options: ['全部', '有首尾帧', '无首尾帧'] },
  { key: 'category', label: '商品分类', options: ['全部', '服装', '美妆', '数码', '食品', '家居'] },
  { key: 'language', label: '语言·2', options: ['全部', '中文', '英文', '日文', '德文'] },
];

const MAIN_TABS = ['视频生成', '分镜编辑', '图片生成'];
const INPUT_TABS = ['参考', '首尾帧'];

// ── 图片生成模型与对应标识 ──────────────────────────────────────────────
const IMG_MODELS = [
  { label: 'Flux 1.1 Pro', id: 'Flux' },
  { label: 'Midjourney v6', id: 'Midjourney' },
  { label: 'SDXL 3.0', id: 'SDXL' }
];
const IMG_RESOLUTIONS = [
  '1:1 · 方形 (1024×1024)',
  '16:9 · 横屏 (1280×720)',
  '9:16 · 竖屏 (720×1280)'
];

// ── 主页组件 ───────────────────────────────────────────────────────────
export default function HomePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState(projectId ? '分镜编辑' : '视频生成');
  const [inputTab, setInputTab] = useState('参考');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<{ label: string; id: ModelId }>({ label: 'Seedance 2.0', id: 'Seedance' });
  const [resolution, setResolution] = useState('720P · 9:16 · 5s');
  const [modelOpen, setModelOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);

  // 灵感广场筛选状态
  const [filterModel, setFilterModel] = useState('全部');
  const [filterRatio, setFilterRatio] = useState('全部');
  const [filterRefImage, setFilterRefImage] = useState('全部');
  const [filterFirstLast, setFilterFirstLast] = useState('全部');
  const [filterCategory, setFilterCategory] = useState('全部');
  const [filterLanguage, setFilterLanguage] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const filteredInspireVideos = INSPIRE_VIDEOS.filter(video => {
    if (filterModel !== '全部' && video.model !== filterModel) return false;
    if (filterRatio !== '全部' && video.ratio !== filterRatio) return false;
    if (filterRefImage !== '全部' && video.refImage !== filterRefImage) return false;
    if (filterFirstLast !== '全部' && video.firstLast !== filterFirstLast) return false;
    if (filterCategory !== '全部' && video.category !== filterCategory) return false;
    if (filterLanguage !== '全部' && video.language !== filterLanguage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPrompt = video.prompt.toLowerCase().includes(q);
      const matchModel = video.model.toLowerCase().includes(q);
      const matchCategory = video.category.toLowerCase().includes(q);
      return matchPrompt || matchModel || matchCategory;
    }
    return true;
  });

  // 新增的高级分辨率/宽高比/时长/扩展设置状态
  const [activeResolution, setActiveResolution] = useState('720P');
  const [activeRatio, setActiveRatio] = useState('9:16');
  const [activeDuration, setActiveDuration] = useState(5);
  const [autoOptimize, setAutoOptimize] = useState(false);

  // 新增参考图片、视频、首尾帧的图片上传状态
  const [refImage, setRefImage] = useState<string | null>(null);
  const [refVideo, setRefVideo] = useState<string | null>(null);
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);

  // 语音输入状态
  const [recording, setRecording] = useState(false);

  // 图片生成相关新状态与 ref
  const [imgSubTab, setImgSubTab] = useState('智能绘图');
  const [imgRefImage, setImgRefImage] = useState<string | null>(null);
  const [enhancingImg, setEnhancingImg] = useState(false);
  const [imgRecording, setImgRecording] = useState(false);
  const imgUploadInputRef = useRef<HTMLInputElement>(null);

  // 上传文件的 ref
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);

  const updateResolution = (res: string, ratio: string, dur: number) => {
    setActiveResolution(res);
    setActiveRatio(ratio);
    setActiveDuration(dur);
    setResolution(`${res} · ${ratio} · ${dur}s`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRefImage(reader.result as string);
        toast.success('参考图片已导入');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRefVideo(reader.result as string);
        toast.success('参考视频已导入');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFirstFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFirstFrame(reader.result as string);
        toast.success('首帧图片已导入');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLastFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLastFrame(reader.result as string);
        toast.success('尾帧图片已导入');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceInput = async () => {
    if (recording) {
      setRecording(false);
      toast.info('🎙️ 录音已结束，正在通过 StepAudio 2.5 ASR 进行识别...');
      try {
        const base64Wav = await audioRecorder.stop();
        await sendStepAudioASR({
          audioData: base64Wav,
          onData: (text) => {
            setPrompt(prev => prev + (prev ? '，' : '') + text);
          },
          onComplete: () => {
            toast.success('🎙️ 语音识别完成，已自动填入描述');
          },
          onError: (err) => {
            console.error('ASR error:', err);
            toast.error(`识别失败: ${err.message}`);
          }
        });
      } catch (err) {
        console.error('Failed to stop recording:', err);
        toast.error('录音处理失败，请重试');
      }
    } else {
      try {
        await audioRecorder.start();
        setRecording(true);
        toast.info('🎙️ 录音中... 请说话，再次点击按钮以停止并识别', { duration: 5000 });
      } catch (err) {
        console.error('Microphone access failed:', err);
        toast.error('无法启用麦克风，请检查权限设置');
      }
    }
  };

  // AI生成状态
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 图片生成状态
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgModel, setImgModel] = useState({ label: 'Flux 1.1 Pro', id: 'Flux' });
  const [imgResolution, setImgResolution] = useState('2K · 低 · 1:1');
  const [imgModelOpen, setImgModelOpen] = useState(false);
  const [imgResOpen, setImgResOpen] = useState(false);

  // 图片生成高级配置状态
  const [imgResolutionType, setImgResolutionType] = useState('2K');
  const [imgQuality, setImgQuality] = useState('低');
  const [imgCustomSize, setImgCustomSize] = useState(false);
  const [imgAspect, setImgAspect] = useState('1:1');

  const updateImgResolution = (resType: string, qual: string, aspect: string) => {
    setImgResolutionType(resType);
    setImgQuality(qual);
    setImgAspect(aspect);
    setImgResolution(`${resType} · ${qual} · ${aspect}`);
  };

  const [generatedVideos, setGeneratedVideos] = useState<any[]>([]);
  const [activePlayVideo, setActivePlayVideo] = useState<any>(null);

  const loadGeneratedVideos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('video_projects')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (data) {
      setGeneratedVideos(data);
    }
  }, [user]);

  useEffect(() => {
    loadGeneratedVideos();
  }, [loadGeneratedVideos]);

  const handleEnhanceImgPrompt = async () => {
    if (!imgPrompt.trim()) { toast.error('请输入图片描述'); return; }
    setEnhancingImg(true);

    const originalPrompt = imgPrompt;
    setImgPrompt(''); // 清空，准备流式打字效果

    abortRef.current = new AbortController();
    let fullText = '';

    try {
      await sendDeepSeekStreamRequest({
        messages: [{
          role: 'user',
          content: `请将以下简短图片描述扩展为一段专业的AI绘图提示词，要求：画面细节丰富、构图精美、适合带货电商场景。原文：${originalPrompt}`,
        }],
        max_tokens: 1000,
        onData: (data) => {
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0]?.delta?.content ?? '';
            if (chunk) {
              fullText += chunk;
              setImgPrompt(fullText);
            }
          } catch { /* skip */ }
        },
        onComplete: () => {
          toast.success('图片提示词已增强');
          setEnhancingImg(false);
        },
        onError: (err) => {
          if (!abortRef.current?.signal.aborted) {
            toast.error(`增强失败：${err.message}`);
            setImgPrompt(originalPrompt);
          }
          setEnhancingImg(false);
        },
        signal: abortRef.current.signal,
      });
    } catch (e: unknown) {
      if (!abortRef.current?.signal.aborted) {
        toast.error(`增强失败：${(e as Error).message}`);
        setImgPrompt(originalPrompt);
      }
      setEnhancingImg(false);
    }
  };

  const handleImgVoiceInput = async () => {
    if (imgRecording) {
      setImgRecording(false);
      toast.info('🎙️ 录音已结束，正在通过 StepAudio 2.5 ASR 进行识别...');
      try {
        const base64Wav = await audioRecorder.stop();
        await sendStepAudioASR({
          audioData: base64Wav,
          onData: (text) => {
            setImgPrompt(prev => prev + (prev ? '，' : '') + text);
          },
          onComplete: () => {
            toast.success('🎙️ 语音识别完成，已自动填入描述');
          },
          onError: (err) => {
            console.error('ASR error:', err);
            toast.error(`识别失败: ${err.message}`);
          }
        });
      } catch (err) {
        console.error('Failed to stop recording:', err);
        toast.error('录音处理失败，请重试');
      }
    } else {
      try {
        await audioRecorder.start();
        setImgRecording(true);
        toast.info('🎙️ 录音中... 请说话，再次点击按钮以停止并识别', { duration: 5000 });
      } catch (err) {
        console.error('Microphone access failed:', err);
        toast.error('无法启用麦克风，请检查权限设置');
      }
    }
  };

  const handleImgRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImgRefImage(reader.result as string);
        toast.success('图片导入成功');
      };
      reader.readAsDataURL(file);
    }
  };
  const [imgGenerating, setImgGenerating] = useState(false);
  const [imgProgress, setImgProgress] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const imgTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 提示词增强状态
  const [enhancing, setEnhancing] = useState(false);

  // 停止轮询
  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (imgTimeoutRef.current) { clearInterval(imgTimeoutRef.current); imgTimeoutRef.current = null; }
  }, []);

  // 图片生成处理器
  const handleImageGenerate = () => {
    if (!imgPrompt.trim()) { toast.error('请输入图片描述'); return; }
    setImgGenerating(true);
    setResultImage(null);
    setImgProgress(5);
    
    let currentProgress = 5;
    imgTimeoutRef.current = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      if (currentProgress >= 100) {
        if (imgTimeoutRef.current) clearInterval(imgTimeoutRef.current);
        setImgGenerating(false);
        setImgProgress(100);
        const mockImages = [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
          'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
        ];
        const randomImage = mockImages[Math.floor(Math.random() * mockImages.length)];
        setResultImage(randomImage);
        toast.success('图片生成完成！');
      } else {
        setImgProgress(currentProgress);
      }
    }, 400);
  };

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

  // 轮询 Seedance 任务
  const pollSeedance = useCallback((reqId: string, dbProjectId?: string | null) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        stopPoll();
        setGenerating(false);
        toast.error('视频生成超时，请重试');
        if (dbProjectId) {
          await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
        }
        return;
      }
      try {
        const data = await querySeedanceVideo(reqId);
        const status = data?.status;
        if (status === 'success') {
          stopPoll(); setGenerating(false); setGenProgress(100);
          const videoUrl = data?.outcome?.video_url || data?.video_url;
          if (videoUrl) {
            setResultVideo(videoUrl);
            toast.success('Seedance 视频生成完成！');
            if (dbProjectId) {
              await supabase.from('video_projects').update({
                status: 'completed',
                progress: 100,
                video_url: videoUrl,
                thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&h=360&fit=crop',
              }).eq('id', dbProjectId);
              loadGeneratedVideos();
            }
          }
        } else if (status === 'failed' || status === 'cancelled') {
          stopPoll(); setGenerating(false); toast.error(`视频生成失败: ${data?.error || '模型生成出错'}`);
          if (dbProjectId) {
            await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
          }
        } else {
          const prog = Math.min(95, attempts * 4);
          setGenProgress(prog);
          if (dbProjectId) {
            await supabase.from('video_projects').update({ progress: prog }).eq('id', dbProjectId);
          }
        }
      } catch (e) {
        console.error('seedance poll error', e);
      }
    }, 5000);
  }, [stopPoll, loadGeneratedVideos]);

  // 轮询 Kling 任务
  const pollKling = useCallback((taskId: string, dbProjectId?: string | null) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        stopPoll();
        setGenerating(false);
        toast.error('视频生成超时，请重试');
        if (dbProjectId) {
          await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
        }
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('kling-video-query', { body: { task_id: taskId } });
        if (error) {
          console.error('kling-query error', error);
          return;
        }
        const status = data?.status; // 'SUCCESS' or 'processing' or 'FAILED'
        if (status === 'SUCCESS') {
          stopPoll(); setGenerating(false); setGenProgress(100);
          const videoUrl = data?.video_url || data?.outcome?.video_url;
          if (videoUrl) {
            setResultVideo(videoUrl);
            toast.success('Kling 视频生成完成！');
            if (dbProjectId) {
              await supabase.from('video_projects').update({
                status: 'completed',
                progress: 100,
                video_url: videoUrl,
                thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&h=360&fit=crop',
              }).eq('id', dbProjectId);
              loadGeneratedVideos();
            }
          }
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          stopPoll(); setGenerating(false); toast.error(`视频生成失败: ${data?.error || '模型生成出错'}`);
          if (dbProjectId) {
            await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
          }
        } else {
          const prog = Math.min(95, attempts * 4);
          setGenProgress(prog);
          if (dbProjectId) {
            await supabase.from('video_projects').update({ progress: prog }).eq('id', dbProjectId);
          }
        }
      } catch (e) {
        console.error('kling poll error', e);
      }
    }, 5000);
  }, [stopPoll, loadGeneratedVideos]);

  // 提交生成
  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('请输入视频描述'); return; }
    setGenerating(true); setResultVideo(null); setGenProgress(5); stopPoll();

    try {
      if (model.id === 'Seedance') {
        // 先在数据库中创建视频项目
        let dbProjectId: string | null = null;
        if (user) {
          try {
            const { data: projData, error: projErr } = await supabase.from('video_projects').insert({
              user_id: user.id,
              title: `${model.label} 视频 - ${new Date().toLocaleDateString('zh-CN')}`,
              status: 'processing',
              video_style: model.label,
              duration: Number(activeDuration) || 8,
              prompt_text: prompt,
              progress: 5,
            }).select('id').maybeSingle();
            
            if (projErr) {
              console.error("Failed to insert video project:", projErr);
            } else if (projData) {
              dbProjectId = projData.id;
            }
          } catch (dbErr) {
            console.error("Database insert error:", dbErr);
          }
        }

        const payload: any = {
          prompt,
          duration: activeDuration,
          resolution: '720p',
          ratio: activeRatio,
          watermark: false,
          generate_audio: true,
        };

        if (firstFrame) payload.first_frame = firstFrame;
        if (lastFrame) payload.last_frame = lastFrame;
        
        const reference_images: string[] = [];
        if (refImage) reference_images.push(refImage);
        if (reference_images.length > 0) payload.reference_images = reference_images;

        const reference_videos: string[] = [];
        if (refVideo) reference_videos.push(refVideo);
        if (reference_videos.length > 0) payload.reference_videos = reference_videos;

        const res = await submitSeedanceVideo(payload);
        const reqId = res.request_id;
        if (!reqId) {
          if (dbProjectId) {
            await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
          }
          throw new Error('未获取到 Seedance 任务ID');
        }
        setTaskId(reqId);
        pollSeedance(reqId, dbProjectId);
      } else if (model.id === 'Kling') {
        // 先在数据库中创建视频项目
        let dbProjectId: string | null = null;
        if (user) {
          try {
            const { data: projData, error: projErr } = await supabase.from('video_projects').insert({
              user_id: user.id,
              title: `${model.label} 视频 - ${new Date().toLocaleDateString('zh-CN')}`,
              status: 'processing',
              video_style: model.label,
              duration: Number(activeDuration) || 8,
              prompt_text: prompt,
              progress: 5,
            }).select('id').maybeSingle();
            
            if (projErr) {
              console.error("Failed to insert video project:", projErr);
            } else if (projData) {
              dbProjectId = projData.id;
            }
          } catch (dbErr) {
            console.error("Database insert error:", dbErr);
          }
        }

        const payload: any = {
          prompt,
          duration: activeDuration,
        };
        
        if (refImage) {
          payload.image_list = [refImage];
        } else if (firstFrame) {
          payload.image_list = [firstFrame];
        }

        const { data, error } = await supabase.functions.invoke('kling-video-create', { body: payload });
        if (error) {
          const msg = await error?.context?.text();
          throw new Error(msg || error.message);
        }
        
        const task_id = data?.task_id;
        if (!task_id) {
          if (dbProjectId) {
            await supabase.from('video_projects').update({ status: 'failed' }).eq('id', dbProjectId);
          }
          throw new Error('未获取到 Kling 任务ID');
        }
        setTaskId(task_id);
        pollKling(task_id, dbProjectId);
      } else if (['Krea', 'Luma', 'pixverse', 'happyhorse', 'wan'].includes(model.id)) {
        // 模拟生成过程，展示高保真原型
        let dbProjectId: string | null = null;
        if (user) {
          try {
            const { data: projData, error: projErr } = await supabase.from('video_projects').insert({
              user_id: user.id,
              title: `${model.label} 视频 - ${new Date().toLocaleDateString('zh-CN')}`,
              status: 'processing',
              video_style: model.label,
              duration: Number(activeDuration) || 8,
              prompt_text: prompt,
              progress: 5,
            }).select('id').maybeSingle();
            
            if (projErr) {
              console.error("Failed to insert video project:", projErr);
            } else if (projData) {
              dbProjectId = projData.id;
            }
          } catch (dbErr) {
            console.error("Database insert error:", dbErr);
          }
        }

        const simulatedTaskId = `sim_${Math.random().toString(36).substring(2, 11)}`;
        setTaskId(simulatedTaskId);

        let currentProgress = 5;
        pollRef.current = setInterval(async () => {
          currentProgress += Math.floor(Math.random() * 15) + 10;
          if (currentProgress >= 100) {
            stopPoll();
            setGenerating(false);
            setGenProgress(100);
            
            const mockVideos = [
              'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-illuminated-city-street-40019-large.mp4',
              'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-smartphone-with-a-vertical-video-of-a-woman-41865-large.mp4',
              'https://assets.mixkit.co/videos/preview/mixkit-coffee-pour-in-slow-motion-42289-large.mp4',
              'https://assets.mixkit.co/videos/preview/mixkit-woman-shopping-online-on-smartphone-41867-large.mp4'
            ];
            const randomVideo = mockVideos[Math.floor(Math.random() * mockVideos.length)];
            setResultVideo(randomVideo);
            toast.success(`${model.label} 视频生成完成！`);

            if (dbProjectId) {
              await supabase.from('video_projects').update({
                status: 'completed',
                progress: 100,
                video_url: randomVideo,
                thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&h=360&fit=crop',
              }).eq('id', dbProjectId);
              loadGeneratedVideos();
            }
          } else {
            setGenProgress(currentProgress);
            if (dbProjectId) {
              await supabase.from('video_projects').update({ progress: currentProgress }).eq('id', dbProjectId);
            }
          }
        }, 1500);
      } else {
        toast.error('该视频模型暂未接入生成接口');
        setGenerating(false); setGenProgress(0);
      }
    } catch (e: unknown) {
      setGenerating(false); setGenProgress(0);
      toast.error(`生成失败：${(e as Error).message}`);
    }
  };

  // DeepSeek-V4-Pro 提示词增强 (流式打字机效果)
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) { toast.error('请先输入基础描述'); return; }
    setEnhancing(true);

    const originalPrompt = prompt;
    setPrompt(''); // 清空并在生成时使用流式打字机效果

    abortRef.current = new AbortController();
    let fullText = '';

    try {
      await sendDeepSeekStreamRequest({
        messages: [{
          role: 'user',
          content: `请将以下简短视频描述扩展为一段专业的AI视频生成提示词，要求：画面细节丰富、镜头语言清晰、氛围感强、适合带货电商场景。原文：${originalPrompt}`,
        }],
        max_tokens: 1000,
        onData: (data) => {
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0]?.delta?.content ?? '';
            if (chunk) {
              fullText += chunk;
              setPrompt(fullText);
            }
          } catch { /* skip */ }
        },
        onComplete: () => {
          toast.success('提示词已增强');
          setEnhancing(false);
        },
        onError: (err) => {
          if (!abortRef.current?.signal.aborted) {
            toast.error(`增强失败：${err.message}`);
            setPrompt(originalPrompt);
          }
          setEnhancing(false);
        },
        signal: abortRef.current.signal,
      });
    } catch (e: unknown) {
      if (!abortRef.current?.signal.aborted) {
        toast.error(`增强失败：${(e as Error).message}`);
        setPrompt(originalPrompt);
      }
      setEnhancing(false);
    }
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
            生成、编辑或复刻电商带货视频
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

        {/* ── 视频生成输入区 ───────────────────────────────────────────────── */}
        {mainTab === '视频生成' && (
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

              {/* 隐藏的文件输入框 */}
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={videoInputRef}
                onChange={handleVideoUpload}
                accept="video/*"
                className="hidden"
              />
              <input
                type="file"
                ref={firstFrameInputRef}
                onChange={handleFirstFrameUpload}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={lastFrameInputRef}
                onChange={handleLastFrameUpload}
                accept="image/*"
                className="hidden"
              />

              {/* 文本输入 */}
              <div className="px-3 md:px-4 pb-2 pt-2 flex flex-col gap-2">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="flex gap-1.5 pt-1 shrink-0 items-center">
                    {inputTab === '首尾帧' ? (
                      <div className="flex items-center gap-1 shrink-0 mr-1 select-none">
                        {/* 首帧 */}
                        <div
                          onClick={() => firstFrameInputRef.current?.click()}
                          className={cn(
                            "w-11 h-[72px] rounded-lg border border-dashed border-white/20 hover:border-white/40 bg-white/4 flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden transform rotate-[-6deg] cursor-pointer",
                            firstFrame && "border-solid border-emerald-500/50"
                          )}
                        >
                          {firstFrame ? (
                            <>
                              <img src={firstFrame} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setFirstFrame(null); }}
                                className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/70 hover:bg-black flex items-center justify-center text-white"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-white/40 mb-0.5" />
                              <span className="text-[9px] text-white/40 font-medium leading-none">首帧</span>
                            </>
                          )}
                        </div>

                        {/* 双向箭头 */}
                        <span className="text-white/20 text-[9px] font-bold mx-0.5">↔</span>

                        {/* 尾帧 */}
                        <div
                          onClick={() => lastFrameInputRef.current?.click()}
                          className={cn(
                            "w-11 h-[72px] rounded-lg border border-dashed border-white/20 hover:border-white/40 bg-white/4 flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden transform rotate-[6deg] cursor-pointer",
                            lastFrame && "border-solid border-emerald-500/50"
                          )}
                        >
                          {lastFrame ? (
                            <>
                              <img src={lastFrame} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setLastFrame(null); }}
                                className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/70 hover:bg-black flex items-center justify-center text-white"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-white/40 mb-0.5" />
                              <span className="text-[9px] text-white/40 font-medium leading-none">尾帧</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-white/60" />
                        </button>
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          <Video className="w-3.5 h-3.5 text-white/60" />
                        </button>
                      </>
                    )}
                  </div>
                  <textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
                    placeholder="描述视频画面内容和动态过程，使用 @ 指定参考图或参考视频"
                    className="flex-1 min-w-0 bg-transparent resize-none text-sm text-white/80 placeholder:text-white/25 outline-none min-h-[72px] leading-relaxed"
                    disabled={generating}
                  />
                </div>

                {/* 上传的参考图片或视频预览 */}
                {(refImage || refVideo) && (
                  <div className="flex gap-3 px-12 pb-2">
                    {refImage && (
                      <div className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden group">
                        <img src={refImage} alt="Ref Image" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setRefImage(null)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                    {refVideo && (
                      <div className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden group bg-black/40 flex items-center justify-center">
                        <Video className="w-6 h-6 text-white/40" />
                        <button
                          type="button"
                          onClick={() => setRefVideo(null)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
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

                  {/* 分辨率与高级参数弹窗 */}
                  <div className="relative">
                    <button onClick={() => { setResOpen(o => !o); setModelOpen(false); }}
                      className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-xs text-white/70 transition-colors border border-white/8">
                      <BarChart2 className="w-3 h-3" />
                      <span className="hidden sm:inline">{resolution}</span>
                      <span className="sm:hidden">尺寸</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {resOpen && (
                      <div className="absolute top-full mt-2 left-0 z-50 bg-[#16151f] border border-white/10 rounded-2xl shadow-2xl p-4 w-[320px] space-y-4 text-white">
                        {/* 分辨率 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">分辨率</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['720P', '1080P'].map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => updateResolution(r, activeRatio, activeDuration)}
                                className={cn(
                                  "py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                                  activeResolution === r
                                    ? "bg-white/15 text-white border border-white/20"
                                    : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 宽高比 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">宽高比</label>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              { label: '9:16', style: 'w-2.5 h-4.5' },
                              { label: '16:9', style: 'w-4.5 h-2.5' },
                              { label: '1:1', style: 'w-3.5 h-3.5' },
                              { label: '3:4', style: 'w-3 h-4' },
                              { label: '4:3', style: 'w-4 h-3' },
                            ].map(item => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => updateResolution(activeResolution, item.label, activeDuration)}
                                className={cn(
                                  "flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 h-16",
                                  activeRatio === item.label
                                    ? "bg-white/15 text-white border-white/20"
                                    : "bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/70"
                                )}
                              >
                                <div className={cn("border-2 border-current rounded-sm mb-1.5 shrink-0", item.style)} />
                                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 时长 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">时长</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={2}
                              max={15}
                              value={activeDuration}
                              onChange={(e) => updateResolution(activeResolution, activeRatio, parseInt(e.target.value))}
                              className="flex-1 accent-white bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1 text-xs shrink-0 min-w-[50px] justify-center">
                              <span className="font-semibold">{activeDuration}</span>
                              <span className="text-white/40">s</span>
                            </div>
                          </div>
                        </div>

                        {/* 扩展 */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-xs text-white/70 font-medium">扩展 (自动优化提示词)</span>
                          <button
                            type="button"
                            onClick={() => setAutoOptimize(!autoOptimize)}
                            className={cn(
                              "w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                              autoOptimize ? "bg-emerald-500" : "bg-white/10"
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200",
                                autoOptimize ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

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
                    <>
                      <button
                        type="button"
                        onClick={handleVoiceInput}
                        className={cn(
                          "w-9 h-9 rounded-xl bg-white/6 hover:bg-white/10 flex items-center justify-center transition-all border border-white/8 shrink-0 text-white/60 hover:text-white/90",
                          recording && "animate-pulse border-red-500/50 text-red-500 bg-red-500/10"
                        )}
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                      <button onClick={handleGenerate}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', boxShadow: '0 0 20px rgba(34,197,94,0.35)' }}>
                        <Plus className="w-3.5 h-3.5" /> AI视频生成
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 图片生成输入区 ────────────────────────────────────────────── */}
        {mainTab === '图片生成' && (
          <div className="rounded-2xl" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)', padding: '1.5px' }}>
            <div className="rounded-[14px] bg-[#16151f]">
              {/* 顶部 Tab + 展开按钮 */}
              <div className="flex items-center justify-between px-3 md:px-4 pt-3 pb-1">
                <div className="flex items-center gap-0.5 overflow-x-auto">
                  {['智能绘图', '智能扩图', '风格融合'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setImgSubTab(t)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap shrink-0',
                        imgSubTab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                      )}
                    >
                      {t === '智能绘图' && <ImageIcon className="w-3.5 h-3.5" />}
                      {t === '智能扩图' && <Maximize2 className="w-3.5 h-3.5" />}
                      {t === '风格融合' && <Layers className="w-3.5 h-3.5" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 隐藏的图片生成参考图输入 */}
              <input
                type="file"
                ref={imgUploadInputRef}
                onChange={handleImgRefImageUpload}
                accept="image/*"
                className="hidden"
              />

              {/* 文本输入 */}
              <div className="px-3 md:px-4 pb-2 flex items-start gap-2 md:gap-3">
                <div className="flex gap-1.5 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => imgUploadInputRef.current?.click()}
                    className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-white/60" />
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={imgPrompt}
                  onChange={e => setImgPrompt(e.target.value)}
                  placeholder={
                    imgSubTab === '智能绘图'
                      ? "描述图片画面内容、细节与构图，例如：‘一个复古风格的胶片相机放在木质桌面上，柔和的夕阳斜照，写实风格，8k分辨率’"
                      : imgSubTab === '智能扩图'
                        ? "上传要扩展的图片并描述扩图的延伸区域与比例，例如：‘扩展画面四周，延伸背景为茂密的森林，自然光线，无缝衔接’"
                        : "上传参考风格图与主体图，描述融合后的画面，例如：‘将主体图的人物置入参考图的赛博朋克霓虹街区风格中，红蓝霓虹光影’"
                  }
                  className="flex-1 min-w-0 bg-transparent resize-none text-sm text-white/80 placeholder:text-white/25 outline-none min-h-[72px] leading-relaxed"
                  disabled={imgGenerating}
                />
              </div>

              {/* 上传的参考图预览 */}
              {imgRefImage && (
                <div className="flex gap-3 px-12 pb-2">
                  <div className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden group">
                    <img src={imgRefImage} alt="Ref Image" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImgRefImage(null)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* 生成进度条 */}
              {imgGenerating && (
                <div className="px-3 md:px-4 pb-2">
                  <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${imgProgress}%` }} />
                  </div>
                  <p className="text-[11px] text-white/30 mt-1">
                    正在绘制中… {imgProgress}%
                  </p>
                </div>
              )}

              {/* 底部工具栏 */}
              <div className="flex items-center justify-between px-3 md:px-4 pb-3 pt-1 border-t border-white/5 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* 模型选择 */}
                  <div className="relative">
                    <button onClick={() => { setImgModelOpen(o => !o); setImgResOpen(false); }}
                      className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-xs text-white/70 transition-colors border border-white/8">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span className="hidden sm:inline">{imgModel.label}</span>
                      <span className="sm:hidden">模型</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {imgModelOpen && (
                      <div className="absolute top-full mt-1 left-0 z-50 bg-[#1e1d2a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[140px]">
                        {IMG_MODELS.map(m => (
                          <button key={m.id} onClick={() => { setImgModel(m); setImgModelOpen(false); }}
                            className={cn('w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors', m.id === imgModel.id ? 'text-pink-400' : 'text-white/70')}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 尺寸/比例 */}
                  <div className="relative">
                    <button onClick={() => { setImgResOpen(o => !o); setImgModelOpen(false); }}
                      className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-xs text-white/70 transition-colors border border-white/8">
                      <BarChart2 className="w-3 h-3 text-purple-400" />
                      <span className="hidden sm:inline">{imgResolution}</span>
                      <span className="sm:hidden">尺寸</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {imgResOpen && (
                      <div className="absolute top-full mt-2 left-0 z-50 bg-[#16151f] border border-white/10 rounded-2xl shadow-2xl p-4 w-[340px] space-y-4 text-white">
                        {/* 分辨率 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">分辨率</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['1K', '2K', '4K'].map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => updateImgResolution(r, imgQuality, imgAspect)}
                                className={cn(
                                  "py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                  imgResolutionType === r
                                    ? "bg-white/15 text-white border border-white/20"
                                    : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 质量 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">质量</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['低', '中', '高'].map(q => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => updateImgResolution(imgResolutionType, q, imgAspect)}
                                className={cn(
                                  "py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                  imgQuality === q
                                    ? "bg-white/15 text-white border border-white/20"
                                    : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 自定义尺寸 */}
                        <div className="flex items-center justify-between py-1 border-t border-b border-white/5">
                          <span className="text-xs text-white/70 font-medium">自定义尺寸</span>
                          <button
                            type="button"
                            onClick={() => setImgCustomSize(!imgCustomSize)}
                            className={cn(
                              "w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                              imgCustomSize ? "bg-pink-500" : "bg-white/10"
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200",
                                imgCustomSize ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>

                        {/* 比例 */}
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/40 block font-medium">比例</label>
                          <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1">
                            {[
                              { label: 'Auto', style: 'Auto' },
                              { label: '1:1', style: 'w-3 h-3' },
                              { label: '16:9', style: 'w-4.5 h-2.5' },
                              { label: '9:16', style: 'w-2.5 h-4.5' },
                              { label: '4:3', style: 'w-4 h-3' },
                              { label: '3:4', style: 'w-3 h-4' },
                              { label: '3:2', style: 'w-4 h-2.7' },
                              { label: '2:3', style: 'w-2.7 h-4' },
                              { label: '5:4', style: 'w-4 h-3.2' },
                              { label: '4:5', style: 'w-3.2 h-4' },
                              { label: '2:1', style: 'w-5 h-2.5' },
                              { label: '1:2', style: 'w-2.5 h-5' },
                              { label: '21:9', style: 'w-5.5 h-2.3' },
                              { label: '9:21', style: 'w-2.3 h-5.5' },
                            ].map(item => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => updateImgResolution(imgResolutionType, imgQuality, item.label)}
                                className={cn(
                                  "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-200 h-14",
                                  imgAspect === item.label
                                    ? "bg-white/15 text-white border-white/20"
                                    : "bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/70"
                                )}
                              >
                                {item.style === 'Auto' ? (
                                  <Sparkles className="w-3.5 h-3.5 text-pink-400 mb-1 shrink-0" />
                                ) : (
                                  <div className={cn("border-2 border-current rounded-sm mb-1 shrink-0", item.style)} />
                                )}
                                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 提示词增强 */}
                  <button onClick={handleEnhanceImgPrompt} disabled={enhancingImg || imgGenerating}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-xs text-white/70 transition-colors border border-white/8 disabled:opacity-40">
                    {enhancingImg ? <Loader2 className="w-3 h-3 animate-spin text-pink-400" /> : <Sparkles className="w-3.5 h-3.5 text-pink-400" />}
                    提示词增强
                  </button>
                </div>

                <div className="flex items-center gap-2 md:gap-3 ml-auto">
                  {!imgGenerating && (
                    <button
                      type="button"
                      onClick={handleImgVoiceInput}
                      className={cn(
                        "w-9 h-9 rounded-xl bg-white/6 hover:bg-white/10 flex items-center justify-center transition-all border border-white/8 shrink-0 text-white/60 hover:text-white/90",
                        imgRecording && "animate-pulse border-red-500/50 text-red-500 bg-red-500/10"
                      )}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                  {imgGenerating ? (
                    <button onClick={() => { setImgGenerating(false); setImgProgress(0); }}
                      className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
                      <X className="w-3.5 h-3.5" /> 取消
                    </button>
                  ) : (
                    <button onClick={handleImageGenerate}
                      className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', color: '#fff', boxShadow: '0 0 20px rgba(236,72,153,0.35)' }}>
                      <Plus className="w-3.5 h-3.5" /> 生成图片
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 生成结果视频 */}
        {resultVideo && mainTab === '视频生成' && (
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#13121b] mb-6">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white/80">生成结果</span>
                <button
                  onClick={() => navigate('/works')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-primary/20 hover:bg-primary/30 text-primary transition-colors border border-primary/20 flex items-center gap-1"
                >
                  <Video className="w-3 h-3" /> 作品素材
                </button>
              </div>
              <button onClick={() => setResultVideo(null)} className="text-white/30 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <video src={resultVideo} controls autoPlay className="w-full max-h-[60vh] object-contain bg-black" />
          </div>
        )}

        {/* 生成结果图片 */}
        {resultImage && mainTab === '图片生成' && (
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#13121b] max-w-lg mx-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <span className="text-sm font-medium text-white/80">生成结果</span>
              <div className="flex items-center gap-2">
                <a href={resultImage} download="ai_image.png" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white/90 transition-colors">
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => setResultImage(null)} className="text-white/30 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <img src={resultImage} alt="AI Generated" className="w-full object-contain bg-black" />
          </div>
        )}

        {/* ── 功能区、工具条、灵感广场（在生成及绘图选项下显示） ─────────────────── */}
        {mainTab !== '分镜编辑' && (
          <>
            {/* ── 功能区 ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* 左侧大卡：作品素材 */}
              <div className="lg:col-span-2 rounded-2xl p-6 flex flex-col justify-between min-h-[220px] relative overflow-hidden cursor-pointer group"
                style={{ background: 'linear-gradient(135deg,#1a1230 0%,#251840 100%)', border: '1px solid rgba(139,92,246,0.25)' }}
                onClick={() => navigate('/works')}>
                <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=280&fit=crop" alt="作品素材"
                  className="absolute right-0 top-0 w-36 h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity" />
                <div className="relative z-10 space-y-2">
                  <h3 className="text-xl font-bold">作品素材</h3>
                  <p className="text-sm text-white/50">管理已生成的视频与上传的素材库</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['视频作品', '素材管理', '智能剪辑'].map(m => (
                      <span key={m} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/8 text-white/60 border border-white/10">{m}</span>
                    ))}
                  </div>
                </div>
                <button className="relative z-10 w-fit mt-4 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                  onClick={e => { e.stopPropagation(); navigate('/works'); }}>
                  进入管理 →
                </button>
              </div>

              {/* 右侧 2×3 工具卡片 */}
              <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {QUICK_TOOLS.map(tool => (
                  <button key={tool.id} onClick={() => navigate(tool.path)}
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



            {/* ── 灵感广场 ──────────────────────────────────────────────── */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">灵感广场</h2>
                <button className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
                  More <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* 筛选栏 */}
              <div className="flex items-center gap-2 flex-wrap relative">
                {activeDropdown && (
                  <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                )}
                {FILTER_CONFIG.map(f => (
                  <div key={f.key} className="relative z-50">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === f.key ? null : f.key)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors border",
                        (f.key === 'model' && filterModel !== '全部') ||
                        (f.key === 'ratio' && filterRatio !== '全部') ||
                        (f.key === 'refImage' && filterRefImage !== '全部') ||
                        (f.key === 'firstLast' && filterFirstLast !== '全部') ||
                        (f.key === 'category' && filterCategory !== '全部') ||
                        (f.key === 'language' && filterLanguage !== '全部')
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium"
                          : "text-white/60 hover:text-white/90 hover:bg-white/8 border-white/8"
                      )}
                    >
                      {f.label}：{
                        f.key === 'model' ? filterModel :
                        f.key === 'ratio' ? filterRatio :
                        f.key === 'refImage' ? filterRefImage :
                        f.key === 'firstLast' ? filterFirstLast :
                        f.key === 'category' ? filterCategory :
                        filterLanguage
                      }
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {activeDropdown === f.key && (
                      <div className="absolute top-full mt-1.5 left-0 z-50 bg-[#1e1d2a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[120px] max-h-60 overflow-y-auto">
                        {f.options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => {
                              if (f.key === 'model') setFilterModel(opt);
                              else if (f.key === 'ratio') setFilterRatio(opt);
                              else if (f.key === 'refImage') setFilterRefImage(opt);
                              else if (f.key === 'firstLast') setFilterFirstLast(opt);
                              else if (f.key === 'category') setFilterCategory(opt);
                              else if (f.key === 'language') setFilterLanguage(opt);
                              setActiveDropdown(null);
                            }}
                            className={cn(
                              'w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors',
                              (f.key === 'model' && filterModel === opt) ||
                              (f.key === 'ratio' && filterRatio === opt) ||
                              (f.key === 'refImage' && filterRefImage === opt) ||
                              (f.key === 'firstLast' && filterFirstLast === opt) ||
                              (f.key === 'category' && filterCategory === opt) ||
                              (f.key === 'language' && filterLanguage === opt)
                                ? 'text-emerald-400 font-medium'
                                : 'text-white/70'
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* 🔍 搜索提示词或关键词 */}
                <div className="relative ml-auto flex items-center bg-white/4 border border-white/6 rounded-lg px-2.5 py-1 text-xs text-white/70 focus-within:border-white/20 z-50">
                  <span className="mr-1">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索提示词或关键词"
                    className="bg-transparent border-none outline-none text-white text-xs placeholder:text-white/20 w-44"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="ml-1 text-white/30 hover:text-white/60">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 瀑布流视频 4列 */}
              <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                {filteredInspireVideos.map((video, i) => (
                  <div key={i} 
                    className="break-inside-avoid rounded-xl overflow-hidden group cursor-pointer relative bg-black/20"
                    style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={(e) => {
                      const v = e.currentTarget.querySelector('video');
                      if (v) v.play().catch(err => console.log('Autoplay blocked:', err));
                    }}
                    onMouseLeave={(e) => {
                      const v = e.currentTarget.querySelector('video');
                      if (v) {
                        v.pause();
                        v.currentTime = 0;
                      }
                    }}
                    onClick={() => setActivePlayVideo(video)}
                  >
                    <video
                      src={video.url}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 text-white/80 backdrop-blur">{video.model}</span>
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 text-white/80 backdrop-blur">{video.model}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 text-white/80 backdrop-blur">{video.ratio}</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] text-white/90 line-clamp-2 leading-relaxed">{video.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/40">{video.category} · {video.language}</span>
                          <div className="flex gap-1.5">
                            <button className="w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (mainTab === '视频生成') {
                                  setPrompt(video.prompt);
                                  toast.success('已应用该视频的提示词');
                                } else if (mainTab === '图片生成') {
                                  setImgPrompt(video.prompt);
                                  toast.success('已应用该视频的提示词');
                                }
                              }}
                              title="应用此提示词">
                              <Copy className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filteredInspireVideos.length === 0 && (
                <div className="text-center py-10 text-white/30 text-sm">
                  没有找到符合筛选条件的灵感视频
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 视频分析/分镜编辑（5步生成视频卡片） ──────────────────────────────────────── */}
        {mainTab === '分镜编辑' && (
          <div className="w-full -mt-8">
            <ProductVideoWizard />
          </div>
        )}

        {/* 灵感广场视频带声音弹窗播放 */}
        {activePlayVideo && (() => {
          const isVertical = activePlayVideo.ratio === '9:16' || activePlayVideo.ratio === '3:4';
          const isSquare = activePlayVideo.ratio === '1:1';
          const aspectClass = activePlayVideo.ratio === '9:16' ? 'aspect-[9/16]' :
                              activePlayVideo.ratio === '3:4' ? 'aspect-[3/4]' :
                              activePlayVideo.ratio === '1:1' ? 'aspect-square' :
                              'aspect-video';
          return (
            <Dialog open={!!activePlayVideo} onOpenChange={() => setActivePlayVideo(null)}>
              <DialogContent className={cn(
                "bg-zinc-950 border-zinc-800 text-zinc-200 p-0 overflow-hidden",
                isVertical ? "max-w-[380px]" : isSquare ? "max-w-md" : "max-w-2xl"
              )}>
                <DialogHeader className="p-4 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                  <DialogTitle className="text-sm font-semibold truncate pr-4 text-zinc-100">
                    {activePlayVideo.prompt}
                  </DialogTitle>
                </DialogHeader>
                <div className={cn("w-full bg-black relative flex items-center justify-center", aspectClass)}>
                  <video
                    src={activePlayVideo.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

      </div>
    </div>
  );
}
