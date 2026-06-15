import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Play, Pause, SkipBack, SkipForward, Undo, Redo,
  Scissors, Trash2, Copy, Plus, Download, Upload,
  Settings2, ImageIcon, Music, Type, Wand2,
  Layers, Search, Maximize, ZoomIn, ZoomOut, Save, Loader2,
  Film, Sparkles, Music2, Waypoints, ShoppingBag, ChevronDown, ChevronRight,
  FolderOpen, Clock, Cloud, Star, BookOpen,
  Mic, Volume2, RotateCcw, Move, Eye, AlignCenter,
  Tag, Heart, Info, GripVertical, Palette,
  Scissors as ScissorsIcon, Captions, Scan, Smile, Zap,
  Grid3x3, List, X, Check, ChevronUp, ShoppingCart,
  CreditCard, Package, Truck, BadgeCheck, Flame, TrendingUp,
  RefreshCw, SlidersHorizontal, BarChart2, ToggleLeft, ToggleRight,
  EyeOff, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ── 类型定义 ──────────────────────────────────────────────────────────────
interface TrackItem {
  id: string;
  trackId: string;
  name: string;
  start: number;
  duration: number;
  type: 'video' | 'audio' | 'text' | 'image';
  url?: string;
}

// 左侧面板模块枚举
type PanelId =
  | 'media'
  | 'effects'
  | 'text'
  | 'pip'
  | 'audio'
  | 'keyframe'
  | 'ai'
  | 'shop';

// ── 常量数据 ─────────────────────────────────────────────────────────────

// 转场效果数据
const TRANSITIONS = [
  { id: 't1', name: '淡入淡出', category: '基础', color: 'from-zinc-700 to-zinc-600', cover: 'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=200&h=150&fit=crop&auto=format' },
  { id: 't2', name: '叠化溶解', category: '基础', color: 'from-zinc-700 to-zinc-600', cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop&auto=format' },
  { id: 't3', name: '推入', category: '基础', color: 'from-zinc-700 to-zinc-600', cover: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=200&h=150&fit=crop&auto=format' },
  { id: 't4', name: '拉出', category: '基础', color: 'from-zinc-700 to-zinc-600', cover: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200&h=150&fit=crop&auto=format' },
  { id: 't5', name: '闪白', category: '炫酷', color: 'from-yellow-900 to-yellow-700', cover: 'https://images.unsplash.com/photo-1534294668821-28a3054f4256?w=200&h=150&fit=crop&auto=format' },
  { id: 't6', name: '光晕爆炸', category: '炫酷', color: 'from-orange-900 to-orange-700', cover: 'https://images.unsplash.com/photo-1533040539929-e2c29e9dc7fc?w=200&h=150&fit=crop&auto=format' },
  { id: 't7', name: '故障切换', category: '炫酷', color: 'from-purple-900 to-purple-700', cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=150&fit=crop&auto=format' },
  { id: 't8', name: '立体翻转', category: '炫酷', color: 'from-blue-900 to-blue-700', cover: 'https://images.unsplash.com/photo-1586374579358-9d19d632b6df?w=200&h=150&fit=crop&auto=format' },
  { id: 't9', name: '鼓点切', category: '节奏', color: 'from-emerald-900 to-emerald-700', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=150&fit=crop&auto=format' },
  { id: 't10', name: '卡点闪动', category: '节奏', color: 'from-emerald-900 to-emerald-700', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=150&fit=crop&auto=format' },
  { id: 't11', name: '波形跳动', category: '节奏', color: 'from-teal-900 to-teal-700', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=150&fit=crop&auto=format' },
  { id: 't12', name: '旋转卡点', category: '节奏', color: 'from-cyan-900 to-cyan-700', cover: 'https://images.unsplash.com/photo-1501386761578-eaa54b698c29?w=200&h=150&fit=crop&auto=format' },
];

// 滤镜数据
const FILTERS = [
  { id: 'f1', name: '电影感', category: 'LUT', intensity: 80, cover: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=200&h=150&fit=crop&auto=format' },
  { id: 'f2', name: '暖阳', category: 'LUT', intensity: 70, cover: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop&auto=format' },
  { id: 'f3', name: '冷蓝调', category: 'LUT', intensity: 75, cover: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=200&h=150&fit=crop&auto=format' },
  { id: 'f4', name: '复古胶片', category: 'LUT', intensity: 65, cover: 'https://images.unsplash.com/photo-1495434942214-9b525bba74e9?w=200&h=150&fit=crop&auto=format' },
  { id: 'f5', name: '黑白', category: '经典', intensity: 100, cover: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=200&h=150&fit=crop&auto=format&grayscale' },
  { id: 'f6', name: '反色', category: '特殊', intensity: 100, cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=150&fit=crop&auto=format' },
  { id: 'f7', name: '高饱和', category: '调色', intensity: 60, cover: 'https://images.unsplash.com/photo-1490750967868-88df5691cc8e?w=200&h=150&fit=crop&auto=format' },
  { id: 'f8', name: '低饱和', category: '调色', intensity: 50, cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&h=150&fit=crop&auto=format' },
];

// 特效与贴纸
const STICKERS = [
  { id: 's1', name: '粒子光效', category: '动态特效', emoji: '✨', cover: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_7146a0e6-d817-4261-9423-35d4d58110ea.jpg' },
  { id: 's2', name: '烟花爆炸', category: '动态特效', emoji: '🎆', cover: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=200&h=150&fit=crop&auto=format' },
  { id: 's3', name: '心形粒子', category: '动态特效', emoji: '💫', cover: 'https://images.unsplash.com/photo-1516541196182-6bdb0516ed27?w=200&h=150&fit=crop&auto=format' },
  { id: 's4', name: '闪光星', category: '动态特效', emoji: '⭐', cover: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=200&h=150&fit=crop&auto=format' },
  { id: 's5', name: '爱心贴纸', category: '静态贴纸', emoji: '❤️', cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&h=150&fit=crop&auto=format' },
  { id: 's6', name: '笑脸', category: '静态贴纸', emoji: '😊', cover: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=150&fit=crop&auto=format' },
  { id: 's7', name: '话题标签', category: '文字模板', emoji: '#️⃣', cover: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=150&fit=crop&auto=format' },
  { id: 's8', name: '促销角标', category: '文字模板', emoji: '🏷️', cover: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop&auto=format' },
];

// 音频素材
const AUDIO_TRACKS = [
  { id: 'a1', name: '动感电子', duration: '2:30', mood: '活力', genre: '电子', cover: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_42fbe1e8-bcc5-4527-8e83-abdd212429af.jpg' },
  { id: 'a2', name: '温馨钢琴', duration: '3:15', mood: '治愈', genre: '古典', cover: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=200&h=150&fit=crop&auto=format' },
  { id: 'a3', name: '爵士轻快', duration: '2:45', mood: '轻松', genre: '爵士', cover: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=200&h=150&fit=crop&auto=format' },
  { id: 'a4', name: '史诗配乐', duration: '4:00', mood: '激昂', genre: '交响', cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=200&h=150&fit=crop&auto=format' },
  { id: 'a5', name: '环境音·咖啡厅', duration: '5:00', mood: '安静', genre: '环境音', cover: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=200&h=150&fit=crop&auto=format' },
  { id: 'a6', name: '点击音效', duration: '0:01', mood: '功能', genre: '音效', cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop&auto=format' },
];

// 字体样式
const FONT_STYLES = [
  { id: 'fs1', name: '默认文字', preview: 'Aa', weight: '400' },
  { id: 'fs2', name: '粗体标题', preview: 'Aa', weight: '700' },
  { id: 'fs3', name: '花字·彩虹', preview: '彩', weight: '700' },
  { id: 'fs4', name: '霓虹发光', preview: 'Aa', weight: '700' },
  { id: 'fs5', name: '描边文字', preview: 'Aa', weight: '400' },
  { id: 'fs6', name: '字幕样式', preview: 'Aa', weight: '400' },
];

// 入场出场动画
const TEXT_ANIMATIONS = [
  { id: 'ta1', name: '淡入', dir: '入场' },
  { id: 'ta2', name: '从下弹出', dir: '入场' },
  { id: 'ta3', name: '打字机', dir: '入场' },
  { id: 'ta4', name: '旋转进入', dir: '入场' },
  { id: 'ta5', name: '淡出', dir: '出场' },
  { id: 'ta6', name: '向上消散', dir: '出场' },
];

// 混合模式
const BLEND_MODES = ['正常', '正片叠底', '滤色', '叠加', '柔光', '差值', '色相', '饱和度'];

// 音频效果器
const AUDIO_EFFECTS = [
  { id: 'ae1', name: '降噪', icon: '🎚️' },
  { id: 'ae2', name: '均衡器', icon: '📊' },
  { id: 'ae3', name: '变声·机器人', icon: '🤖' },
  { id: 'ae4', name: '变声·儿童', icon: '🎠' },
  { id: 'ae5', name: '混响', icon: '🌊' },
  { id: 'ae6', name: '回声', icon: '🔊' },
];

// 关键帧属性
const KF_PROPERTIES = ['位置X', '位置Y', '缩放', '旋转', '不透明度'];
const KF_CURVES = ['线性', '缓入', '缓出', '缓入缓出', '弹性', '自定义'];

// AI 工具入口
const AI_TOOLS = [
  { id: 'ai1', name: '智能抠像', desc: '一键去除背景', icon: Scan, color: 'text-purple-400', badge: 'AI' },
  { id: 'ai2', name: '美颜美体', desc: '自动磨皮瘦脸', icon: Smile, color: 'text-pink-400', badge: 'AI' },
  { id: 'ai3', name: '自动卡点', desc: '音乐节拍对齐', icon: Zap, color: 'text-yellow-400', badge: 'AI' },
  { id: 'ai4', name: '语音转字幕', desc: '自动识别生成', icon: Captions, color: 'text-blue-400', badge: 'AI' },
  { id: 'ai5', name: '创作脚本', desc: '分镜规划模板', icon: BookOpen, color: 'text-emerald-400', badge: '模板' },
  { id: 'ai6', name: '分镜规划', desc: '导入视频脚本', icon: Grid3x3, color: 'text-indigo-400', badge: '模板' },
];

// ── 子组件：悬停预览卡片 ──────────────────────────────────────────────────
function EffectCard({ name, gradient, applied, onClick, onFavorite, cover }: {
  name: string;
  gradient: string;
  applied?: boolean;
  onClick: () => void;
  onFavorite?: () => void;
  cover?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [favored, setFavored] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{x:number;y:number} | null>(null);

  const handleCtx = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  };

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [ctxMenu]);

  return (
    <div
      className={`group relative aspect-[4/3] rounded border overflow-hidden cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 ${applied ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-zinc-700 hover:border-zinc-500'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setCtxMenu(null); }}
      onClick={onClick}
      onContextMenu={handleCtx}
    >
      {cover
        ? <img src={cover} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        : <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80`} />
      }
      {/* 封面遮罩，增强文字可读性 */}
      <div className="absolute inset-0 bg-black/30" />
      {/* 已应用标识 */}
      {applied && (
        <div className="absolute top-1 left-1 bg-indigo-500 rounded-full p-0.5 z-10">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      {/* 悬停波纹 */}
      {hovered && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-7 h-7 rounded-full border-2 border-white/60 animate-ping opacity-50" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-1.5 py-1 z-10">
        <p className="text-[10px] text-zinc-200 truncate">{name}</p>
      </div>
      {/* 收藏按钮 */}
      <button
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={e => { e.stopPropagation(); setFavored(v => !v); onFavorite?.(); toast.success(favored ? '已取消收藏' : '已收藏'); }}
      >
        <Heart className={`w-3.5 h-3.5 drop-shadow ${favored ? 'fill-red-400 text-red-400' : 'text-white/80'}`} />
      </button>
      {/* 右键菜单 */}
      {ctxMenu && (
        <div
          className="absolute z-50 bg-zinc-800 border border-zinc-600 rounded shadow-xl py-1 min-w-[130px] text-xs"
          style={{ top: Math.min(ctxMenu.y, 60), left: Math.min(ctxMenu.x, 60) }}
          onClick={e => e.stopPropagation()}
        >
          <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-700 text-zinc-200" onClick={() => { onClick(); setCtxMenu(null); }}>
            <Plus className="w-3.5 h-3.5" />添加到时间轴
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-700 text-zinc-200" onClick={() => { setFavored(true); setCtxMenu(null); toast.success('已添加到常用'); }}>
            <Star className="w-3.5 h-3.5" />添加到常用
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-700 text-zinc-200" onClick={() => { toast.info(`${name}：专业级效果`); setCtxMenu(null); }}>
            <Info className="w-3.5 h-3.5" />查看详情
          </button>
        </div>
      )}
    </div>
  );
}

// ── 子组件：折叠区块 ─────────────────────────────────────────────────────
function CollapsibleSection({ title, defaultOpen = true, children, badge }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-800/50">
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs font-medium text-zinc-300 flex items-center gap-2">
          {title}
          {badge && <span className="px-1.5 py-0.5 text-[9px] bg-indigo-600/40 text-indigo-300 rounded">{badge}</span>}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

// ── 子组件：搜索与筛选头部 ───────────────────────────────────────────────
function SearchBar({ placeholder, onSearch }: { placeholder: string; onSearch?: (v: string) => void }) {
  return (
    <div className="px-3 py-2 sticky top-0 bg-zinc-900 z-10 border-b border-zinc-800/50">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 pl-7 pr-3 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          onChange={e => onSearch?.(e.target.value)}
        />
      </div>
    </div>
  );
}

// ── 面板1：媒体库 ────────────────────────────────────────────────────────
function MediaLibraryPanel({ materials, onAdd, importedVideos, onImportVideo }: {
  materials: { id: string; name: string; url: string; type: string }[];
  onAdd: (m: { id: string; name: string; url: string; type: string }) => void;
  importedVideos: { id: string; title: string; video_url: string; thumbnail_url: string | null }[];
  onImportVideo: (v: { id: string; title: string; video_url: string; thumbnail_url: string | null }) => void;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [pickerOpen, setPickerOpen] = useState(false);

  const filtered = materials.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === '全部' || m.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="flex flex-col h-full">
      <SearchBar placeholder="搜索素材名称…" onSearch={setSearch} />

      {/* 筛选 + 视图切换 */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-800/50 flex-wrap">
        {['全部', 'video', 'image', 'audio'].map(t => (
          <button
            key={t}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === '全部' ? '全部' : t === 'video' ? '视频' : t === 'image' ? '图片' : '音频'}
          </button>
        ))}
      </div>

      {/* 上传/添加视频按钮 */}
      <div className="px-3 py-2 border-b border-zinc-800/50">
        <button
          className="w-full flex items-center justify-center gap-2 py-2 rounded border border-dashed border-zinc-600 hover:border-indigo-500 bg-zinc-800/40 hover:bg-indigo-600/10 text-zinc-400 hover:text-indigo-300 transition-all text-[11px] font-medium"
          onClick={() => setPickerOpen(true)}
        >
          <Upload className="w-3.5 h-3.5" />
          上传视频 / 选择已生成视频
        </button>
      </div>

      {/* 已生成视频弹窗 */}
      {pickerOpen && (
        <div className="absolute inset-0 z-30 bg-zinc-950/95 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800 shrink-0">
            <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-indigo-400" />选择已生成的视频
            </span>
            <button className="text-zinc-500 hover:text-white transition-colors" onClick={() => setPickerOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <ScrollArea className="flex-1">
            {importedVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
                <Film className="w-10 h-10 text-zinc-700" />
                <p className="text-[11px] text-zinc-500 text-center">暂无已生成视频，请先在「视频生成」页面完成创作</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {importedVideos.map(v => (
                  <button
                    key={v.id}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-zinc-800/60 border border-zinc-700 hover:border-indigo-500 hover:bg-indigo-600/10 transition-all group text-left"
                    onClick={() => { onImportVideo(v); setPickerOpen(false); }}
                  >
                    <div className="w-16 h-10 rounded overflow-hidden bg-zinc-700 shrink-0">
                      {v.thumbnail_url
                        ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Film className="w-4 h-4 text-zinc-500" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-200 truncate font-medium">{v.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">点击导入到素材库</p>
                    </div>
                    <Plus className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* 素材网格 */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2 grid grid-cols-2 gap-2">
          {filtered.map(m => (
            <div key={m.id} className="aspect-video bg-zinc-800 rounded border border-zinc-700 relative group overflow-hidden hover:border-zinc-500 transition-all hover:-translate-y-0.5 cursor-pointer">
              {m.url ? (
                <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  {m.type === 'audio' ? <Music className="w-5 h-5 text-zinc-600" /> : <ImageIcon className="w-5 h-5 text-zinc-600" />}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-[10px] truncate text-zinc-300">{m.name}</div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full bg-indigo-600/80 text-white hover:bg-indigo-600" onClick={() => onAdd(m)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 py-8 text-center text-[11px] text-zinc-600">
              {materials.length === 0 ? '点击上方按钮添加视频素材' : '无匹配结果'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── 面板2：素材效果 ──────────────────────────────────────────────────────
function EffectsPanel() {
  const [activeTab, setActiveTab] = useState<'transition' | 'filter' | 'sticker' | 'audio'>('transition');
  const [transCategory, setTransCategory] = useState('全部');
  const [appliedTrans, setAppliedTrans] = useState<string | null>(null);
  const [filterIntensity, setFilterIntensity] = useState<Record<string, number>>({});
  const [appliedFilter, setAppliedFilter] = useState<string | null>(null);
  const [appliedStickers, setAppliedStickers] = useState<Set<string>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [addedAudio, setAddedAudio] = useState<Set<string>>(new Set());
  const [moodFilter, setMoodFilter] = useState('全部');
  const [audioSearch, setAudioSearch] = useState('');

  const transCategories = ['全部', '基础', '炫酷', '节奏'];
  const filteredTrans = transCategory === '全部' ? TRANSITIONS : TRANSITIONS.filter(t => t.category === transCategory);
  const filteredAudio = AUDIO_TRACKS.filter(a => {
    const matchMood = moodFilter === '全部' || a.mood === moodFilter || a.genre === moodFilter;
    const matchSearch = a.name.toLowerCase().includes(audioSearch.toLowerCase());
    return matchMood && matchSearch;
  });

  const applyTransition = (id: string, name: string) => {
    setAppliedTrans(id);
    toast.success(`已应用转场：${name}`, { description: '拖拽到两段视频之间可重新定位' });
  };

  const applyFilter = (id: string, name: string) => {
    setAppliedFilter(id === appliedFilter ? null : id);
    toast.success(id === appliedFilter ? `已移除滤镜：${name}` : `已应用滤镜：${name}`);
  };

  const toggleSticker = (id: string, name: string) => {
    setAppliedStickers(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info(`已移除：${name}`); }
      else { next.add(id); toast.success(`已添加：${name}`); }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 子标签栏 */}
      <div className="flex border-b border-zinc-800 shrink-0">
        {([['transition', '转场'], ['filter', '滤镜'], ['sticker', '特效贴纸'], ['audio', '音乐音效']] as const).map(([id, label]) => (
          <button
            key={id}
            className={`flex-1 py-2 text-[11px] transition-colors ${activeTab === id ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        {/* ── 转场效果 ── */}
        {activeTab === 'transition' && (
          <div>
            <div className="px-3 pt-3 pb-2 flex items-center gap-1 flex-wrap">
              {transCategories.map(cat => (
                <button
                  key={cat}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${transCategory === cat ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  onClick={() => setTransCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            {appliedTrans && (
              <div className="mx-3 mb-2 px-2 py-1.5 bg-indigo-600/10 border border-indigo-600/30 rounded flex items-center justify-between">
                <span className="text-[11px] text-indigo-300 flex items-center gap-1.5">
                  <Check className="w-3 h-3" />
                  已应用：{TRANSITIONS.find(t => t.id === appliedTrans)?.name}
                </span>
                <button className="text-[10px] text-zinc-500 hover:text-zinc-300" onClick={() => { setAppliedTrans(null); toast.info('已移除转场'); }}>移除</button>
              </div>
            )}
            <div className="px-3 grid grid-cols-2 gap-2">
              {filteredTrans.map(t => (
                <EffectCard key={t.id} name={t.name} gradient={t.color} cover={t.cover} applied={appliedTrans === t.id} onClick={() => applyTransition(t.id, t.name)} />
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 text-center py-3">点击应用 · 右键更多操作</p>
          </div>
        )}

        {/* ── 滤镜与调色 ── */}
        {activeTab === 'filter' && (
          <div className="px-3 pt-3 space-y-3">
            {appliedFilter && (
              <div className="px-2 py-1.5 bg-indigo-600/10 border border-indigo-600/30 rounded flex items-center justify-between">
                <span className="text-[11px] text-indigo-300 flex items-center gap-1.5">
                  <Check className="w-3 h-3" />已应用：{FILTERS.find(f => f.id === appliedFilter)?.name}
                </span>
                <button className="text-[10px] text-zinc-500 hover:text-zinc-300" onClick={() => { setAppliedFilter(null); toast.info('已移除滤镜'); }}>移除</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {FILTERS.map(f => (
                <div key={f.id} className={`rounded border overflow-hidden bg-zinc-800 transition-all cursor-pointer hover:-translate-y-0.5 ${appliedFilter === f.id ? 'border-indigo-500 ring-1 ring-indigo-500/40' : 'border-zinc-700 hover:border-zinc-500'}`}>
                  <div className="aspect-video relative overflow-hidden">
                    {f.cover
                      ? <img src={f.cover} alt={f.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center"><Palette className="w-6 h-6 text-zinc-400" /></div>
                    }
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-1 right-1 text-[9px] text-zinc-300 bg-black/60 px-1 rounded">{f.category}</div>
                    {appliedFilter === f.id && (
                      <div className="absolute top-1 left-1 bg-indigo-500 rounded-full p-0.5"><Check className="w-2.5 h-2.5 text-white" /></div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-zinc-200 mb-1">{f.name}</p>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Slider
                        value={[filterIntensity[f.id] ?? f.intensity]}
                        onValueChange={([v]) => setFilterIntensity(prev => ({ ...prev, [f.id]: v }))}
                        max={100}
                        className="flex-1 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                      />
                      <span className="text-[10px] text-zinc-500 w-7 text-right">{filterIntensity[f.id] ?? f.intensity}%</span>
                    </div>
                    <button
                      className={`w-full text-center text-[10px] py-1 rounded transition-colors ${appliedFilter === f.id ? 'bg-indigo-600/20 text-indigo-300' : 'text-indigo-400 hover:text-indigo-300 hover:bg-zinc-700'}`}
                      onClick={() => applyFilter(f.id, f.name)}
                    >
                      {appliedFilter === f.id ? '✓ 已应用' : '应用 →'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="w-full py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 border border-dashed border-zinc-700 rounded hover:border-zinc-500 transition-colors"
              onClick={() => { toast.success('当前调色参数已保存为自定义预设'); }}
            >
              + 保存当前为自定义预设
            </button>
          </div>
        )}

        {/* ── 特效与贴纸 ── */}
        {activeTab === 'sticker' && (
          <div className="px-3 pt-3 space-y-1">
            {appliedStickers.size > 0 && (
              <div className="px-2 py-1.5 bg-indigo-600/10 border border-indigo-600/30 rounded flex items-center justify-between mb-2">
                <span className="text-[11px] text-indigo-300">已应用 {appliedStickers.size} 个素材</span>
                <button className="text-[10px] text-zinc-500 hover:text-zinc-300" onClick={() => { setAppliedStickers(new Set()); toast.info('已全部清除'); }}>全部清除</button>
              </div>
            )}
            <CollapsibleSection title="动态特效">
              <div className="pt-2 grid grid-cols-3 gap-2">
                {STICKERS.filter(s => s.category === '动态特效').map(s => (
                  <EffectCard key={s.id} name={s.name} gradient="from-purple-900 to-purple-700" cover={s.cover} applied={appliedStickers.has(s.id)} onClick={() => toggleSticker(s.id, s.name)} />
                ))}
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="贴纸库">
              <div className="pt-2 grid grid-cols-3 gap-2">
                {STICKERS.filter(s => s.category === '静态贴纸').map(s => (
                  <button
                    key={s.id}
                    className={`aspect-square rounded border flex items-center justify-center text-2xl transition-all hover:-translate-y-0.5 ${appliedStickers.has(s.id) ? 'border-indigo-500 bg-indigo-600/10 ring-1 ring-indigo-500/40' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}
                    onClick={() => toggleSticker(s.id, s.name)}
                  >
                    {s.emoji}
                  </button>
                ))}
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="文字模板">
              <div className="pt-2 grid grid-cols-2 gap-2">
                {STICKERS.filter(s => s.category === '文字模板').map(s => (
                  <EffectCard key={s.id} name={s.name} gradient="from-amber-900 to-amber-700" cover={s.cover} applied={appliedStickers.has(s.id)} onClick={() => toggleSticker(s.id, s.name)} />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* ── 音频素材 ── */}
        {activeTab === 'audio' && (
          <div className="pt-2">
            <SearchBar placeholder="按名称、情绪、流派搜索…" onSearch={setAudioSearch} />
            <div className="px-3 pt-2 flex items-center gap-1 flex-wrap pb-2">
              {['全部', '活力', '治愈', '激昂', '音效'].map(mood => (
                <button
                  key={mood}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${moodFilter === mood ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  onClick={() => setMoodFilter(mood)}
                >
                  {mood}
                </button>
              ))}
            </div>
            <div className="px-3 space-y-1.5">
              {filteredAudio.map(a => (
                <div key={a.id} className={`flex items-center gap-2 p-2 rounded border transition-colors group ${addedAudio.has(a.id) ? 'bg-indigo-600/10 border-indigo-600/30' : 'bg-zinc-800/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'}`}>
                  {/* 封面缩略图 + 播放按钮 */}
                  <button
                    className="relative w-10 h-10 rounded overflow-hidden shrink-0 flex items-center justify-center"
                    onClick={() => {
                      if (playingAudio === a.id) { setPlayingAudio(null); toast.info('已停止试听'); }
                      else { setPlayingAudio(a.id); toast.info(`试听：${a.name}`); }
                    }}
                  >
                    {a.cover
                      ? <img src={a.cover} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
                      : <div className={`absolute inset-0 ${playingAudio === a.id ? 'bg-indigo-600' : 'bg-zinc-700'}`} />
                    }
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      {playingAudio === a.id
                        ? <Pause className="w-3.5 h-3.5 text-white fill-current" />
                        : <Play className="w-3.5 h-3.5 text-white fill-current" />}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-200 truncate">{a.name}</p>
                    <p className="text-[10px] text-zinc-500">{a.duration} · {a.mood} · {a.genre}</p>
                    {playingAudio === a.id && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div key={i} className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: `${4 + Math.random() * 8}px`, animationDelay: `${i * 60}ms` }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="shrink-0 transition-all"
                    onClick={() => {
                      setAddedAudio(prev => {
                        const next = new Set(prev);
                        if (next.has(a.id)) { next.delete(a.id); toast.info(`已移除：${a.name}`); }
                        else { next.add(a.id); toast.success(`已添加背景音乐：${a.name}`); }
                        return next;
                      });
                    }}
                  >
                    {addedAudio.has(a.id)
                      ? <Check className="w-4 h-4 text-indigo-400" />
                      : <Plus className="w-4 h-4 text-zinc-400 hover:text-white" />}
                  </button>
                </div>
              ))}
              {filteredAudio.length === 0 && (
                <div className="py-8 text-center text-[11px] text-zinc-500">无匹配音频素材</div>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── 面板3：文本与字幕 ────────────────────────────────────────────────────
function TextSubtitlePanel() {
  const [fontSearch, setFontSearch] = useState('');
  const [selectedFont, setSelectedFont] = useState<string | null>(null);
  const [activeEntrance, setActiveEntrance] = useState<string | null>(null);
  const [activeExit, setActiveExit] = useState<string | null>(null);
  const [letterSpacing, setLetterSpacing] = useState([4]);
  const [lineHeight, setLineHeight] = useState([15]);
  const [shadowBlur, setShadowBlur] = useState([8]);
  const [strokeWidth, setStrokeWidth] = useState([0]);
  const [bgOpacity, setBgOpacity] = useState([0]);
  const [recognizing, setRecognizing] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');

  const handleRecognize = async () => {
    setRecognizing(true);
    toast.info('语音识别中，请稍候…');
    await new Promise(r => setTimeout(r, 1800));
    setRecognizing(false);
    setSubtitleText('限时特惠，今天下单立减50元！');
    toast.success('识别完成，已生成字幕文本');
  };

  return (
    <div className="flex flex-col h-full">
      <SearchBar placeholder="搜索字体、样式…" onSearch={setFontSearch} />
      <ScrollArea className="flex-1">
        {/* 快速添加文本 */}
        <div className="px-3 pt-3 pb-2 border-b border-zinc-800/50">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-zinc-500 placeholder-zinc-600"
              placeholder="输入文本内容，回车添加…"
              value={subtitleText}
              onChange={e => setSubtitleText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && subtitleText.trim()) { toast.success(`已添加文本：${subtitleText}`); setSubtitleText(''); } }}
            />
            <button
              className="px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] shrink-0 transition-colors"
              onClick={() => { if (subtitleText.trim()) { toast.success(`已添加文本：${subtitleText}`); setSubtitleText(''); } }}
            >添加</button>
          </div>
        </div>

        {/* 字体样式 */}
        <CollapsibleSection title="字体样式">
          {selectedFont && (
            <div className="mx-3 mb-2 px-2 py-1.5 bg-indigo-600/10 border border-indigo-600/30 rounded flex items-center justify-between">
              <span className="text-[11px] text-indigo-300 flex items-center gap-1.5"><Check className="w-3 h-3" />已选：{FONT_STYLES.find(f => f.id === selectedFont)?.name}</span>
              <button className="text-[10px] text-zinc-500 hover:text-zinc-300" onClick={() => setSelectedFont(null)}>取消</button>
            </div>
          )}
          <div className="px-3 pt-1 grid grid-cols-2 gap-2">
            {FONT_STYLES.filter(f => f.name.includes(fontSearch) || fontSearch === '').map(f => (
              <button
                key={f.id}
                className={`aspect-[3/2] rounded border flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5 ${selectedFont === f.id ? 'border-indigo-500 bg-indigo-600/10 ring-1 ring-indigo-500/40' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}
                style={{ fontWeight: f.weight }}
                onClick={() => { setSelectedFont(f.id); toast.success(`已选择字体样式：${f.name}`); }}
              >
                <span className="text-lg text-zinc-200">{f.preview}</span>
                <span className="text-[10px] text-zinc-400">{f.name}</span>
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 入场动画 */}
        <CollapsibleSection title="入场动画">
          <div className="px-3 pt-1 grid grid-cols-2 gap-2">
            {TEXT_ANIMATIONS.filter(a => a.dir === '入场').map(a => (
              <button
                key={a.id}
                className={`py-2 rounded border text-[11px] transition-all ${activeEntrance === a.id ? 'border-indigo-500 bg-indigo-600/10 text-indigo-300' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'}`}
                onClick={() => { setActiveEntrance(a.id === activeEntrance ? null : a.id); toast.success(a.id === activeEntrance ? '已移除入场动画' : `入场动画：${a.name}`); }}
              >
                {activeEntrance === a.id && <Check className="inline w-3 h-3 mr-1 text-indigo-400" />}{a.name}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 出场动画 */}
        <CollapsibleSection title="出场动画" defaultOpen={false}>
          <div className="px-3 pt-1 grid grid-cols-2 gap-2">
            {TEXT_ANIMATIONS.filter(a => a.dir === '出场').map(a => (
              <button
                key={a.id}
                className={`py-2 rounded border text-[11px] transition-all ${activeExit === a.id ? 'border-indigo-500 bg-indigo-600/10 text-indigo-300' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'}`}
                onClick={() => { setActiveExit(a.id === activeExit ? null : a.id); toast.success(a.id === activeExit ? '已移除出场动画' : `出场动画：${a.name}`); }}
              >
                {activeExit === a.id && <Check className="inline w-3 h-3 mr-1 text-indigo-400" />}{a.name}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 智能字幕识别 */}
        <CollapsibleSection title="智能字幕" badge="AI">
          <div className="px-3 pt-1 space-y-2">
            <div className="p-3 bg-indigo-600/10 border border-indigo-600/30 rounded space-y-2">
              <p className="text-[11px] text-zinc-300">自动识别视频/音频内容，生成时间轴字幕</p>
              <Button
                size="sm"
                className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]"
                onClick={handleRecognize}
                disabled={recognizing}
              >
                {recognizing ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />识别中…</> : <><Mic className="w-3.5 h-3.5 mr-1.5" />一键识别字幕</>}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-[11px]"
              onClick={() => toast.success('已打开字幕批量编辑器')}
            >
              <AlignCenter className="w-3.5 h-3.5 mr-1.5" />批量编辑时间轴
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-[11px]"
              onClick={() => toast.success('已导出 SRT 字幕文件')}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />导出 SRT 文件
            </Button>
          </div>
        </CollapsibleSection>

        {/* 高级选项 */}
        <CollapsibleSection title="高级样式" defaultOpen={false}>
          <div className="px-3 pt-1 space-y-3">
            {[
              { label: '字间距', value: letterSpacing, set: setLetterSpacing, min: 0, max: 20, unit: 'px' },
              { label: '行距', value: lineHeight, set: setLineHeight, min: 10, max: 40, unit: 'px' },
              { label: '阴影模糊', value: shadowBlur, set: setShadowBlur, min: 0, max: 30, unit: 'px' },
              { label: '描边宽度', value: strokeWidth, set: setStrokeWidth, min: 0, max: 10, unit: 'px' },
              { label: '背景透明度', value: bgOpacity, set: setBgOpacity, min: 0, max: 100, unit: '%' },
            ].map(({ label, value, set, min, max, unit }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">{label}</span>
                  <span className="text-[10px] text-zinc-500">{value[0]}{unit}</span>
                </div>
                <Slider value={value} onValueChange={set} min={min} max={max} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
              </div>
            ))}
            <Button size="sm" variant="ghost" className="w-full h-8 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px]" onClick={() => { setLetterSpacing([4]); setLineHeight([15]); setShadowBlur([8]); setStrokeWidth([0]); setBgOpacity([0]); toast.info('已重置样式参数'); }}>
              <RotateCcw className="w-3 h-3 mr-1.5" />重置样式
            </Button>
          </div>
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}

// ── 面板4：画中画与叠加层 ────────────────────────────────────────────────
function PipPanel() {
  const [blendMode, setBlendMode] = useState('正常');
  const [posX, setPosX] = useState([50]);
  const [posY, setPosY] = useState([50]);
  const [scale, setScale] = useState([100]);
  const [rotation, setRotation] = useState([0]);
  const [opacity, setOpacity] = useState([100]);
  const [layers, setLayers] = useState([
    { id: 'l1', name: '叠加层 1 · 片头Logo', visible: true, locked: false },
    { id: 'l2', name: '叠加层 2 · 品牌水印', visible: true, locked: false },
  ]);

  const toggleLayerProp = (id: string, prop: 'visible' | 'locked') => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, [prop]: !l[prop] } : l));
    toast.success(prop === 'visible' ? '已切换显示状态' : '已切换锁定状态');
  };

  const removeLayer = (id: string, name: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    toast.success(`已删除：${name}`);
  };

  const addLayer = () => {
    const newId = `l${Date.now()}`;
    setLayers(prev => [...prev, { id: newId, name: `叠加层 ${prev.length + 1} · 新图层`, visible: true, locked: false }]);
    toast.success('已添加新叠加层');
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {/* 叠加层管理 */}
        <CollapsibleSection title="叠加层管理">
          <div className="px-3 pt-1 space-y-2">
            <Button size="sm" className="w-full h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px]" onClick={addLayer}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />添加视频/图片轨道
            </Button>
            {layers.map(layer => (
              <div key={layer.id} className={`flex items-center gap-2 p-2 rounded border transition-colors ${layer.locked ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'}`}>
                <GripVertical className="w-3.5 h-3.5 text-zinc-600 cursor-grab shrink-0" />
                <span className="text-[11px] text-zinc-300 flex-1 truncate">{layer.name}</span>
                <button
                  className="shrink-0"
                  onClick={() => toggleLayerProp(layer.id, 'visible')}
                  title={layer.visible ? '隐藏图层' : '显示图层'}
                >
                  {layer.visible
                    ? <Eye className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-200" />
                    : <EyeOff className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400" />}
                </button>
                <button
                  className="shrink-0"
                  onClick={() => toggleLayerProp(layer.id, 'locked')}
                  title={layer.locked ? '解锁图层' : '锁定图层'}
                >
                  <Lock className={`w-3.5 h-3.5 ${layer.locked ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`} />
                </button>
                <button className="shrink-0" onClick={() => removeLayer(layer.id, layer.name)}>
                  <X className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400 transition-colors" />
                </button>
              </div>
            ))}
            {layers.length === 0 && (
              <p className="text-center text-[11px] text-zinc-500 py-3">暂无叠加层</p>
            )}
          </div>
        </CollapsibleSection>

        {/* 混合模式 */}
        <CollapsibleSection title="混合模式">
          <div className="px-3 pt-1">
            <div className="grid grid-cols-2 gap-1.5">
              {BLEND_MODES.map(mode => (
                <button
                  key={mode}
                  className={`py-1.5 text-[11px] rounded border transition-colors ${blendMode === mode ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'}`}
                  onClick={() => { setBlendMode(mode); toast.success(`混合模式：${mode}`); }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* 变换调整 */}
        <CollapsibleSection title="变换调整">
          <div className="px-3 pt-1 space-y-3">
            {[
              { label: '位置X', icon: Move, value: posX, set: setPosX, min: 0, max: 100, unit: '%' },
              { label: '位置Y', icon: Move, value: posY, set: setPosY, min: 0, max: 100, unit: '%' },
              { label: '缩放', icon: ZoomIn, value: scale, set: setScale, min: 10, max: 300, unit: '%' },
              { label: '旋转', icon: RotateCcw, value: rotation, set: setRotation, min: -180, max: 180, unit: '°' },
              { label: '不透明度', icon: Eye, value: opacity, set: setOpacity, min: 0, max: 100, unit: '%' },
            ].map(({ label, icon: Icon, value, set, min, max, unit }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</span>
                  <span className="text-[10px] text-zinc-500">{value[0]}{unit}</span>
                </div>
                <Slider value={value} onValueChange={set} min={min} max={max} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
              </div>
            ))}
            <Button size="sm" variant="ghost" className="w-full h-8 text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-[11px]"
              onClick={() => { setPosX([50]); setPosY([50]); setScale([100]); setRotation([0]); setOpacity([100]); toast.info('已重置所有变换'); }}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />重置变换
            </Button>
          </div>
        </CollapsibleSection>

        {/* 工程模板 */}
        <CollapsibleSection title="素材包/工程模板" badge="NEW">
          <div className="px-3 pt-1 space-y-2">
            {['爆款带货模板包', '节日促销素材包', '国潮风格模板'].map(name => (
              <button key={name} className="w-full flex items-center gap-2 p-2 bg-zinc-800/50 border border-zinc-700 rounded hover:border-indigo-500/50 hover:bg-indigo-600/5 transition-colors"
                onClick={() => toast.success(`模板「${name}」已导入到时间轴`)}>
                <Download className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-[11px] text-zinc-300">{name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 ml-auto" />
              </button>
            ))}
          </div>
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}

// ── 面板5：音频编辑 ───────────────────────────────────────────────────────
function AudioEditPanel() {
  const [volume, setVolume] = useState([80]);
  const [fadeIn, setFadeIn] = useState([10]);
  const [fadeOut, setFadeOut] = useState([10]);
  const [pitch, setPitch] = useState([0]);
  const [speed, setSpeed] = useState([100]);
  const [enabledEffects, setEnabledEffects] = useState<Set<string>>(new Set());
  const [effectParams, setEffectParams] = useState<Record<string, number>>({});
  const [eqBands, setEqBands] = useState<Record<string, number>>({
    '32': 2, '64': 3, '125': 4, '250': 2, '500': 0, '1k': -1, '2k': 2, '4k': 3, '8k': 4, '16k': 2,
  });

  const toggleEffect = (id: string, name: string) => {
    setEnabledEffects(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info(`已关闭：${name}`); }
      else { next.add(id); toast.success(`已启用：${name}`); }
      return next;
    });
  };

  const eqBandKeys = Object.keys(eqBands);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {/* 波形可视化 */}
        <CollapsibleSection title="音轨波形">
          <div className="px-3 pt-1">
            <div className="h-16 bg-zinc-800 border border-zinc-700 rounded overflow-hidden relative">
              <div className="absolute inset-0 flex items-center px-2 gap-[1px]">
                {Array.from({ length: 48 }).map((_, i) => {
                  const h = Math.max(4, 20 + Math.sin(i * 0.8) * 14 + Math.sin(i * 1.5) * 8);
                  return <div key={i} className="flex-1 rounded-sm bg-emerald-500/60" style={{ height: `${h}px` }} />;
                })}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-transparent to-zinc-800 pointer-events-none" />
              <div className="absolute top-1/2 -translate-y-1/2 w-px h-full bg-indigo-400/70" style={{ left: '35%' }} />
              <p className="absolute bottom-1 right-2 text-[9px] text-zinc-500">BGM · 3:15</p>
            </div>
          </div>
        </CollapsibleSection>

        {/* 音量与淡化 */}
        <CollapsibleSection title="音量 & 淡入淡出">
          <div className="px-3 pt-1 space-y-3">
            {[
              { label: '音量', Icon: Volume2, value: volume, set: setVolume, min: 0, max: 200, display: `${volume[0]}%` },
              { label: '淡入时长', Icon: Music, value: fadeIn, set: setFadeIn, min: 0, max: 50, display: `${(fadeIn[0]/10).toFixed(1)}s` },
              { label: '淡出时长', Icon: Music, value: fadeOut, set: setFadeOut, min: 0, max: 50, display: `${(fadeOut[0]/10).toFixed(1)}s` },
              { label: '音调偏移', Icon: BarChart2, value: pitch, set: setPitch, min: -12, max: 12, display: `${pitch[0] > 0 ? '+' : ''}${pitch[0]}` },
              { label: '变速', Icon: RefreshCw, value: speed, set: setSpeed, min: 25, max: 400, display: `${(speed[0]/100).toFixed(2)}x` },
            ].map(({ label, Icon, value, set, min, max, display }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</span>
                  <span className="text-[10px] text-zinc-500">{display}</span>
                </div>
                <Slider value={value} onValueChange={set} min={min} max={max} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
              </div>
            ))}
            <Button size="sm" className="w-full h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px]" onClick={() => toast.success('已在播放头位置添加音量关键帧')}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />添加音量关键帧
            </Button>
          </div>
        </CollapsibleSection>

        {/* 均衡器 */}
        <CollapsibleSection title="均衡器 EQ">
          <div className="px-3 pt-2">
            <div className="flex items-end justify-between gap-0.5 h-20 bg-zinc-800/50 border border-zinc-700 rounded px-2 py-2">
              {eqBandKeys.map(band => (
                <div key={band} className="flex flex-col items-center gap-0.5 flex-1">
                  <div className="w-full cursor-pointer relative" style={{ height: '52px' }}
                    onClick={() => setEqBands(prev => ({ ...prev, [band]: prev[band] >= 6 ? -6 : prev[band] + 2 }))}>
                    <div
                      className={`absolute bottom-0 w-2 rounded-t transition-all mx-auto inset-x-0 ${eqBands[band] >= 0 ? 'bg-emerald-500' : 'bg-red-500/70'}`}
                      style={{ height: `${((eqBands[band] + 6) / 12) * 100}%` }}
                    />
                  </div>
                  <span className="text-[8px] text-zinc-600">{band}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <button className="flex-1 py-1 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={() => setEqBands({ '32': 2, '64': 3, '125': 4, '250': 2, '500': 0, '1k': -1, '2k': 2, '4k': 3, '8k': 4, '16k': 2 })}>
                人声增强
              </button>
              <button className="flex-1 py-1 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={() => setEqBands(Object.fromEntries(eqBandKeys.map(b => [b, 0])))}>
                重置
              </button>
              <button className="flex-1 py-1 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={() => setEqBands({ '32': 5, '64': 4, '125': 2, '250': 0, '500': 0, '1k': 0, '2k': 0, '4k': 1, '8k': 2, '16k': 2 })}>
                低音加强
              </button>
            </div>
          </div>
        </CollapsibleSection>

        {/* 音频效果器 */}
        <CollapsibleSection title="效果器插件">
          <div className="px-3 pt-1 space-y-2">
            {AUDIO_EFFECTS.map(ae => (
              <div key={ae.id} className={`border rounded p-2.5 transition-colors ${enabledEffects.has(ae.id) ? 'border-indigo-600/50 bg-indigo-600/5' : 'border-zinc-700 bg-zinc-800/30'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{ae.icon}</span>
                    <span className="text-[12px] text-zinc-200 font-medium">{ae.name}</span>
                  </div>
                  <button
                    className={`w-9 h-5 rounded-full transition-colors relative ${enabledEffects.has(ae.id) ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                    onClick={() => toggleEffect(ae.id, ae.name)}
                  >
                    <div className={`absolute top-1 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${enabledEffects.has(ae.id) ? 'left-4.5' : 'left-0.5'}`} style={{ left: enabledEffects.has(ae.id) ? '18px' : '2px' }} />
                  </button>
                </div>
                {enabledEffects.has(ae.id) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 w-8">强度</span>
                    <Slider
                      value={[effectParams[ae.id] ?? 50]}
                      onValueChange={([v]) => setEffectParams(prev => ({ ...prev, [ae.id]: v }))}
                      max={100}
                      className="flex-1 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                    />
                    <span className="text-[10px] text-zinc-500 w-6 text-right">{effectParams[ae.id] ?? 50}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* 操作区 */}
        <div className="px-3 py-3 flex gap-2 border-t border-zinc-800">
          <Button size="sm" className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]" onClick={() => toast.success('音频调整已应用到时间轴片段')}>
            <Check className="w-3.5 h-3.5 mr-1.5" />应用修改
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 h-8 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px]"
            onClick={() => { setVolume([80]); setFadeIn([10]); setFadeOut([10]); setPitch([0]); setSpeed([100]); toast.info('已重置音频参数'); }}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />重置
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── 面板6：动画与关键帧 ──────────────────────────────────────────────────
function KeyframePanel() {
  const [selectedProp, setSelectedProp] = useState<string | null>(null);
  const [selectedCurve, setSelectedCurve] = useState('缓入缓出');
  const [keyframes, setKeyframes] = useState<Record<string, { pos: number; val: number }[]>>({});

  const addKeyframe = (prop: string) => {
    const pos = Math.round(Math.random() * 80 + 10);
    const val = Math.round(Math.random() * 100);
    setKeyframes(prev => ({
      ...prev,
      [prop]: [...(prev[prop] || []), { pos, val }].sort((a, b) => a.pos - b.pos),
    }));
    toast.success(`已在当前位置添加 ${prop} 关键帧`);
  };

  const removeKeyframe = (prop: string, idx: number) => {
    setKeyframes(prev => ({ ...prev, [prop]: prev[prop].filter((_, i) => i !== idx) }));
    toast.info('已删除关键帧');
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {/* 属性关键帧 */}
        <CollapsibleSection title="属性关键帧">
          <div className="px-3 pt-1 space-y-1.5">
            {KF_PROPERTIES.map(prop => (
              <div key={prop} className={`rounded border cursor-pointer transition-colors ${selectedProp === prop ? 'border-indigo-500 bg-indigo-600/10' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'}`}>
                <div
                  className="flex items-center justify-between p-2"
                  onClick={() => setSelectedProp(prop === selectedProp ? null : prop)}
                >
                  <span className="text-[11px] text-zinc-300">{prop}</span>
                  <div className="flex items-center gap-2">
                    {keyframes[prop]?.length > 0 && (
                      <span className="text-[10px] text-indigo-400 bg-indigo-600/20 px-1.5 rounded">{keyframes[prop].length} 帧</span>
                    )}
                    <button
                      className="text-zinc-500 hover:text-indigo-400 transition-colors"
                      onClick={e => { e.stopPropagation(); addKeyframe(prop); }}
                      title="添加关键帧"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* 展开关键帧列表 */}
                {selectedProp === prop && keyframes[prop]?.length > 0 && (
                  <div className="border-t border-zinc-700/50 px-2 py-1.5 space-y-1">
                    <div className="relative h-8 bg-zinc-900 rounded">
                      {keyframes[prop].map((kf, i) => (
                        <button
                          key={i}
                          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-indigo-400 rotate-45 hover:bg-indigo-300 transition-colors"
                          style={{ left: `calc(${kf.pos}% - 5px)` }}
                          onClick={() => removeKeyframe(prop, i)}
                          title={`t=${kf.pos}% 值=${kf.val} — 点击删除`}
                        />
                      ))}
                    </div>
                    <p className="text-[9px] text-zinc-600 text-center">点击菱形删除关键帧</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* 动画曲线 */}
        <CollapsibleSection title="动画曲线预设">
          <div className="px-3 pt-1 grid grid-cols-2 gap-1.5">
            {KF_CURVES.map(curve => (
              <button
                key={curve}
                className={`py-2 text-[11px] rounded border transition-colors ${selectedCurve === curve ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}`}
                onClick={() => { setSelectedCurve(curve); toast.success(`动画曲线：${curve}`); }}
              >
                {selectedCurve === curve && <Check className="inline w-3 h-3 mr-1" />}{curve}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 关键帧时间轴可视化 */}
        <CollapsibleSection title="时间轴预览">
          <div className="px-3 pt-1">
            <div className="bg-zinc-800 rounded border border-zinc-700 p-2 space-y-2">
              {KF_PROPERTIES.slice(0, 3).map(prop => (
                <div key={prop} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-12 shrink-0 truncate">{prop}</span>
                  <div className="flex-1 h-5 bg-zinc-900 rounded relative overflow-hidden cursor-pointer"
                    onClick={() => addKeyframe(prop)}>
                    {(keyframes[prop] || [{ pos: 10, val: 0 }, { pos: 55, val: 80 }, { pos: 85, val: 100 }]).map((kf, i) => (
                      <div
                        key={i}
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-400 rounded-full"
                        style={{ left: `${kf.pos}%` }}
                      />
                    ))}
                    <div className="absolute top-1/2 -translate-y-px h-px bg-indigo-400/30 inset-x-2" />
                  </div>
                  <button className="shrink-0 text-zinc-600 hover:text-zinc-300" onClick={() => addKeyframe(prop)}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 text-center mt-2">点击轨道添加关键帧 · 点击菱形删除</p>
          </div>
        </CollapsibleSection>

        {/* 快捷动画预设 */}
        <CollapsibleSection title="快捷动画预设" defaultOpen={false}>
          <div className="px-3 pt-1 grid grid-cols-2 gap-2">
            {['弹入弹出', '旋转进场', '缩放放大', '位移滑入', '抖动强调', '呼吸循环'].map(preset => (
              <button
                key={preset}
                className="py-2 text-[11px] text-zinc-300 bg-zinc-800 rounded border border-zinc-700 hover:border-indigo-500/60 hover:bg-indigo-600/5 hover:text-indigo-300 transition-all"
                onClick={() => toast.success(`已应用预设动画：${preset}`)}
              >
                {preset}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        <div className="px-3 py-3 border-t border-zinc-800">
          <Button size="sm" className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]"
            onClick={() => toast.success('关键帧动画已应用到当前片段')}>
            <Check className="w-3.5 h-3.5 mr-1.5" />应用动画
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── AI工具操作抽屉 ────────────────────────────────────────────────────────
function AiToolDialog({ tool, open, onClose }: {
  tool: typeof AI_TOOLS[0] | null;
  open: boolean;
  onClose: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { if (!open) { setRunning(false); setDone(false); } }, [open]);

  const handleRun = async () => {
    setRunning(true);
    setDone(false);
    await new Promise(r => setTimeout(r, 2000));
    setRunning(false);
    setDone(true);
    toast.success(`${tool?.name} 处理完成！`);
  };

  if (!tool) return null;
  const Icon = tool.icon;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center ${tool.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">{tool.name}</div>
              <div className="text-[11px] text-zinc-400 font-normal">{tool.desc}</div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          {/* AI工具参数区 */}
          {tool.id === 'ai1' && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-300">对视频中的人物进行智能抠像，自动分离背景与前景。</p>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">检测精度</span>
                <select className="bg-zinc-700 text-zinc-200 text-[11px] rounded px-2 py-0.5 border-0">
                  <option>高精度（慢）</option><option>标准</option><option>快速（低精度）</option>
                </select>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">边缘羽化</span>
                <span className="text-[11px] text-zinc-300">8px</span>
              </div>
            </div>
          )}
          {tool.id === 'ai2' && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-300">AI 美颜、美体，自动优化人像画质。</p>
              {['磨皮强度', '美白强度', '瘦脸强度'].map(label => (
                <div key={label} className="flex items-center gap-3 px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                  <span className="text-[11px] text-zinc-400 w-20 shrink-0">{label}</span>
                  <Slider defaultValue={[50]} max={100} className="flex-1 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5" />
                </div>
              ))}
            </div>
          )}
          {tool.id === 'ai3' && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-300">识别音乐节拍，自动将视频切换点对齐到节拍。</p>
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">音频轨道</span>
                <span className="text-[11px] text-zinc-300 ml-auto">BGM · 动感节奏.mp3</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">卡点灵敏度</span>
                <select className="bg-zinc-700 text-zinc-200 text-[11px] rounded px-2 py-0.5 border-0">
                  <option>强拍</option><option>所有节拍</option><option>高密度</option>
                </select>
              </div>
            </div>
          )}
          {tool.id === 'ai4' && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-300">识别视频或音频中的语音，自动生成时间轴字幕。</p>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">语言</span>
                <select className="bg-zinc-700 text-zinc-200 text-[11px] rounded px-2 py-0.5 border-0">
                  <option>中文（普通话）</option><option>粤语</option><option>英语</option><option>中英混合</option>
                </select>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded border border-zinc-700">
                <span className="text-[11px] text-zinc-400">字幕样式</span>
                <select className="bg-zinc-700 text-zinc-200 text-[11px] rounded px-2 py-0.5 border-0">
                  <option>默认白字黑边</option><option>弹幕风格</option><option>电影字幕</option>
                </select>
              </div>
            </div>
          )}
          {(tool.id === 'ai5' || tool.id === 'ai6') && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-300">{tool.id === 'ai5' ? '选择脚本模板，快速生成带货视频分镜。' : '导入已有脚本，自动规划视频分镜结构。'}</p>
              {tool.id === 'ai5' ? (
                <div className="grid grid-cols-2 gap-2">
                  {['带货开场', '产品展示', '用户证言', '促销结尾'].map(t => (
                    <button key={t} className="py-2 bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-300 hover:border-indigo-500/60 hover:text-indigo-300 transition-colors"
                      onClick={() => toast.success(`已选择模板：${t}`)}>
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-zinc-700 rounded p-4 text-center space-y-1">
                  <Upload className="w-6 h-6 text-zinc-500 mx-auto" />
                  <p className="text-[11px] text-zinc-500">拖拽 .txt / .docx 脚本文件</p>
                  <button className="text-[11px] text-indigo-400 hover:text-indigo-300" onClick={() => toast.info('正在打开文件选择器')}>或点击选择文件</button>
                </div>
              )}
            </div>
          )}

          {/* 进度/结果 */}
          {running && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-600/10 border border-indigo-600/30 rounded">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              <span className="text-[12px] text-indigo-300">AI 处理中，请稍候…</span>
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-600/10 border border-emerald-600/30 rounded">
              <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[12px] text-emerald-300">处理完成，结果已应用到时间轴</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="border border-zinc-700 text-zinc-400 hover:text-zinc-200" onClick={onClose}>取消</Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleRun} disabled={running || done}>
            {running ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />处理中…</> : done ? <><Check className="w-3.5 h-3.5 mr-1.5" />已完成</> : <><Wand2 className="w-3.5 h-3.5 mr-1.5" />开始处理</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 面板7：AI工具入口 ────────────────────────────────────────────────────
function AiToolsPanel() {
  const [selectedTool, setSelectedTool] = useState<typeof AI_TOOLS[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openTool = (tool: typeof AI_TOOLS[0]) => {
    setSelectedTool(tool);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <AiToolDialog tool={selectedTool} open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <ScrollArea className="flex-1">
        <CollapsibleSection title="核心AI功能">
          <div className="px-3 pt-1 space-y-2">
            {AI_TOOLS.map(tool => (
              <button
                key={tool.id}
                className="w-full flex items-center gap-3 p-3 bg-zinc-800/60 border border-zinc-700 rounded hover:border-zinc-500 hover:bg-zinc-800 transition-all group text-left"
                onClick={() => openTool(tool)}
              >
                <div className={`w-9 h-9 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${tool.color}`}>
                  <tool.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-zinc-200">{tool.name}</span>
                    <span className="px-1.5 py-0.5 text-[9px] bg-zinc-700 text-zinc-400 rounded">{tool.badge}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">{tool.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 group-hover:text-zinc-300 transition-colors" />
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 创作脚本模板 */}
        <CollapsibleSection title="创作脚本模板">
          <div className="px-3 pt-1 space-y-2">
            {[
              { name: '带货开场钩子模板', desc: '3秒抓住用户注意力' },
              { name: '产品展示分镜', desc: '多角度展示商品细节' },
              { name: '用户证言模板', desc: '真实评价引导购买' },
              { name: '促销结尾话术', desc: '限时优惠紧迫感营造' },
            ].map(({ name, desc }) => (
              <button key={name} className="w-full flex items-start gap-2 p-2.5 bg-zinc-800/50 border border-zinc-700 rounded hover:border-emerald-500/50 hover:bg-emerald-600/5 transition-colors text-left"
                onClick={() => toast.success(`模板「${name}」已导入到时间轴`)}>
                <BookOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-300">{name}</p>
                  <p className="text-[10px] text-zinc-500">{desc}</p>
                </div>
                <Download className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
// ── 面板8：资源商城 ──────────────────────────────────────────────────────

// 商城商品数据
const SHOP_PRODUCTS = [
  { id: 'p1', name: '电影感LUT合集', desc: '100+专业调色预设', category: 'LUT', price: 29, originalPrice: 59, rating: 4.9, sales: 2341, tag: '热销', tagColor: 'bg-red-500/20 text-red-400', preview: 'from-amber-900 to-orange-700' },
  { id: 'p2', name: '节日特效包', desc: '春节/双11/618烟花粒子', category: '特效', price: 19, originalPrice: 39, rating: 4.8, sales: 1876, tag: '新品', tagColor: 'bg-indigo-500/20 text-indigo-400', preview: 'from-red-900 to-pink-700' },
  { id: 'p3', name: '国风贴纸库', desc: '200+国潮风格贴纸', category: '贴纸', price: 9, originalPrice: 19, rating: 4.7, sales: 3102, tag: '限免', tagColor: 'bg-emerald-500/20 text-emerald-400', preview: 'from-red-900 to-rose-700' },
  { id: 'p4', name: '抖音爆款转场包', desc: '50款热门转场效果', category: '转场', price: 39, originalPrice: 79, rating: 4.9, sales: 5678, tag: '爆款', tagColor: 'bg-orange-500/20 text-orange-400', preview: 'from-purple-900 to-indigo-700' },
  { id: 'p5', name: '版权BGM合集', desc: '300首无版权音乐', category: '音乐', price: 49, originalPrice: 99, rating: 4.8, sales: 4210, tag: '推荐', tagColor: 'bg-blue-500/20 text-blue-400', preview: 'from-emerald-900 to-teal-700' },
  { id: 'p6', name: '带货视频模板包', desc: '20套完整视频模板', category: '模板', price: 89, originalPrice: 199, rating: 5.0, sales: 892, tag: 'VIP', tagColor: 'bg-amber-500/20 text-amber-400', preview: 'from-yellow-900 to-amber-700' },
  { id: 'p7', name: '字幕花字包', desc: '150款动态花字效果', category: '字幕', price: 15, originalPrice: 29, rating: 4.6, sales: 2109, tag: '优惠', tagColor: 'bg-cyan-500/20 text-cyan-400', preview: 'from-cyan-900 to-sky-700' },
  { id: 'p8', name: '美颜滤镜合集', desc: '50款美颜调色滤镜', category: 'LUT', price: 25, originalPrice: 49, rating: 4.7, sales: 1543, tag: '热销', tagColor: 'bg-red-500/20 text-red-400', preview: 'from-pink-900 to-rose-700' },
];

const SHOP_CATEGORIES = ['全部', 'LUT', '特效', '贴纸', '转场', '音乐', '模板', '字幕'];

function ShopPanel() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [cart, setCart] = useState<Set<string>>(new Set());
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [cartOpen, setCartOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'price'>('hot');
  const [confirmItem, setConfirmItem] = useState<typeof SHOP_PRODUCTS[0] | null>(null);

  const filtered = SHOP_PRODUCTS.filter(p => {
    const matchCat = activeCategory === '全部' || p.category === activeCategory;
    const matchSearch = p.name.includes(searchText) || p.desc.includes(searchText);
    return matchCat && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'hot') return b.sales - a.sales;
    if (sortBy === 'price') return a.price - b.price;
    return b.id.localeCompare(a.id);
  });

  const cartTotal = Array.from(cart).reduce((sum, id) => {
    const p = SHOP_PRODUCTS.find(x => x.id === id);
    return sum + (p?.price ?? 0);
  }, 0);

  const addToCart = (id: string, name: string) => {
    if (purchased.has(id)) { toast.info(`「${name}」已购买，可直接使用`); return; }
    setCart(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info(`已从购物车移除：${name}`); }
      else { next.add(id); toast.success(`已加入购物车：${name}`); }
      return next;
    });
  };

  const buyNow = (item: typeof SHOP_PRODUCTS[0]) => {
    if (purchased.has(item.id)) { toast.info(`「${item.name}」已购买，直接使用`); return; }
    setConfirmItem(item);
  };

  const confirmPurchase = () => {
    if (!confirmItem) return;
    setPurchased(prev => new Set(prev).add(confirmItem.id));
    setCart(prev => { const next = new Set(prev); next.delete(confirmItem.id); return next; });
    setConfirmItem(null);
    toast.success(`「${confirmItem.name}」购买成功！已解锁至素材库`);
  };

  const checkoutCart = () => {
    if (cart.size === 0) { toast.info('购物车为空'); return; }
    const names = Array.from(cart).map(id => SHOP_PRODUCTS.find(p => p.id === id)?.name).filter(Boolean);
    setPurchased(prev => new Set([...prev, ...cart]));
    setCart(new Set());
    setCartOpen(false);
    toast.success(`已购买 ${names.length} 件商品，共 ¥${cartTotal}，已解锁至素材库`);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* 购买确认弹窗 */}
      <Dialog open={!!confirmItem} onOpenChange={v => { if (!v) setConfirmItem(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-zinc-900 border-zinc-700 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />确认购买
            </DialogTitle>
          </DialogHeader>
          {confirmItem && (
            <div className="py-2 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded border border-zinc-700">
                <div className={`w-12 h-12 rounded bg-gradient-to-br ${confirmItem.preview} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-200">{confirmItem.name}</p>
                  <p className="text-[11px] text-zinc-400">{confirmItem.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-[12px] text-zinc-400">应付金额</span>
                <span className="text-lg font-bold text-amber-400">¥{confirmItem.price}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-1.5 py-2.5 rounded border border-zinc-700 bg-zinc-800 text-[12px] text-zinc-300 hover:border-zinc-500 transition-colors"
                  onClick={confirmPurchase}>
                  <Package className="w-4 h-4 text-zinc-400" />微信支付
                </button>
                <button className="flex items-center justify-center gap-1.5 py-2.5 rounded border border-zinc-700 bg-zinc-800 text-[12px] text-zinc-300 hover:border-zinc-500 transition-colors"
                  onClick={confirmPurchase}>
                  <CreditCard className="w-4 h-4 text-blue-400" />支付宝
                </button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" className="border border-zinc-700 text-zinc-400 hover:text-zinc-200" onClick={() => setConfirmItem(null)}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 购物车侧栏 */}
      {cartOpen && (
        <div className="absolute inset-0 z-40 bg-zinc-900 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
            <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-400" />购物车
              {cart.size > 0 && <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">{cart.size}</span>}
            </span>
            <button onClick={() => setCartOpen(false)}><X className="w-4 h-4 text-zinc-400 hover:text-zinc-200" /></button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {cart.size === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <ShoppingCart className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-[12px] text-zinc-500">购物车为空</p>
                </div>
              ) : (
                Array.from(cart).map(id => {
                  const p = SHOP_PRODUCTS.find(x => x.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex items-center gap-2 p-2 bg-zinc-800 rounded border border-zinc-700">
                      <div className={`w-10 h-10 rounded bg-gradient-to-br ${p.preview} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-zinc-200 truncate">{p.name}</p>
                        <p className="text-[10px] text-amber-400 font-medium">¥{p.price}</p>
                      </div>
                      <button onClick={() => addToCart(p.id, p.name)}>
                        <X className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400 transition-colors" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
          {cart.size > 0 && (
            <div className="p-3 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-zinc-400">合计</span>
                <span className="text-base font-bold text-amber-400">¥{cartTotal}</span>
              </div>
              <Button className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white text-[12px]" onClick={checkoutCart}>
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />立即结算
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 顶部搜索 + 购物车入口 */}
      <div className="px-3 pt-2.5 pb-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="搜索素材包…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-200 pl-7 pr-3 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          <button
            className="relative w-8 h-8 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center shrink-0 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="w-4 h-4 text-zinc-400" />
            {cart.size > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[9px] text-white flex items-center justify-center">{cart.size}</span>
            )}
          </button>
        </div>
        {/* 分类标签 */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {SHOP_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`px-2 py-0.5 text-[10px] rounded whitespace-nowrap transition-colors shrink-0 ${activeCategory === cat ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 排序 + 统计 */}
      <div className="px-3 py-1.5 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-zinc-500">{filtered.length} 件商品</span>
        <div className="flex items-center gap-0.5">
          {([['hot', '热销'], ['new', '最新'], ['price', '价格']] as const).map(([v, l]) => (
            <button
              key={v}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${sortBy === v ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
              onClick={() => setSortBy(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 商品列表 */}
      <ScrollArea className="flex-1">
        {/* 限时活动横幅 */}
        <div className="mx-3 mb-3 rounded-lg bg-gradient-to-r from-amber-600/30 to-orange-600/20 border border-amber-500/30 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-amber-300">限时活动</p>
            <p className="text-[10px] text-zinc-400">首购8折 · 满99减20 · 全场包邮</p>
          </div>
          <span className="text-[10px] text-amber-400 font-mono shrink-0">剩 23:47:12</span>
        </div>

        <div className="px-3 space-y-2 pb-4">
          {filtered.map(p => (
            <div key={p.id} className={`rounded-lg border transition-colors ${purchased.has(p.id) ? 'border-emerald-600/30 bg-emerald-600/5' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'}`}>
              <div className="flex gap-3 p-2.5">
                {/* 预览缩略图 */}
                <div className={`w-14 h-14 rounded bg-gradient-to-br ${p.preview} shrink-0 flex items-center justify-center relative overflow-hidden`}>
                  {purchased.has(p.id) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <BadgeCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[12px] font-medium text-zinc-200 leading-tight">{p.name}</p>
                    <span className={`shrink-0 px-1.5 py-0.5 text-[9px] rounded ${p.tagColor}`}>{p.tag}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-current" />
                      <span className="text-[10px] text-zinc-400">{p.rating}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">{p.sales.toLocaleString()}已购</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-amber-400">¥{p.price}</span>
                      <span className="text-[10px] text-zinc-600 line-through">¥{p.originalPrice}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {purchased.has(p.id) ? (
                        <span className="px-2 py-0.5 text-[10px] bg-emerald-600/20 text-emerald-400 rounded flex items-center gap-1">
                          <Check className="w-3 h-3" />已购买
                        </span>
                      ) : (
                        <>
                          <button
                            className={`p-1 rounded transition-colors ${cart.has(p.id) ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                            onClick={() => addToCart(p.id, p.name)}
                            title={cart.has(p.id) ? '从购物车移除' : '加入购物车'}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] rounded transition-colors"
                            onClick={() => buyNow(p)}
                          >
                            立即购买
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-[12px] text-zinc-500">未找到相关商品</p>
            </div>
          )}
        </div>

        {/* 已购买素材 */}
        {purchased.size > 0 && (
          <div className="mx-3 mb-4 rounded border border-emerald-600/30 bg-emerald-600/5 p-3">
            <p className="text-[11px] text-emerald-400 font-medium mb-2 flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5" />已购素材 ({purchased.size} 件)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(purchased).map(id => {
                const p = SHOP_PRODUCTS.find(x => x.id === id);
                if (!p) return null;
                return (
                  <button key={id}
                    className="px-2 py-1 bg-emerald-600/20 border border-emerald-600/30 rounded text-[10px] text-emerald-300 hover:bg-emerald-600/30 transition-colors"
                    onClick={() => toast.success(`已将「${p.name}」添加到素材面板`)}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── 左侧边栏主组件 ────────────────────────────────────────────────────────
const PANEL_ITEMS: { id: PanelId; icon: React.ElementType; label: string; shortcut: string }[] = [
  { id: 'media',    icon: Film,         label: '媒体库',   shortcut: 'M' },
  { id: 'effects',  icon: Sparkles,     label: '素材效果', shortcut: 'E' },
  { id: 'text',     icon: Type,         label: '文本字幕', shortcut: 'T' },
  { id: 'pip',      icon: Layers,       label: '画中画',   shortcut: 'P' },
  { id: 'audio',    icon: Music2,       label: '音频编辑', shortcut: 'A' },
  { id: 'keyframe', icon: Waypoints,    label: '关键帧',   shortcut: 'K' },
  { id: 'ai',       icon: Wand2,        label: 'AI工具',   shortcut: 'I' },
  { id: 'shop',     icon: ShoppingBag,  label: '资源商城', shortcut: 'S' },
];

function LeftSidebar({ materials, onAdd, importedVideos, onImportVideo }: {
  materials: { id: string; name: string; url: string; type: string }[];
  onAdd: (m: { id: string; name: string; url: string; type: string }) => void;
  importedVideos: { id: string; title: string; video_url: string; thumbnail_url: string | null }[];
  onImportVideo: (v: { id: string; title: string; video_url: string; thumbnail_url: string | null }) => void;
}) {
  const [activePanel, setActivePanel] = useState<PanelId>('media');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const item = PANEL_ITEMS.find(p => p.shortcut.toLowerCase() === e.key.toLowerCase());
      if (item) { setActivePanel(item.id); setCollapsed(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={`flex shrink-0 border-r border-zinc-800 transition-all duration-300 ${collapsed ? 'w-12' : 'w-72 md:w-80'}`}>
      {/* 垂直图标导航栏 */}
      <div className="w-12 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col py-2 gap-0.5">
        {PANEL_ITEMS.map(item => (
          <button
            key={item.id}
            title={`${item.label}  (${item.shortcut})`}
            className={`relative mx-1 w-10 h-10 rounded flex flex-col items-center justify-center gap-0.5 transition-all group ${
              activePanel === item.id && !collapsed
                ? 'bg-indigo-600/20 text-indigo-400 ring-1 ring-inset ring-indigo-600/40'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
            onClick={() => {
              if (activePanel === item.id) { setCollapsed(!collapsed); }
              else { setActivePanel(item.id); setCollapsed(false); }
            }}
          >
            <item.icon className="w-4 h-4" />
            <span className="text-[8px] leading-none">{item.label.slice(0, 2)}</span>
            {/* 激活指示条 */}
            {activePanel === item.id && !collapsed && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r" />
            )}
            {/* 悬停标签 */}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              {item.label} <span className="text-zinc-500 ml-1">{item.shortcut}</span>
            </div>
          </button>
        ))}
        {/* 折叠按钮 */}
        <div className="flex-1" />
        <button
          className="mx-1 w-10 h-10 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开面板' : '收起面板'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* 内容面板 */}
      {!collapsed && (
        <div className="flex-1 min-w-0 flex flex-col bg-zinc-900">
          {/* 面板标题 */}
          <div className="h-10 border-b border-zinc-800 flex items-center px-3 shrink-0">
            {(() => { const cur = PANEL_ITEMS.find(p => p.id === activePanel); return cur ? <><cur.icon className="w-4 h-4 text-zinc-400 mr-2" /><span className="text-xs font-medium text-zinc-300">{cur.label}</span></> : null; })()}
          </div>
          {/* 面板内容 */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activePanel === 'media'    && <MediaLibraryPanel materials={materials} onAdd={onAdd} importedVideos={importedVideos} onImportVideo={onImportVideo} />}
            {activePanel === 'effects'  && <EffectsPanel />}
            {activePanel === 'text'     && <TextSubtitlePanel />}
            {activePanel === 'pip'      && <PipPanel />}
            {activePanel === 'audio'    && <AudioEditPanel />}
            {activePanel === 'keyframe' && <KeyframePanel />}
            {activePanel === 'ai'       && <AiToolsPanel />}
            {activePanel === 'shop'     && <ShopPanel />}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 主页面组件 ───────────────────────────────────────────────────────────
export default function VideoEditPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const importId = searchParams.get('importId');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [zoom, setZoom] = useState(50);
  const [selectedTrackItem, setSelectedTrackItem] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('未命名项目');
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState<{id: string; name: string; url: string; type: string}[]>([]);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scale, setScale] = useState([100]);
  const [opacity, setOpacity] = useState([100]);
  const [volume, setVolume] = useState([100]);

  // 生成视频列表（用于一键导入）& 预览 URL
  const [importedVideos, setImportedVideos] = useState<{id: string; title: string; video_url: string; thumbnail_url: string | null}[]>([]);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 示例项目选择器
  const [sampleProjects, setSampleProjects] = useState<{id: string; title: string; thumbnail_url: string | null; status: string}[]>([]);
  const [showSamplePicker, setShowSamplePicker] = useState(false);

  useEffect(() => {
    if (!importId) {
      supabase.from('video_projects')
        .select('id,title,thumbnail_url,status')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(9)
        .then(({ data }) => setSampleProjects(data ?? []));
    }
  }, [importId]);

  // 加载已生成完成的视频（供一键导入）
  const loadImportedVideos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('video_projects')
      .select('id,title,video_url,thumbnail_url')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('video_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);
    setImportedVideos((data ?? []).filter(v => v.video_url) as typeof importedVideos);
  }, [user]);

  // 加载素材库
  const DEMO_UID = '7d58d08f-8aa3-43f5-a30f-b7495d59d147';
  const loadMaterials = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('materials')
      .select('id,name,url,type')
      .or(`user_id.eq.${user.id},user_id.eq.${DEMO_UID}`)
      .order('created_at', { ascending: false })
      .limit(30);
    setMaterials((data ?? []) as any[]);
  }, [user]);

  // 加载项目（同时读取 video_url 用于预览）
  const loadProject = useCallback(async () => {
    if (!importId || !user) return;
    const { data } = await supabase
      .from('video_projects')
      .select('title,metadata,video_url')
      .eq('id', importId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setProjectTitle(data.title || '未命名项目');
      if ((data as any).video_url) setPreviewVideoUrl((data as any).video_url);
      const meta = (data.metadata || {}) as any;
      if (meta.tracks) setTracks(meta.tracks);
      if (meta.duration) setDuration(meta.duration);
    }
  }, [importId, user]);

  useEffect(() => {
    loadMaterials();
    loadImportedVideos();
    if (importId) loadProject();
  }, [loadMaterials, loadImportedVideos, loadProject, importId]);

  // 同步播放/暂停到 video 元素
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.play().catch(() => setIsPlaying(false)); }
    else { v.pause(); }
  }, [isPlaying]);

  // 保存草稿
  const handleSave = async () => {
    if (!user) { toast.error('请先登录'); return; }
    setSaving(true);
    try {
      const payload = {
        title: projectTitle,
        user_id: user.id,
        status: 'draft',
        metadata: { duration, tracks, zoom, edit_mode: true, last_saved_at: new Date().toISOString() },
      };
      if (importId) {
        await supabase.from('video_projects').update(payload).eq('id', importId);
        toast.success('剪辑草稿已保存');
      } else {
        const { data } = await supabase.from('video_projects').insert(payload).select('id').single();
        if (data?.id) {
          navigate(`/video/edit?importId=${data.id}`, { replace: true });
          toast.success('新项目已创建并保存');
        }
      }
    } finally {
      setSaving(false);
      setSaveDialogOpen(false);
    }
  };

  // 添加素材到时间轴
  const addToTimeline = (material: {id: string; name: string; url: string; type: string}) => {
    const trackType = material.type === 'audio' ? 'audio' : material.type === 'image' ? 'image' : 'video';
    setTracks(prev => [...prev, {
      id: `item-${Date.now()}`,
      trackId: trackType,
      name: material.name,
      start: currentTime,
      duration: 5,
      type: trackType as any,
      url: material.url,
    }]);
    toast.success(`已添加「${material.name}」到时间轴`);
  };

  // 一键导入生成视频到素材库
  const handleImportVideo = async (v: {id: string; title: string; video_url: string; thumbnail_url: string | null}) => {
    if (!user) { toast.error('请先登录'); return; }
    // 先在预览区加载该视频
    setPreviewVideoUrl(v.video_url);
    setIsPlaying(false);
    // 写入 materials 表
    const { error } = await supabase.from('materials').insert({
      user_id: user.id,
      name: v.title,
      url: v.video_url,
      type: 'video',
    });
    if (error && !error.message.includes('duplicate')) {
      toast.error('导入失败：' + error.message);
    } else {
      toast.success(`「${v.title}」已导入素材库，可在预览区播放`);
      loadMaterials();
    }
  };

  // 导出视频
  const handleExport = async () => {
    if (!user) { toast.error('请先登录'); return; }
    toast.info('正在提交导出任务…');
    try {
      const { error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'generate_video', project_id: importId || undefined }
      });
      if (error) throw error;
      toast.success('导出任务已提交，可在作品管理查看进度');
    } catch (e: any) {
      toast.error('导出失败：' + (e.message || '请稍后重试'));
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `00:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-2rem)] bg-zinc-950 text-zinc-300 rounded-lg overflow-hidden border border-zinc-800">

      {/* ─── 顶部工具栏 ──────────────────────────────────────────── */}
      <div className="h-12 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-2 md:px-4 shrink-0 gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={loadMaterials}>
            <Upload className="w-4 h-4 mr-1.5" /><span className="hidden md:inline">刷新素材</span>
          </Button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="撤销 Ctrl+Z" onClick={() => toast.info('撤销')}>
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="重做 Ctrl+Y" onClick={() => toast.info('重做')}>
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        <div className="font-medium text-sm text-zinc-400 flex items-center gap-2">
          <span className="truncate max-w-[120px] md:max-w-xs">{projectTitle}</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-zinc-500 hover:text-white" onClick={() => setSaveDialogOpen(true)}>
            重命名
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => setSaveDialogOpen(true)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            <span className="hidden md:inline">保存</span>
          </Button>
          <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" /><span className="hidden md:inline">导出</span>
          </Button>
        </div>
      </div>

      {/* ─── 中部工作区 ──────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* 左侧边栏 */}
        <LeftSidebar materials={materials} onAdd={addToTimeline} importedVideos={importedVideos} onImportVideo={handleImportVideo} />

        {/* 中央预览区 */}
        <div className="flex-1 flex flex-col bg-black relative min-w-0">
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <div className="aspect-video w-full max-w-3xl bg-zinc-900 border border-zinc-800 shadow-2xl relative overflow-hidden flex items-center justify-center">

              {/* 无项目时 — 示例项目入口 */}
              {!importId && !showSamplePicker && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-2">
                    <Play className="w-8 h-8 text-zinc-500 ml-1" />
                  </div>
                  <p className="text-sm text-zinc-500 text-center">新建空白项目，或从示例项目开始</p>
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      onClick={() => setSaveDialogOpen(true)}
                    >
                      新建项目
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white"
                      onClick={() => setShowSamplePicker(true)}
                    >
                      打开示例项目
                    </Button>
                  </div>
                </div>
              )}

              {/* 示例项目选择器 */}
              {!importId && showSamplePicker && (
                <div className="absolute inset-0 bg-zinc-950/95 p-4 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-zinc-200">选择示例项目</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-zinc-500 hover:text-white"
                      onClick={() => setShowSamplePicker(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {sampleProjects.map(p => (
                      <button
                        key={p.id}
                        className="group relative aspect-video rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700 hover:border-indigo-500 transition-colors"
                        onClick={() => navigate(`/video/edit?importId=${p.id}`)}
                      >
                        {p.thumbnail_url
                          ? <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                          : <div className="w-full h-full flex items-center justify-center"><Play className="w-6 h-6 text-zinc-600" /></div>
                        }
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-[10px] text-white font-medium line-clamp-1">{p.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 已有项目时 — 显示视频预览 */}
              {importId && (
                previewVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={previewVideoUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
                    onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 30)}
                    onEnded={() => setIsPlaying(false)}
                    playsInline
                  />
                ) : (
                  <div className="text-zinc-700 flex flex-col items-center gap-2">
                    <Play className="w-14 h-14 opacity-20" />
                    <p className="text-sm text-zinc-600">从素材库导入视频后可预览播放</p>
                  </div>
                )
              )}

              {/* 播放控制 */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/80 backdrop-blur px-6 py-2 rounded-full border border-zinc-700/50">
                <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-700"
                  onClick={() => { setCurrentTime(0); if (videoRef.current) videoRef.current.currentTime = 0; }}>
                  <SkipBack className="w-4 h-4 fill-current" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-10 h-10 rounded-full bg-zinc-200 text-zinc-900 hover:bg-white hover:text-black"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-700"
                  onClick={() => { if (videoRef.current) videoRef.current.currentTime = videoRef.current.duration; }}>
                  <SkipForward className="w-4 h-4 fill-current" />
                </Button>
              </div>
            </div>
          </div>
          <div className="h-10 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-4 text-xs font-mono text-zinc-400 shrink-0">
            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            <span className="flex items-center gap-1 cursor-pointer hover:text-zinc-200" onClick={() => toast.info('全屏预览')}>
              <Maximize className="w-3.5 h-3.5" />全屏
            </span>
          </div>
        </div>

        {/* 右侧属性面板 */}
        <div className="w-60 md:w-72 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
          <div className="h-10 border-b border-zinc-800 flex items-center px-4 text-xs font-medium text-zinc-200 shrink-0">
            <Settings2 className="w-3.5 h-3.5 mr-2 text-zinc-400" />属性设置
          </div>
          <ScrollArea className="flex-1">
            {selectedTrackItem ? (
              <div className="p-3 space-y-5">
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">基础属性</p>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-400">缩放</span>
                        <span className="text-[10px] text-zinc-500">{scale[0]}%</span>
                      </div>
                      <Slider value={scale} onValueChange={setScale} min={10} max={300} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-400">不透明度</span>
                        <span className="text-[10px] text-zinc-500">{opacity[0]}%</span>
                      </div>
                      <Slider value={opacity} onValueChange={setOpacity} max={100} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">音频</p>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-zinc-400">音量</span>
                      <span className="text-[10px] text-zinc-500">{volume[0]}%</span>
                    </div>
                    <Slider value={volume} onValueChange={setVolume} max={200} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">变速</p>
                  <div className="grid grid-cols-4 gap-1">
                    {['0.5x', '1x', '1.5x', '2x'].map(speed => (
                      <Button key={speed} variant="outline" size="sm" className="h-7 text-[10px] bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:text-white" onClick={() => toast.success(`速度：${speed}`)}>
                        {speed}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">操作</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button size="sm" variant="ghost" className="h-8 text-zinc-400 hover:text-white border border-zinc-700 text-[10px]" onClick={() => toast.success('已分割')}>
                      <ScissorsIcon className="w-3 h-3 mr-1" />分割
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-zinc-400 hover:text-white border border-zinc-700 text-[10px]" onClick={() => toast.success('已复制')}>
                      <Copy className="w-3 h-3 mr-1" />复制
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-zinc-400 hover:text-red-400 border border-zinc-700 text-[10px]" onClick={() => { setSelectedTrackItem(null); toast.success('已删除'); }}>
                      <Trash2 className="w-3 h-3 mr-1" />删除
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-zinc-600 space-y-2 mt-4">
                <Settings2 className="w-8 h-8 opacity-20" />
                <p className="text-[11px]">选中轨道片段后调整属性</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* ─── 底部时间轴 ──────────────────────────────────────────── */}
      <div className="h-64 border-t border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
        <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="分割 S" onClick={() => toast.success('已分割')}>
              <Scissors className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="复制" onClick={() => toast.success('已复制')}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-red-400 hover:bg-zinc-800" title="删除 Del" onClick={() => toast.success('已删除')}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-zinc-700 mx-1" />
            <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-800" title="添加轨道" onClick={() => toast.info('添加轨道')}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 w-36">
            <ZoomOut className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} max={100} className="flex-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
            <ZoomIn className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          </div>
        </div>

        <div className="flex-1 overflow-auto relative bg-zinc-950">
          {/* 时间刻度 */}
          <div className="h-6 sticky top-0 bg-zinc-900 border-b border-zinc-800 z-10 text-[10px] text-zinc-500 font-mono flex items-end px-2">
            <div className="flex-1 border-b border-zinc-700/50 relative h-full">
              {[0, 5, 10, 15, 20, 25, 30].map(sec => (
                <div key={sec} className="absolute bottom-0" style={{ left: `${(sec / 30) * 100}%` }}>
                  <div className="h-1.5 w-px bg-zinc-600 mb-0.5" />
                  <span className="absolute -left-3 bottom-2">00:{sec.toString().padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-2 space-y-1.5">
            {/* 主视频轨道 */}
            <div className="flex gap-2">
              <div className="w-16 shrink-0 h-14 bg-zinc-900 border border-zinc-800 rounded flex flex-col items-center justify-center text-zinc-500 sticky left-0 z-10">
                <Film className="w-4 h-4 mb-1" />
                <span className="text-[9px]">主轨道</span>
              </div>
              <div className="flex-1 relative h-14 bg-zinc-900/30 rounded border border-zinc-800/50">
                <div
                  className={`absolute top-1 bottom-1 left-[0%] right-[30%] bg-indigo-600/30 border border-indigo-500/50 rounded flex items-center px-2 cursor-pointer transition-all hover:bg-indigo-600/40 ${selectedTrackItem === 'v1' ? 'ring-2 ring-indigo-400' : ''}`}
                  onClick={() => setSelectedTrackItem('v1')}
                >
                  <span className="text-xs text-indigo-200 truncate">片段 1.mp4</span>
                </div>
              </div>
            </div>

            {/* 音频轨道 */}
            <div className="flex gap-2">
              <div className="w-16 shrink-0 h-10 bg-zinc-900 border border-zinc-800 rounded flex flex-col items-center justify-center text-zinc-500 sticky left-0 z-10">
                <Music2 className="w-4 h-4 mb-0.5" />
                <span className="text-[9px]">音频</span>
              </div>
              <div className="flex-1 relative h-10 bg-zinc-900/30 rounded border border-zinc-800/50">
                <div
                  className={`absolute top-1 bottom-1 left-[0%] right-[10%] bg-emerald-600/30 border border-emerald-500/50 rounded flex items-center px-2 cursor-pointer hover:bg-emerald-600/40 transition-all ${selectedTrackItem === 'a1' ? 'ring-2 ring-emerald-400' : ''}`}
                  onClick={() => setSelectedTrackItem('a1')}
                >
                  <span className="text-xs text-emerald-200">BGM · 动感节奏</span>
                </div>
              </div>
            </div>

            {/* 字幕轨道 */}
            <div className="flex gap-2">
              <div className="w-16 shrink-0 h-8 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-500 sticky left-0 z-10">
                <Type className="w-4 h-4" />
              </div>
              <div className="flex-1 relative h-8 bg-zinc-900/30 rounded border border-zinc-800/50">
                <div
                  className={`absolute top-1 bottom-1 left-[10%] right-[60%] bg-amber-600/30 border border-amber-500/50 rounded flex items-center justify-center cursor-pointer hover:bg-amber-600/40 transition-all ${selectedTrackItem === 't1' ? 'ring-2 ring-amber-400' : ''}`}
                  onClick={() => setSelectedTrackItem('t1')}
                >
                  <span className="text-[10px] text-amber-200 truncate px-1">全新解决方案来了</span>
                </div>
              </div>
            </div>

            {/* 特效轨道 */}
            <div className="flex gap-2">
              <div className="w-16 shrink-0 h-8 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-500 sticky left-0 z-10">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 relative h-8 bg-zinc-900/30 rounded border border-zinc-800/50">
                <div
                  className={`absolute top-1 bottom-1 left-[25%] right-[55%] bg-purple-600/30 border border-purple-500/50 rounded flex items-center justify-center cursor-pointer hover:bg-purple-600/40 transition-all ${selectedTrackItem === 'fx1' ? 'ring-2 ring-purple-400' : ''}`}
                  onClick={() => setSelectedTrackItem('fx1')}
                >
                  <span className="text-[10px] text-purple-200 px-1">光晕特效</span>
                </div>
              </div>
            </div>

            {/* 来自素材库的真实轨道 */}
            {tracks.map(item => (
              <div key={item.id} className="flex gap-2">
                <div className="w-16 shrink-0 h-8 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-500 text-[9px]">
                  {item.type === 'video' ? '视频' : item.type === 'audio' ? '音频' : item.type === 'image' ? '图片' : '文本'}
                </div>
                <div className="flex-1 relative h-8 bg-zinc-900/30 rounded border border-zinc-800/50">
                  <div
                    className={`absolute top-0.5 bottom-0.5 rounded flex items-center px-2 cursor-pointer transition-all ${selectedTrackItem === item.id ? 'ring-2 ring-indigo-400' : ''} ${item.type === 'audio' ? 'bg-emerald-600/30 border border-emerald-500/50 hover:bg-emerald-600/40' : 'bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/40'}`}
                    style={{ left: `${(item.start / duration) * 100}%`, width: `${(item.duration / duration) * 100}%` }}
                    onClick={() => setSelectedTrackItem(item.id)}
                  >
                    <span className="text-[10px] truncate">{item.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 播放指针 */}
          <div className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none" style={{ left: `calc(4rem + ${(currentTime / duration) * (100 - 8)}% + 8px)` }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-red-500" />
          </div>
        </div>
      </div>

      {/* 保存弹窗 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-zinc-900 border-zinc-700 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">保存剪辑项目</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <span className="text-xs text-zinc-400">项目名称</span>
              <Input
                value={projectTitle}
                onChange={e => setProjectTitle(e.target.value)}
                placeholder="输入项目名称"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="text-xs text-zinc-500">轨道数：{tracks.length} · 时长：{duration}s</div>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1 h-9 text-zinc-400 hover:text-zinc-200" onClick={() => setSaveDialogOpen(false)}>取消</Button>
              <Button className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                保存草稿
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
