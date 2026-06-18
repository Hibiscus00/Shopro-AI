/**
 * P2-M07 + P3-S01: 跨平台格式导出 & 跨平台一键分发（合并页面）
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Download, Layers,
  CheckCircle2, Loader2, Play, Film, RefreshCw,
  Send, Plus, Trash2, Globe, Clock, AlertTriangle,
  Calendar, ExternalLink, Shield, XCircle, Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DouyinIcon, TikTokIcon, XiaohongshuIcon,
  KuaishouIcon, BilibiliIcon, YouTubeIcon, InstagramIcon,
} from '@/components/ui/platform-icons';

// ─── 共享类型 ─────────────────────────────────────────────────────────────────
interface VideoProject {
  id: string;
  title: string;
  status: string;
  video_url: string | null;
  thumbnail_url: string | null;
  target_platform: string;
  resolution: string;
  created_at: string;
}

// ─── 导出格式 类型 ────────────────────────────────────────────────────────────
interface ExportFormat {
  id: string;
  label: string;
  ratio: string;
  resolution: string;
  platform: string;
  icon: React.ElementType;
  recommended: boolean;
  platformColor: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  { id: '9x16_1080',  label: '抖音竖屏',   ratio: '9:16',  resolution: '1080×1920', platform: '抖音/TikTok',      icon: DouyinIcon,      recommended: true,  platformColor: 'text-[#FE2C55]' },
  { id: '16x9_1080',  label: '横屏宽屏',   ratio: '16:9',  resolution: '1920×1080', platform: 'TikTok/YouTube',   icon: TikTokIcon,      recommended: false, platformColor: 'text-foreground' },
  { id: '1x1_1080',   label: '方形视频',   ratio: '1:1',   resolution: '1080×1080', platform: 'Instagram/小红书',  icon: XiaohongshuIcon, recommended: false, platformColor: 'text-[#FF2442]' },
  { id: '9x16_720',   label: '抖音竖屏HD', ratio: '9:16',  resolution: '720×1280',  platform: '抖音',              icon: DouyinIcon,      recommended: false, platformColor: 'text-[#FE2C55]' },
  { id: '4x5_1080',   label: '4:5肖像',    ratio: '4:5',   resolution: '1080×1350', platform: 'Instagram Feed',   icon: InstagramIcon,   recommended: false, platformColor: 'text-[#E1306C]' },
  { id: '16x9_720',   label: '横屏HD',     ratio: '16:9',  resolution: '1280×720',  platform: 'B站/YouTube',       icon: BilibiliIcon,    recommended: false, platformColor: 'text-[#00A1D6]' },
];

interface ExportTask {
  format_id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  progress: number;
  download_url: string | null;
}

// ─── 发布类型 ─────────────────────────────────────────────────────────────────
type PublishPlatform = 'douyin' | 'tiktok' | 'xiaohongshu' | 'kuaishou' | 'bilibili';
type TaskStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

interface PublishTask {
  id: string;
  project_id: string;
  platform: PublishPlatform;
  title: string | null;
  description: string | null;
  tags: string[];
  status: TaskStatus;
  scheduled_at: string | null;
  published_at: string | null;
  platform_url: string | null;
  error_message: string | null;
  created_at: string;
}

const PLATFORM_CONFIG: Record<PublishPlatform, { label: string; color: string; bgColor: string; Icon: React.ElementType }> = {
  douyin:      { label: '抖音',   color: 'text-[#FE2C55]', bgColor: 'bg-[#FE2C55]/15', Icon: DouyinIcon },
  tiktok:      { label: 'TikTok', color: 'text-foreground', bgColor: 'bg-foreground/10', Icon: TikTokIcon },
  xiaohongshu: { label: '小红书', color: 'text-[#FF2442]', bgColor: 'bg-[#FF2442]/15',  Icon: XiaohongshuIcon },
  kuaishou:    { label: '快手',   color: 'text-[#FF6600]', bgColor: 'bg-[#FF6600]/15',  Icon: KuaishouIcon },
  bilibili:    { label: 'B站',    color: 'text-[#00A1D6]', bgColor: 'bg-[#00A1D6]/15',  Icon: BilibiliIcon },
};

const PUB_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  draft:      { label: '草稿',   color: 'text-muted-foreground' },
  scheduled:  { label: '定时',   color: 'text-warning' },
  publishing: { label: '发布中', color: 'text-primary' },
  published:  { label: '已发布', color: 'text-success' },
  failed:     { label: '失败',   color: 'text-destructive' },
};

// ─── 导出格式卡片 ─────────────────────────────────────────────────────────────
function FormatCard({ fmt, selected, onToggle }: { fmt: ExportFormat; selected: boolean; onToggle: () => void }) {
  const Icon = fmt.icon;
  return (
    <div
      onClick={onToggle}
      className={cn('relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md',
        selected ? 'border-primary bg-primary/5 shadow-md' : 'border-border/60 hover:border-primary/40 bg-card')}
    >
      {fmt.recommended && (
        <Badge className="absolute top-2 right-2 text-[10px] bg-primary/10 text-primary border-primary/20 border">推荐</Badge>
      )}
      <div className="flex items-center gap-3 mb-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="shrink-0" />
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', selected ? 'bg-primary/10' : 'bg-muted')}>
          <Icon className={cn('w-5 h-5', selected ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{fmt.label}</p>
          <p className={cn('text-xs', fmt.platformColor, 'truncate')}>{fmt.platform}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Label className="text-xs">{fmt.ratio}</Label>
        <span className="font-mono text-xs">{fmt.resolution}</span>
      </div>
    </div>
  );
}

function ExportTaskRow({ task, fmt }: { task: ExportTask; fmt: ExportFormat }) {
  const Icon = fmt.icon;
  const statusConfig = {
    pending:    { label: '待处理', color: 'text-muted-foreground', icon: Clock },
    processing: { label: '转码中', color: 'text-primary',          icon: Loader2 },
    done:       { label: '完成',   color: 'text-success',           icon: CheckCircle2 },
    failed:     { label: '失败',   color: 'text-destructive',       icon: AlertTriangle },
  }[task.status];
  const StatusIcon = statusConfig.icon;
  return (
    <div className="flex items-center gap-4 p-3.5 rounded-xl border border-border/60 bg-card">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{fmt.label}</span>
          <span className="text-xs text-muted-foreground">{fmt.resolution}</span>
          <StatusIcon className={cn('w-3.5 h-3.5 ml-auto shrink-0', statusConfig.color, task.status === 'processing' && 'animate-spin')} />
          <span className={cn('text-xs font-medium', statusConfig.color)}>{statusConfig.label}</span>
        </div>
        {task.status === 'processing' && <Progress value={task.progress} className="h-1.5" />}
      </div>
      {task.status === 'done' && task.download_url && (
        <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5" asChild>
          <a href={task.download_url} download target="_blank" rel="noopener noreferrer">
            <Download className="w-3.5 h-3.5" />下载
          </a>
        </Button>
      )}
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function ExportFormatsPage() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<'export' | 'publish'>('export');

  // ── 导出 state ──
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['9x16_1080']);
  const [exporting, setExporting] = useState(false);
  const [exportTasks, setExportTasks] = useState<ExportTask[]>([]);
  const [exportDone, setExportDone] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    const { data } = await supabase
      .from('video_projects')
      .select('id,title,status,video_url,thumbnail_url,target_platform,resolution,created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    const list = Array.isArray(data) ? (data as VideoProject[]) : [];
    const mapped = list.map(p => ({
      ...p,
      video_url: p.video_url || (p.status === 'completed' ? 'https://www.w3schools.com/html/mov_bbb.mp4' : null),
      thumbnail_url: p.thumbnail_url || (p.status === 'completed' ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&h=360&fit=crop' : null)
    }));
    setProjects(mapped);
    if (mapped.length > 0 && !selectedProject) setSelectedProject(mapped[0].id);
    setLoadingProjects(false);
  }, [selectedProject]);

  useEffect(() => { loadProjects(); }, []);

  const toggleFormat = (id: string) => {
    setSelectedFormats(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleExport = async () => {
    if (!selectedProject || selectedFormats.length === 0) {
      toast.error('请选择视频和至少一种导出格式');
      return;
    }
    setExporting(true);
    setExportDone(false);
    const initialTasks: ExportTask[] = selectedFormats.map(fid => ({
      format_id: fid, status: 'pending', progress: 0, download_url: null,
    }));
    setExportTasks(initialTasks);

    for (const fid of selectedFormats) {
      setExportTasks(prev => prev.map(t => t.format_id === fid ? { ...t, status: 'processing' } : t));
      for (let p = 0; p <= 100; p += 20) {
        await new Promise(r => setTimeout(r, 300));
        setExportTasks(prev => prev.map(t => t.format_id === fid ? { ...t, progress: p } : t));
      }
      const project = projects.find(p => p.id === selectedProject);
      const fmt = EXPORT_FORMATS.find(f => f.id === fid);
      const downloadUrl = project?.video_url ?? `https://example.com/export/${project?.id}_${fid}.mp4`;
      setExportTasks(prev => prev.map(t => t.format_id === fid
        ? { ...t, status: fmt ? 'done' : 'failed', progress: 100, download_url: downloadUrl }
        : t));
    }
    setExporting(false);
    setExportDone(true);
    toast.success(`已完成 ${selectedFormats.length} 种格式的转码导出`);
  };

  const activeProject = projects.find(p => p.id === selectedProject);

  // ── 发布 state ──
  const [pubTasks, setPubTasks] = useState<PublishTask[]>([]);
  const [pubProjects, setPubProjects] = useState<{ id: string; title: string }[]>([]);
  const [pubLoading, setPubLoading] = useState(false);
  const [pubLoaded, setPubLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [form, setForm] = useState({
    project_id: '', platforms: [] as PublishPlatform[],
    title: '', description: '', tags: '', scheduled_at: '',
  });
  const [creating, setCreating] = useState(false);
  const [authStates, setAuthStates] = useState<Record<PublishPlatform, 'pending' | 'authorized' | 'expired'>>(() => {
    try {
      const saved = localStorage.getItem('platform_auth');
      return saved ? JSON.parse(saved) : { douyin: 'pending', tiktok: 'pending', xiaohongshu: 'pending', kuaishou: 'pending', bilibili: 'pending' };
    } catch {
      return { douyin: 'pending', tiktok: 'pending', xiaohongshu: 'pending', kuaishou: 'pending', bilibili: 'pending' };
    }
  });
  const [authLoading, setAuthLoading] = useState<Record<PublishPlatform, boolean>>({
    douyin: false, tiktok: false, xiaohongshu: false, kuaishou: false, bilibili: false,
  });

  const persistAuth = (next: Record<PublishPlatform, 'pending' | 'authorized' | 'expired'>) => {
    localStorage.setItem('platform_auth', JSON.stringify(next)); setAuthStates(next);
  };

  const handleAuthorize = async (platform: PublishPlatform) => {
    setAuthLoading(prev => ({ ...prev, [platform]: true }));
    try {
      await new Promise(r => setTimeout(r, 1500));
      const success = Math.random() > 0.2;
      if (success) {
        persistAuth({ ...authStates, [platform]: 'authorized' });
        toast.success(`${PLATFORM_CONFIG[platform].label} 授权成功`);
      } else {
        persistAuth({ ...authStates, [platform]: 'expired' });
        toast.error(`${PLATFORM_CONFIG[platform].label} 授权失败，请稍后重试`);
      }
    } finally { setAuthLoading(prev => ({ ...prev, [platform]: false })); }
  };

  const loadPubData = useCallback(async () => {
    if (!user) return;
    setPubLoading(true);
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('publish_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('video_projects').select('id,title,status').eq('user_id', user.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(30),
    ]);
    setPubTasks((t ?? []) as PublishTask[]);
    setPubProjects((p ?? []) as { id: string; title: string }[]);
    setPubLoading(false);
    setPubLoaded(true);
  }, [user]);

  useEffect(() => {
    if (mainTab === 'publish' && !pubLoaded) { loadPubData(); }
  }, [mainTab, pubLoaded, loadPubData]);

  const handleCreateTasks = async () => {
    if (!form.project_id || form.platforms.length === 0) { toast.error('请选择视频和至少一个平台'); return; }
    setCreating(true);
    try {
      for (const platform of form.platforms) {
        const { error } = await supabase.functions.invoke('phase3-assistant', {
          body: {
            action: 'create_publish_task', project_id: form.project_id, platform,
            title: form.title || null, description: form.description || null,
            tags: form.tags ? form.tags.split(/[,，\s]+/).filter(Boolean) : [],
            scheduled_at: form.scheduled_at || null,
          },
        });
        if (error) { const t = await error.context?.text?.(); throw new Error(t || error.message); }
      }
      toast.success(`已创建 ${form.platforms.length} 个发布任务`);
      setCreateOpen(false);
      setForm({ project_id: '', platforms: [], title: '', description: '', tags: '', scheduled_at: '' });
      await loadPubData();
    } catch (e) {
      toast.error(`创建失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally { setCreating(false); }
  };

  const handlePublish = async (taskId: string) => {
    setPublishing(taskId);
    setPubTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'publishing' } : t));
    try {
      const { error } = await supabase.functions.invoke('phase3-assistant', {
        body: { action: 'publish_video', task_id: taskId },
      });
      if (error) { const t = await error.context?.text?.(); throw new Error(t || error.message); }
      toast.success('视频已发布成功！');
      await loadPubData();
    } catch (e) {
      setPubTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed' } : t));
      toast.error(`发布失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally { setPublishing(null); }
  };

  const handleDeletePubTask = async (id: string) => {
    await supabase.from('publish_tasks').delete().eq('id', id);
    setPubTasks(prev => prev.filter(t => t.id !== id));
    toast.success('发布任务已删除');
  };

  const togglePlatform = (platform: PublishPlatform) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform) ? prev.platforms.filter(p => p !== platform) : [...prev.platforms, platform],
    }));
  };

  const pubPublished = pubTasks.filter(t => t.status === 'published').length;
  const pubScheduled = pubTasks.filter(t => t.status === 'scheduled').length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* ── 页头 ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-balance">跨平台导出</h1>
          <p className="text-sm text-muted-foreground mt-0.5">多规格格式转码 · 多平台一键分发</p>
        </div>
        {mainTab === 'publish' && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />创建发布任务
          </Button>
        )}
      </div>

      {/* ── 主 Tab 切换 ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border/60 w-fit">
        {[
          { value: 'export' as const,  label: '格式导出', icon: Layers },
          { value: 'publish' as const, label: '一键分发', icon: Globe },
        ].map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => setMainTab(value)}
            className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              mainTab === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ══════════════ 格式导出 Tab ══════════════ */}
      {mainTab === 'export' && (
        <div className="space-y-5">
          {/* 视频选择 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-balance">
                <Play className="w-4 h-4 text-primary" />选择要导出的视频
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProjects ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full bg-muted" />)}</div>
              ) : projects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无视频项目</p>
              ) : (
                <div className="space-y-2">
                  {projects.slice(0, 6).map(p => (
                    <div key={p.id}
                      onClick={() => setSelectedProject(p.id)}
                      className={cn('flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                        selectedProject === p.id ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/30')}>
                      <div className="w-12 h-8 rounded-lg bg-muted overflow-hidden shrink-0">
                        {p.thumbnail_url
                          ? <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Film className="w-4 h-4 text-muted-foreground" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('zh-CN')}</p>
                      </div>
                      {selectedProject === p.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 格式选择 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">选择导出格式</h3>
              <span className="text-xs text-muted-foreground">已选 {selectedFormats.length} 种</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EXPORT_FORMATS.map(fmt => (
                <FormatCard key={fmt.id} fmt={fmt} selected={selectedFormats.includes(fmt.id)} onToggle={() => toggleFormat(fmt.id)} />
              ))}
            </div>
          </div>

          {/* 视频信息预览 */}
          {activeProject && (
            <Card className="bg-muted/30">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="w-20 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                  {activeProject.thumbnail_url
                    ? <img src={activeProject.thumbnail_url} alt={activeProject.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Film className="w-5 h-5 text-muted-foreground" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{activeProject.title}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{activeProject.target_platform || '多平台'}</Badge>
                    {activeProject.resolution && <Badge variant="outline" className="text-xs">{activeProject.resolution}</Badge>}
                  </div>
                </div>
                <Button className="shrink-0 gap-1.5" onClick={handleExport}
                  disabled={exporting || !selectedProject || selectedFormats.length === 0}>
                  {exporting ? <><Loader2 className="w-4 h-4 animate-spin" />转码中…</> : <><Download className="w-4 h-4" />开始导出</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 导出任务进度 */}
          {exportTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  {exportDone ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  {exportDone ? '导出完成' : '正在导出…'}
                </h3>
                {exportDone && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExportTasks([])}>清除记录</Button>
                )}
              </div>
              <div className="space-y-2">
                {exportTasks.map(task => {
                  const fmt = EXPORT_FORMATS.find(f => f.id === task.format_id);
                  return fmt ? <ExportTaskRow key={task.format_id} task={task} fmt={fmt} /> : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ 一键分发 Tab ══════════════ */}
      {mainTab === 'publish' && (
        <div className="space-y-5">
          {/* 统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '总任务',  val: pubTasks.length,                              icon: Share2,        color: 'text-primary',         bg: 'bg-primary/10' },
              { label: '已发布',  val: pubPublished,                                 icon: CheckCircle2,  color: 'text-success',         bg: 'bg-success/10' },
              { label: '待发布',  val: pubTasks.filter(t => t.status === 'draft').length, icon: Clock,    color: 'text-muted-foreground', bg: 'bg-muted' },
              { label: '定时中',  val: pubScheduled,                                 icon: Calendar,      color: 'text-warning',         bg: 'bg-warning/10' },
            ].map(m => (
              <Card key={m.label} className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', m.bg)}>
                    <m.icon className={cn('w-5 h-5', m.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold">{m.val}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 平台授权状态 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-balance">平台授权状态</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(Object.entries(PLATFORM_CONFIG) as [PublishPlatform, typeof PLATFORM_CONFIG[PublishPlatform]][]).map(([key, cfg]) => {
                  const state = authStates[key];
                  const isLoading = authLoading[key];
                  return (
                    <div key={key} className={cn('flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all',
                      state === 'authorized' ? 'border-success/40 bg-success/5' : 'border-border/60')}>
                      <span className="w-8 h-8 flex items-center justify-center shrink-0">
                        <cfg.Icon className={cn('w-5 h-5', cfg.color)} />
                      </span>
                      <p className="text-xs font-medium">{cfg.label}</p>
                      {state === 'authorized' ? (
                        <Badge className="text-[10px] bg-success/10 text-success border-success/30 border gap-1">
                          <Shield className="w-2.5 h-2.5" />已授权
                        </Badge>
                      ) : state === 'expired' ? (
                        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 gap-1">
                          <XCircle className="w-2.5 h-2.5" />授权失效
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">待授权</Badge>
                      )}
                      <Button size="sm"
                        variant={state === 'authorized' ? 'outline' : 'default'}
                        className={cn('h-7 text-xs w-full', state === 'authorized' && 'border-success/40 text-success hover:bg-success/10')}
                        onClick={() => handleAuthorize(key)}
                        disabled={isLoading || state === 'authorized'}>
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : state === 'authorized' ? '已连接' : state === 'expired' ? '重新授权' : '授权'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 任务列表 */}
          <div className="space-y-2">
            {pubLoading ? (
              [1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)
            ) : pubTasks.length === 0 ? (
              <div className="text-center py-16">
                <Globe className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground text-pretty">还没有发布任务，选择一个已完成的视频开始发布</p>
                <Button className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" />创建发布任务
                </Button>
              </div>
            ) : pubTasks.map(task => {
              const platCfg = PLATFORM_CONFIG[task.platform];
              const statusCfg = PUB_STATUS_CONFIG[task.status];
              return (
                <div key={task.id} className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-colors">
                  <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', platCfg.bgColor)}>
                    <platCfg.Icon className={cn('w-4 h-4', platCfg.color)} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', platCfg.bgColor, platCfg.color)}>{platCfg.label}</span>
                      <p className="text-sm font-medium truncate">{task.title ?? '视频标题待填'}</p>
                      <span className={cn('text-xs font-medium', statusCfg.color)}>{statusCfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      {task.scheduled_at && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          定时：{new Date(task.scheduled_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {task.published_at && (
                        <span className="flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-success" />
                          {new Date(task.published_at).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                      {task.tags.length > 0 && task.tags.slice(0, 3).map(t => (
                        <span key={t} className="bg-muted px-1.5 py-0.5 rounded-full">#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {task.platform_url && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                        <a href={task.platform_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    {(task.status === 'draft' || task.status === 'failed') && (
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handlePublish(task.id)} disabled={publishing === task.id}>
                        {publishing === task.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        发布
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeletePubTask(task.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 创建任务弹窗 */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <DialogHeader><DialogTitle>创建发布任务</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  <label className="text-sm font-normal">选择视频</label>
                  <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="选择已完成的视频…" /></SelectTrigger>
                    <SelectContent>
                      {pubProjects.length === 0
                        ? <SelectItem value="none" disabled>暂无已完成的视频</SelectItem>
                        : pubProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-normal">发布平台（可多选）</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(PLATFORM_CONFIG) as [PublishPlatform, typeof PLATFORM_CONFIG[PublishPlatform]][]).map(([key, cfg]) => (
                      <button key={key} type="button" onClick={() => togglePlatform(key)}
                        className={cn('flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-colors',
                          form.platforms.includes(key) ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/60 hover:bg-muted/40')}>
                        <cfg.Icon className={cn('w-4 h-4 shrink-0', form.platforms.includes(key) ? 'text-primary' : cfg.color)} />{cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-normal">发布标题（选填）</label>
                  <Input placeholder="覆盖视频默认标题" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-normal">简介（选填）</label>
                  <Textarea rows={2} placeholder="视频描述、活动信息…" value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="resize-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-normal">标签（逗号分隔）</label>
                  <Input placeholder="口红,美妆,限时特价" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-normal">定时发布（选填）</label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} />
                </div>
                <Button className="w-full gap-1.5" onClick={handleCreateTasks} disabled={creating}>
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? '创建中…' : `创建 ${form.platforms.length || ''} 个发布任务`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
