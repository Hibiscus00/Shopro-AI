import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, BarChart3, RefreshCw, Zap,
  Eye, MousePointerClick, ShoppingCart, DollarSign,
  Clock, Play, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── 类型 ────────────────────────────────────────────────────────────────────
interface AdPerformance {
  id: string;
  platform: string;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  play_count: number;
  avg_watch_time: number;
  ctr: number;
  cvr: number;
  roas: number;
}

const PLATFORM_LABELS: Record<string, string> = {
  douyin: '抖音', tiktok: 'TikTok', xiaohongshu: '小红书', kuaishou: '快手', bilibili: 'B站',
};

function Trend({ val, prev }: { val: number; prev: number }) {
  if (!prev || prev === 0) return null;
  const pct = Math.round(((val - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={cn('inline-flex items-center text-xs font-medium', up ? 'text-success' : 'text-destructive')}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

// 生成模拟投放数据（实际场景通过平台API回流）
function buildDemoData(days: number): AdPerformance[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const impressions = 5000 + Math.floor(Math.random() * 15000);
    const clicks = Math.floor(impressions * (0.04 + Math.random() * 0.06));
    const conversions = Math.floor(clicks * (0.03 + Math.random() * 0.05));
    const spend = +(200 + Math.random() * 800).toFixed(2);
    const revenue = +(spend * (1.5 + Math.random() * 2)).toFixed(2);
    return {
      id: `demo_${i}`,
      platform: ['douyin','tiktok','xiaohongshu'][i % 3],
      date: d.toISOString().slice(0,10),
      impressions,
      clicks,
      conversions,
      spend,
      revenue,
      play_count: impressions,
      avg_watch_time: +(15 + Math.random() * 20).toFixed(1),
      ctr: +(clicks / impressions * 100).toFixed(2),
      cvr: +(conversions / clicks * 100).toFixed(2),
      roas: +(revenue / spend).toFixed(2),
    };
  });
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function DataFeedbackPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('14d');
  const [platform, setPlatform] = useState('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0,10);
    let q = supabase.from('ad_performance').select('*').eq('user_id', user.id).gte('date', since).order('date');
    if (platform !== 'all') q = q.eq('platform', platform);
    const { data: rows } = await q;

    if (!rows || rows.length === 0) {
      // 使用演示数据
      setData(buildDemoData(days));
    } else {
      setData(rows as AdPerformance[]);
    }
    setLoading(false);
  }, [user, range, platform]);

  useEffect(() => { loadData(); }, [loadData]);

  // 聚合指标
  const totalImpressions = data.reduce((a, d) => a + d.impressions, 0);
  const totalClicks      = data.reduce((a, d) => a + d.clicks, 0);
  const totalConversions = data.reduce((a, d) => a + d.conversions, 0);
  const totalSpend       = +data.reduce((a, d) => a + +d.spend, 0).toFixed(2);
  const totalRevenue     = +data.reduce((a, d) => a + +d.revenue, 0).toFixed(2);
  const avgCTR           = data.length ? +(data.reduce((a, d) => a + +d.ctr, 0) / data.length).toFixed(2) : 0;
  const avgCVR           = data.length ? +(data.reduce((a, d) => a + +d.cvr, 0) / data.length).toFixed(2) : 0;
  const avgROAS          = data.length ? +(data.reduce((a, d) => a + +d.roas, 0) / data.length).toFixed(2) : 0;

  // 趋势图
  const trendData = data.map(d => ({
    date: d.date.slice(5),
    曝光量: d.impressions,
    点击量: d.clicks,
    转化量: d.conversions,
    消耗: +d.spend,
    营收: +d.revenue,
    CTR: +d.ctr,
    ROAS: +d.roas,
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 标题 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />投放效果数据回流
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">P3-S02 · 广告投放效果全链路追踪，优化 ROI</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-9 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部平台</SelectItem>
              {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">近7天</SelectItem>
              <SelectItem value="14d">近14天</SelectItem>
              <SelectItem value="30d">近30天</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-1" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* 注意：演示数据提示 */}
      <div className="rounded-xl border border-info/30 bg-info/5 p-3 flex items-center gap-2 text-xs text-info">
        <Zap className="w-3.5 h-3.5 shrink-0" />
        当前显示演示数据。实际使用时，通过平台 Webhook 或 API 将真实广告数据回传至系统。
      </div>

      {/* KPI 指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '总曝光量', val: totalImpressions.toLocaleString(), icon: Eye, color: 'text-primary' },
          { label: '总点击量', val: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'text-info' },
          { label: '总转化量', val: totalConversions.toLocaleString(), icon: ShoppingCart, color: 'text-success' },
          { label: '总营收', val: `¥${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-warning' },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <m.icon className={cn('w-8 h-8 shrink-0', m.color)} />
              <div>
                <p className="text-base md:text-lg font-bold truncate">{loading ? '…' : m.val}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 效率指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'CTR 点击率', val: `${avgCTR}%`, desc: '点击/曝光', good: avgCTR > 4 },
          { label: 'CVR 转化率', val: `${avgCVR}%`, desc: '转化/点击', good: avgCVR > 3 },
          { label: 'ROAS 回报率', val: `${avgROAS}x`, desc: '营收/消耗', good: avgROAS > 2 },
          { label: '总消耗', val: `¥${totalSpend.toLocaleString()}`, desc: '广告投放成本', good: true },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <Badge variant="outline" className={cn('text-[10px]', m.good ? 'text-success border-success/40' : 'text-warning border-warning/40')}>
                  {m.good ? '良好' : '待优化'}
                </Badge>
              </div>
              <p className="text-xl font-bold">{loading ? '…' : m.val}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">曝光 / 点击 / 转化趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 6 }} />
                  <Area type="monotone" dataKey="曝光量" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="点击量" stroke="hsl(var(--info))" fill="hsl(var(--info)/0.1)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="转化量" stroke="hsl(var(--success))" fill="hsl(var(--success)/0.1)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">消耗 vs 营收</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 6 }} />
                  <Bar dataKey="消耗" fill="hsl(var(--warning))" radius={[3,3,0,0]} />
                  <Bar dataKey="营收" fill="hsl(var(--success))" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CTR 点击率 & ROAS 回报率趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 6 }} />
                  <Line type="monotone" dataKey="CTR" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ROAS" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
