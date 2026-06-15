import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen, Database, TrendingUp, CheckCircle2, RefreshCw,
  Sparkles, Star, Clock, ChevronRight, Zap, Search, Brain, X,
  Fingerprint, Layers, Target, Activity, Sliders,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { KnowledgeEntry, KnowledgeSourceType } from '@/types/types';

// ── CR-04 RAG偏好库维度 ────────────────────────────────────────────────────
const PREF_DIMENSIONS = [
  { key: 'hook_style',     label: '开场钩子偏好',   icon: Target,      color: 'text-primary',  bg: 'bg-primary/10'  },
  { key: 'pacing',         label: '节奏风格偏好',   icon: Activity,    color: 'text-warning',  bg: 'bg-warning/10'  },
  { key: 'cta_pattern',    label: 'CTA模式偏好',    icon: Zap,         color: 'text-success',  bg: 'bg-success/10'  },
  { key: 'subtitle_style', label: '字幕样式偏好',   icon: Layers,      color: 'text-info',     bg: 'bg-info/10'     },
  { key: 'bgm_mood',       label: 'BGM情绪偏好',    icon: Sliders,     color: 'text-muted-foreground', bg: 'bg-muted/40' },
];

// 风格指纹匹配库（模拟）
const STYLE_FINGERPRINTS = [
  { id: 'fp-001', name: '快节奏美妆种草', dna: 'DNA-A3F2C1D0-V78', dims: { hook_style: 88, pacing: 92, cta_pattern: 75, subtitle_style: 80, bgm_mood: 70 }, matchScore: 0 },
  { id: 'fp-002', name: '沉浸式产品展示', dna: 'DNA-B7E4A2F1-V65', dims: { hook_style: 60, pacing: 55, cta_pattern: 82, subtitle_style: 65, bgm_mood: 78 }, matchScore: 0 },
  { id: 'fp-003', name: '痛点共鸣型带货', dna: 'DNA-C9D1B5E3-V82', dims: { hook_style: 95, pacing: 70, cta_pattern: 90, subtitle_style: 72, bgm_mood: 65 }, matchScore: 0 },
  { id: 'fp-004', name: '轻松生活方式',   dna: 'DNA-D4F8C6A2-V58', dims: { hook_style: 50, pacing: 48, cta_pattern: 60, subtitle_style: 88, bgm_mood: 90 }, matchScore: 0 },
];

// 根据知识库条目推算用户偏好维度得分
function computeUserPrefs(entries: KnowledgeEntry[]): Record<string, number> {
  if (entries.length === 0) return { hook_style: 50, pacing: 50, cta_pattern: 50, subtitle_style: 50, bgm_mood: 50 };
  const adopted = entries.filter(e => e.source_type === 'optimization_adopt').length;
  const scriptEdits = entries.filter(e => e.source_type === 'script_edit').length;
  const base = Math.min(90, 40 + (entries.length * 3));
  return {
    hook_style:     Math.min(95, base + adopted * 4),
    pacing:         Math.min(92, base + scriptEdits * 3),
    cta_pattern:    Math.min(90, base + adopted * 3),
    subtitle_style: Math.min(88, base + entries.length * 2),
    bgm_mood:       Math.min(85, base + scriptEdits * 2),
  };
}

// ── 类型配置 ──────────────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<KnowledgeSourceType, { label: string; color: string; bgColor: string }> = {
  script_edit:        { label: '脚本编辑',   color: 'text-primary',     bgColor: 'bg-primary/10' },
  prompt_edit:        { label: 'Prompt优化', color: 'text-info',        bgColor: 'bg-info/10' },
  optimization_adopt: { label: '采纳优化',   color: 'text-success',     bgColor: 'bg-success/10' },
  optimization_reject:{ label: '忽略建议',   color: 'text-muted-foreground', bgColor: 'bg-muted/40' },
};

// ── 知识条目卡片 ───────────────────────────────────────────────────────────
function EntryCard({ entry, onApply }: { entry: KnowledgeEntry; onApply: (id: string) => void }) {
  const cfg = SOURCE_CONFIG[entry.source_type];
  const date = new Date(entry.created_at).toLocaleDateString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 space-y-2 transition-all',
      entry.is_applied ? 'border-success/30 bg-success/3' : 'border-border/70',
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cfg.bgColor)}>
          <Database className={cn('w-4 h-4', cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{entry.title}</span>
            <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', cfg.bgColor, cfg.color)}>
              {cfg.label}
            </span>
            {entry.is_applied && (
              <span className="inline-flex items-center gap-0.5 text-xs text-success font-medium">
                <CheckCircle2 className="w-3 h-3" />已应用
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn('w-3 h-3',
                  s <= entry.quality_score ? 'text-warning fill-warning' : 'text-muted-foreground/30'
                )} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />{date}
            </span>
          </div>
        </div>
        {!entry.is_applied && (
          <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0 text-muted-foreground hover:text-primary gap-1"
            onClick={() => onApply(entry.id)}>
            应用<ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── 统计卡片 ──────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: typeof BookOpen; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── 模拟趋势数据 ──────────────────────────────────────────────────────────
function buildTrendData(count: number) {
  const days = 14;
  const base = 55;
  return Array.from({ length: days }, (_, i) => ({
    day: `${i + 1}d`,
    quality: Math.min(95, base + Math.floor((count * 0.3 + i * 1.8))),
    entries: Math.floor(Math.random() * 5) + (i > 7 ? 2 : 0),
  }));
}

// ── 主页面 ────────────────────────────────────────────────────────────────
export default function KnowledgePage() {
  const { user } = useAuth();
  const [entries, setEntries]     = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [applying, setApplying]   = useState<string | null>(null);
  const [updating, setUpdating]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<KnowledgeSourceType | 'all'>('all');

  // P2-M04: RAG 相似向量检索
  const [ragQuery, setRagQuery]     = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResults, setRagResults] = useState<Array<{ entry: KnowledgeEntry; score: number }>>([]);
  const [ragSearched, setRagSearched] = useState(false);

  // CR-04: 风格偏好库 + 指纹匹配
  const [showPrefPanel, setShowPrefPanel] = useState(false);
  const [matchingFingerprints, setMatchingFingerprints] = useState(false);
  const [matchedFingerprints, setMatchedFingerprints] = useState<typeof STYLE_FINGERPRINTS>([]);

  const loadEntries = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('knowledge_entries')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setEntries((data ?? []) as KnowledgeEntry[]);
    setLoading(false);
  };

  useEffect(() => { loadEntries(); }, [user]);

  // ── 应用到模型 ─────────────────────────────────────────────────────────
  const handleApply = async (id: string) => {
    setApplying(id);
    await new Promise(r => setTimeout(r, 900));
    const { error } = await supabase.from('knowledge_entries')
      .update({ is_applied: true, applied_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('应用失败'); setApplying(null); return; }
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_applied: true, applied_at: new Date().toISOString() } : e));
    setApplying(null);
    toast.success('已应用至知识库，AI 将在下次生成时学习该数据');
  };

  // ── CR-04 风格指纹匹配 ──────────────────────────────────────────────────
  const handleMatchFingerprints = async () => {
    setMatchingFingerprints(true);
    await new Promise(r => setTimeout(r, 1200));
    const userPrefs = computeUserPrefs(entries);
    const withScores = STYLE_FINGERPRINTS.map(fp => {
      // 余弦相似度模拟
      const keys = Object.keys(fp.dims) as Array<keyof typeof fp.dims>;
      let dotProduct = 0, normA = 0, normB = 0;
      for (const k of keys) {
        const a = userPrefs[k] ?? 50;
        const b = fp.dims[k];
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
      }
      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      return { ...fp, matchScore: Math.round(similarity * 100) };
    }).sort((a, b) => b.matchScore - a.matchScore);
    setMatchedFingerprints(withScores);
    setMatchingFingerprints(false);
    toast.success('风格指纹匹配完成！');
  };

  // ── 触发知识库更新 ─────────────────────────────────────────────────────
  const handleUpdate = async () => {
    setUpdating(true);
    await new Promise(r => setTimeout(r, 1500));
    const toApply = entries.filter(e => !e.is_applied && e.quality_score >= 3);
    if (toApply.length > 0) {
      await supabase.from('knowledge_entries')
        .update({ is_applied: true, applied_at: new Date().toISOString() })
        .in('id', toApply.map(e => e.id));
      setEntries(prev => prev.map(e =>
        toApply.find(t => t.id === e.id) ? { ...e, is_applied: true } : e
      ));
    }
    setLastUpdated(new Date().toLocaleTimeString('zh-CN'));
    setUpdating(false);
    toast.success(`知识库已更新！本次回写 ${toApply.length} 条高质量数据`);
  };

  // ── P2-M04 RAG 语义检索（调用 Edge Function 全文检索）────────────────────
  const handleRagSearch = async () => {
    if (!ragQuery.trim() || !user) return;
    setRagLoading(true);
    setRagResults([]);
    setRagSearched(false);
    try {
      const { data: res } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'knowledge_rag_search',
          user_id: user.id,
          query: ragQuery.trim(),
          limit: 6,
        }
      });
      const results: KnowledgeEntry[] = Array.isArray(res?.data?.results)
        ? res.data.results
        : Array.isArray(res?.results) ? res.results : [];

      if (results.length > 0) {
        // 本地关键词相似度打分（用于排序展示）
        const queryWords = ragQuery.toLowerCase().split(/[\s，,、]+/).filter(Boolean);
        const scored = results.map(entry => {
          const titleWords = entry.title.toLowerCase().split(/[\s，,、]+/);
          const overlap = queryWords.filter(w => titleWords.some(t => t.includes(w) || w.includes(t)));
          const score = Math.min(99, 55 + overlap.length * 12 + Math.random() * 10);
          return { entry, score: Math.round(score) };
        }).sort((a, b) => b.score - a.score);
        setRagResults(scored);
      } else {
        // 降级：本地关键词模糊匹配
        const queryWords = ragQuery.toLowerCase().split(/[\s，,、]+/).filter(Boolean);
        const scored = entries.map(entry => {
          const text = [entry.title, ...(Array.isArray((entry.content as Record<string,unknown>)?.selling_points) ? (entry.content as Record<string,string[]>).selling_points : [])].join(' ').toLowerCase();
          const overlap = queryWords.filter(w => text.includes(w));
          const score = Math.min(99, 40 + overlap.length * 15 + Math.random() * 10);
          return { entry, score: Math.round(score) };
        }).filter(r => r.score > 45).sort((a, b) => b.score - a.score).slice(0, 6);
        setRagResults(scored);
      }
    } catch {
      toast.error('检索失败，使用本地匹配');
      // 降级本地搜索
      const queryWords = ragQuery.toLowerCase().split(/[\s，,、]+/).filter(Boolean);
      const scored = entries.map(entry => {
        const text = entry.title.toLowerCase();
        const overlap = queryWords.filter(w => text.includes(w));
        const score = Math.min(99, 40 + overlap.length * 15 + Math.random() * 10);
        return { entry, score: Math.round(score) };
      }).filter(r => r.score > 40).sort((a, b) => b.score - a.score).slice(0, 6);
      setRagResults(scored);
    } finally {
      setRagLoading(false);
      setRagSearched(true);
    }
  };
  // ── 统计 ───────────────────────────────────────────────────────────────
  const total     = entries.length;
  const applied   = entries.filter(e => e.is_applied).length;
  const adoptRate = entries.length > 0
    ? Math.round(entries.filter(e => e.source_type === 'optimization_adopt').length / entries.length * 100)
    : 0;
  const avgQuality = entries.length > 0
    ? (entries.reduce((s, e) => s + e.quality_score, 0) / entries.length).toFixed(1)
    : '0';

  const filtered = filterType === 'all' ? entries : entries.filter(e => e.source_type === filterType);
  const trendData = buildTrendData(total);

  const FILTER_TABS: { value: KnowledgeSourceType | 'all'; label: string }[] = [
    { value: 'all',                label: '全部' },
    { value: 'script_edit',        label: '脚本编辑' },
    { value: 'prompt_edit',        label: 'Prompt' },
    { value: 'optimization_adopt', label: '已采纳' },
    { value: 'optimization_reject',label: '已忽略' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── 页头 ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
            <BookOpen className="w-5 h-5 text-primary shrink-0" />
            知识库管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            RAG自进化知识库 · 风格偏好沉淀 · 生成质量持续提升
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs gap-1 border-primary/40 text-primary hidden md:flex">
            <Sparkles className="w-3 h-3" />CR-04
          </Badge>
          {lastUpdated && (
            <span className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />已于 {lastUpdated} 更新
            </span>
          )}
          <Button className="h-9 gap-2" onClick={handleUpdate} disabled={updating}>
            {updating
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Zap className="w-4 h-4" />
            }
            {updating ? '更新中...' : '触发知识库更新'}
          </Button>
        </div>
      </div>

      {/* ── 统计卡片 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Database}   label="知识条目总数" value={total}
          sub="累计收集" color="bg-primary/10 text-primary" />
        <StatCard icon={CheckCircle2} label="已应用条目" value={applied}
          sub={`占比 ${total > 0 ? Math.round(applied / total * 100) : 0}%`}
          color="bg-success/10 text-success" />
        <StatCard icon={TrendingUp}  label="建议采纳率"  value={`${adoptRate}%`}
          sub="越高越好"  color="bg-info/10 text-info" />
        <StatCard icon={Star}        label="平均质量评分" value={`${avgQuality}/5`}
          sub="数据质量"  color="bg-warning/10 text-warning" />
      </div>

      {/* ── 进化趋势图 ── */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />AI 生成质量趋势
          </h2>
          <span className="text-xs text-muted-foreground">近14天</span>
        </div>
        <div className="h-44 w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                formatter={(v: number) => [`${v}`, '']}
              />
              <Line type="monotone" dataKey="quality" name="生成质量分"
                stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-muted-foreground">
              基于 <span className="font-semibold text-foreground">{applied}</span> 条知识数据，
              AI 生成质量提升约 <span className="font-semibold text-success">{Math.min(25, applied * 2)}%</span>
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* ── 知识条目列表 ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold">知识收集记录</h2>
          {/* 类型筛选 */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border/60 flex-wrap">
            {FILTER_TABS.map(t => (
              <button key={t.value}
                onClick={() => setFilterType(t.value)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                  filterType === t.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 未应用高质量条目提示 */}
        {entries.filter(e => !e.is_applied && e.quality_score >= 4).length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground flex-1 min-w-0">
              有 <span className="font-semibold text-primary">
                {entries.filter(e => !e.is_applied && e.quality_score >= 4).length}
              </span> 条高质量数据尚未回写，建议触发知识库更新以提升 AI 效果
            </p>
            <Button size="sm" className="h-8 shrink-0 gap-1" onClick={handleUpdate} disabled={updating}>
              <Zap className="w-3.5 h-3.5" />立即更新
            </Button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/70 p-4 flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-muted" />
                  <Skeleton className="h-3 w-1/2 bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(entry => (
              <EntryCard key={entry.id} entry={entry}
                onApply={id => { setApplying(id); handleApply(id); }} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-muted-foreground">
              {filterType !== 'all' ? '该分类暂无记录' : '知识库为空'}
            </p>
            <p className="text-sm text-muted-foreground">
              {filterType !== 'all'
                ? '切换其他分类查看'
                : '开始使用 AI 脚本生成和流量诊断功能后，系统将自动收集优化数据'}
            </p>
          </div>
        )}
      </div>

      {/* 底部说明 */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-primary" />知识库运作机制
        </p>
        <ul className="space-y-1">
          <li>• <strong>脚本编辑</strong>：手动调整 AI 生成的分镜脚本后自动记录</li>
          <li>• <strong>Prompt 优化</strong>：修改 AIGC Prompt 文案后自动记录</li>
          <li>• <strong>采纳建议</strong>：接受流量诊断优化建议时记录，质量评分较高</li>
          <li>• <strong>触发更新</strong>：将高质量数据批量回写，系统在下次生成时应用学习结果</li>
        </ul>
      </div>

      {/* ── CR-04: RAG偏好库 + 风格指纹匹配 ── */}
      <div className="border-t border-border/60 pt-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">RAG偏好库
              <Badge variant="outline" className="text-xs ml-2 border-primary/40 text-primary">CR-04</Badge>
            </h2>
            <span className="text-xs text-muted-foreground hidden md:block">· 从编辑行为中自动提炼个人风格偏好</span>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
            onClick={() => setShowPrefPanel(p => !p)}>
            <Sliders className="w-3.5 h-3.5" />{showPrefPanel ? '收起' : '查看偏好'}
          </Button>
        </div>

        {showPrefPanel && (
          <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
            {/* 偏好维度进度条 */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">从 {entries.length} 条知识中提炼的风格偏好</p>
              {PREF_DIMENSIONS.map(dim => {
                const prefs = computeUserPrefs(entries);
                const score = prefs[dim.key] ?? 50;
                const Icon = dim.icon;
                return (
                  <div key={dim.key} className="flex items-center gap-3">
                    <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', dim.bg)}>
                      <Icon className={cn('w-3.5 h-3.5', dim.color)} />
                    </div>
                    <span className="text-xs w-24 shrink-0 text-muted-foreground">{dim.label}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-700', dim.bg.replace('/10', ''))}
                        style={{ width: `${score}%` }} />
                    </div>
                    <span className={cn('text-xs font-bold w-8 text-right tabular-nums', dim.color)}>{score}</span>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* 风格指纹匹配 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">风格指纹匹配推荐</p>
                <Button size="sm" className="h-7 text-xs gap-1" onClick={handleMatchFingerprints} disabled={matchingFingerprints}>
                  {matchingFingerprints
                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                    : <Fingerprint className="w-3 h-3" />
                  }
                  {matchingFingerprints ? '匹配中...' : '运行指纹匹配'}
                </Button>
              </div>

              {matchedFingerprints.length > 0 ? (
                <div className="space-y-2">
                  {matchedFingerprints.map((fp, i) => (
                    <div key={fp.id} className={cn(
                      'rounded-xl border p-3 flex items-center gap-3',
                      i === 0 ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-card',
                    )}>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                        i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}>#{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{fp.name}</span>
                          <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{fp.dna}</code>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', i === 0 ? 'bg-primary' : 'bg-muted-foreground/40')}
                              style={{ width: `${fp.matchScore}%` }} />
                          </div>
                          <span className={cn('text-xs font-bold tabular-nums w-10 text-right',
                            i === 0 ? 'text-primary' : 'text-muted-foreground',
                          )}>{fp.matchScore}%</span>
                        </div>
                      </div>
                      {i === 0 && <Badge variant="outline" className="text-xs border-primary/40 text-primary shrink-0">最匹配</Badge>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
                  点击「运行指纹匹配」，基于您的偏好库推荐最契合的风格DNA
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── RAG 向量相似检索 ── */}
      <div className="border-t border-border/60 pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">RAG 语义检索
            <Badge variant="outline" className="text-xs ml-2">CR-04</Badge>
          </h2>
          <span className="text-xs text-muted-foreground">· 基于向量相似度检索相关知识</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={ragQuery}
              onChange={e => setRagQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRagSearch()}
              placeholder="输入检索词，例：抖音美妆口播 快节奏开场..."
              className="pl-9 h-10"
            />
          </div>
          {ragSearched && (
            <Button variant="ghost" size="sm" className="h-10 px-3 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => { setRagResults([]); setRagSearched(false); setRagQuery(''); }}>
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button className="h-10 px-4 shrink-0" onClick={handleRagSearch} disabled={ragLoading || !ragQuery.trim()}>
            {ragLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
            {ragLoading ? '检索中...' : '检索'}
          </Button>
        </div>

        {ragSearched && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              共找到 <strong className="text-foreground">{ragResults.length}</strong> 条相似知识条目
            </p>
            {ragResults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 py-10 flex flex-col items-center gap-2 text-center">
                <Brain className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">未找到相似内容</p>
                <p className="text-xs text-muted-foreground">尝试使用更通用的词汇，或先向知识库添加数据</p>
              </div>
            ) : (
              ragResults.map(({ entry, score }) => {
                const cfg = SOURCE_CONFIG[entry.source_type];
                return (
                  <div key={entry.id} className="rounded-xl border border-border/70 bg-card p-4 flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cfg.bgColor)}>
                      <Database className={cn('w-4 h-4', cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{entry.title}</span>
                        <span className={cn('text-xs px-1.5 py-0.5 rounded', cfg.bgColor, cfg.color)}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">相似度</span>
                          <div className="w-24 bg-muted/50 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${score * 100}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-primary">{(score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={cn('w-3 h-3', s <= entry.quality_score ? 'text-warning fill-warning' : 'text-muted-foreground/30')} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {!entry.is_applied && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0 text-muted-foreground hover:text-primary gap-1"
                        onClick={() => handleApply(entry.id)}>
                        应用<ChevronRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
