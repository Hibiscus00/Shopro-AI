/**
 * P2-N02: 情绪 NLP 分析组件（嵌入 ScriptPage 脚本分析区）
 * 独立页面版本供路由访问
 */
import { useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Heart, Loader2, Sparkles, TrendingUp, Target, ShoppingCart,
  Users, Flame, Zap, Minus, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface EmotionSegment {
  index: number;
  text: string;
  emotion: string;
  intensity: number;
  color: string;
  suggestion: string;
}

const EMOTION_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string }> = {
  hook:         { label: '钩子引导',   icon: Flame,        bg: 'bg-amber-500/10' },
  pain_point:   { label: '痛点共鸣',   icon: Heart,        bg: 'bg-red-500/10' },
  product_intro:{ label: '产品介绍',   icon: Target,       bg: 'bg-blue-500/10' },
  social_proof: { label: '社会证明',   icon: Users,        bg: 'bg-purple-500/10' },
  promotion:    { label: '促销紧迫',   icon: Zap,          bg: 'bg-amber-500/10' },
  cta:          { label: '行动号召',   icon: ShoppingCart, bg: 'bg-green-500/10' },
  neutral:      { label: '中性叙述',   icon: Minus,        bg: 'bg-muted' },
};

interface Props {
  initialText?: string;
}

export default function EmotionAnalysisPage({ initialText = '' }: Props) {
  const { user } = useAuth();
  const [text, setText] = useState(initialText);
  const [segments, setSegments] = useState<EmotionSegment[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const analyze = async () => {
    if (!text.trim()) { toast.error('请输入要分析的脚本文本'); return; }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'emotion_analysis', text, user_id: user?.id ?? '' },
      });
      if (error) throw error;
      const result = data?.data ?? data;
      setSegments(Array.isArray(result?.segments) ? result.segments : []);
      if (result?.segments?.length === 0) toast.info('未识别到情绪片段，请检查文本内容');
    } catch (e) {
      toast.error('分析失败：' + (e instanceof Error ? e.message : '未知错误'));
    } finally {
      setAnalyzing(false);
    }
  };

  // 情绪分布统计
  const distribution = segments.reduce<Record<string, number>>((acc, s) => {
    acc[s.emotion] = (acc[s.emotion] ?? 0) + 1;
    return acc;
  }, {});
  const total = segments.length || 1;
  const avgIntensity = segments.length > 0
    ? Math.round(segments.reduce((s, v) => s + v.intensity, 0) / segments.length)
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
            <Heart className="w-5 h-5 text-primary shrink-0" />口播台词优化
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            识别脚本台词中的情绪类型与强度，优化带货转化节奏
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs gap-1 border-primary/40 text-primary">
          <BarChart3 className="w-3 h-3" />P2-N02
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左侧输入 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-balance">脚本输入</CardTitle>
              <CardDescription>粘贴视频口播台词或脚本正文</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="例如：你有没有觉得皮肤越来越暗沉？今天给你推荐一款神仙面膜！就是这款！成分天然零添加，用了三天就白了一个色号！现在限时五折，点击下方购买链接！"
                className="min-h-[180px] resize-none text-sm"
              />
              <Button onClick={analyze} disabled={analyzing || !text.trim()} className="w-full">
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {analyzing ? '分析中…' : '开始情绪分析'}
              </Button>
            </CardContent>
          </Card>

          {/* 情绪分布 */}
          {segments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-balance">情绪分布</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">平均情绪强度</span>
                  <span className="font-bold text-primary">{avgIntensity} / 100</span>
                </div>
                {Object.entries(distribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([emotion, count]) => {
                    const cfg = EMOTION_CONFIG[emotion] ?? EMOTION_CONFIG.neutral;
                    const Icon = cfg.icon;
                    return (
                      <div key={emotion} className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: segments.find(s => s.emotion === emotion)?.color }} />
                        <span className="text-xs text-muted-foreground w-20 shrink-0">{cfg.label}</span>
                        <div className="flex-1 bg-muted rounded-full h-1.5 min-w-0">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${(count / total) * 100}%`, backgroundColor: segments.find(s => s.emotion === emotion)?.color ?? 'hsl(var(--primary))' }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{count}</span>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧时间轴 */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-balance">情绪时间轴</CardTitle>
              <CardDescription>每句台词的情绪类型与强度可视化</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {analyzing ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full bg-muted" />)}
                </div>
              ) : segments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm gap-3">
                  <TrendingUp className="w-10 h-10 opacity-30" />
                  <p>输入脚本后点击分析，查看情绪时间轴</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {segments.map((seg, i) => {
                    const cfg = EMOTION_CONFIG[seg.emotion] ?? EMOTION_CONFIG.neutral;
                    const Icon = cfg.icon;
                    return (
                      <div key={i} className={cn('p-3 rounded-lg border transition-all', cfg.bg, 'border-transparent')}>
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                            <Icon className="w-4 h-4 shrink-0" style={{ color: seg.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <Badge
                                className="text-xs px-1.5 py-0 border"
                                style={{ backgroundColor: seg.color + '20', color: seg.color, borderColor: seg.color + '40' }}
                              >
                                {cfg.label}
                              </Badge>
                              <div className="flex items-center gap-1 shrink-0">
                                <div className="w-16 bg-muted rounded-full h-1 min-w-0">
                                  <div className="h-1 rounded-full" style={{ width: `${seg.intensity}%`, backgroundColor: seg.color }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{seg.intensity}</span>
                              </div>
                            </div>
                            <p className="text-sm text-pretty">{seg.text}</p>
                            {seg.suggestion && (
                              <p className="text-xs text-muted-foreground mt-1 italic">💡 {seg.suggestion}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
