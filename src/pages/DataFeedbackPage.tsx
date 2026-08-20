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
  Clock, Play, ArrowUpRight, ArrowDownRight, Plus, X
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
  // 生成5个平台的所有数据
  const platforms = ['douyin', 'tiktok', 'xiaohongshu', 'kuaishou', 'bilibili'];
  const list: AdPerformance[] = [];
  for (let dIndex = 0; dIndex < days; dIndex++) {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - dIndex));
    const dateStr = d.toISOString().slice(0, 10);
    platforms.forEach((platform, pIndex) => {
      const impressions = 5000 + Math.floor(Math.random() * 15000);
      const clicks = Math.floor(impressions * (0.04 + Math.random() * 0.06));
      const conversions = Math.floor(clicks * (0.03 + Math.random() * 0.05));
      const spend = +(200 + Math.random() * 800).toFixed(2);
      const revenue = +(spend * (1.5 + Math.random() * 2)).toFixed(2);
      list.push({
        id: `demo_${dIndex}_${platform}`,
        platform,
        date: dateStr,
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
      });
    });
  }
  return list;
}

// 生成全是0的空数据（未登录状态）
function buildZeroData(days: number): AdPerformance[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    return {
      id: `zero_${i}`,
      platform: ['douyin', 'tiktok', 'xiaohongshu', 'kuaishou', 'bilibili'][i % 5],
      date: d.toISOString().slice(0,10),
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0,
      play_count: 0,
      avg_watch_time: 0,
      ctr: 0,
      cvr: 0,
      roas: 0,
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [platformAuths, setPlatformAuths] = useState<Record<string, 'pending' | 'authorized'>>({
    douyin: 'pending',
    tiktok: 'pending',
    xiaohongshu: 'pending',
    kuaishou: 'pending',
    bilibili: 'pending',
  });

  // 从 localStorage 初始化平台授权状态
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`platform_auths_${user.id}`);
    if (saved) {
      try {
        setPlatformAuths(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse platform auths', e);
      }
    } else {
      setPlatformAuths({
        douyin: 'pending',
        tiktok: 'pending',
        xiaohongshu: 'pending',
        kuaishou: 'pending',
        bilibili: 'pending',
      });
    }
  }, [user]);

  const updatePlatformAuth = (key: string, status: 'pending' | 'authorized') => {
    setPlatformAuths(prev => {
      const next = { ...prev, [key]: status };
      if (user) {
        localStorage.setItem(`platform_auths_${user.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const loadData = useCallback(async () => {
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    if (!user) {
      setData(buildZeroData(days));
      setLoading(false);
      return;
    }
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0,10);
    let q = supabase.from('ad_performance').select('*').eq('user_id', user.id).gte('date', since).order('date');
    if (platform !== 'all') q = q.eq('platform', platform);
    const { data: rows } = await q;

    // 读取最新的授权状态以进行数据重置/过滤
    const currentAuths = (() => {
      const saved = localStorage.getItem(`platform_auths_${user.id}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
      return platformAuths;
    })();

    const mapData = (rawList: AdPerformance[]) => {
      return rawList.map(d => {
        const isAuthorized = currentAuths[d.platform] === 'authorized';
        if (!isAuthorized) {
          return {
            ...d,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            spend: 0,
            revenue: 0,
            play_count: 0,
            avg_watch_time: 0,
            ctr: 0,
            cvr: 0,
            roas: 0,
          };
        }
        return d;
      });
    };

    if (!rows || rows.length === 0) {
      setData(mapData(buildDemoData(days)));
    } else {
      setData(mapData(rows as AdPerformance[]));
    }
    setLoading(false);
  }, [user, range, platform, platformAuths]);

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
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />多平台分析
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">P3-S02 · 广告投放效果全链路追踪，优化 ROI</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (!user) {
                toast.error('请先登录系统以授权第三方账号');
                return;
              }
              setAuthModalOpen(true);
            }}
            className="h-9 px-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 font-semibold"
          >
            <Plus className="w-4 h-4" />添加账号
          </Button>
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
      <div className={cn(
        "rounded-xl border p-3 flex items-center gap-2 text-xs",
        (!user || !Object.values(platformAuths).some(v => v === 'authorized')) ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-info/30 bg-info/5 text-info"
      )}>
        <Zap className="w-3.5 h-3.5 shrink-0" />
        {!user 
          ? "未登录账号，当前数据已重置为0。请先登录以查看或管理各平台广告回流数据。"
          : !Object.values(platformAuths).some(v => v === 'authorized')
            ? "已登录系统，但暂未授权任何媒体账号（数据均显示为0）。请点击右上角“添加账号”授权并登录抖音、TikTok、小红书、快手、B站账号。"
            : "当前显示已授权平台的演示数据。实际使用时，通过平台 Webhook 或 API 将真实广告数据回传至系统。"
        }
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

      {/* 平台授权状态横条 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-muted/10 border border-border/50 rounded-2xl p-3">
        {[
          { key: 'douyin', label: '抖音' },
          { key: 'tiktok', label: 'TikTok' },
          { key: 'xiaohongshu', label: '小红书' },
          { key: 'kuaishou', label: '快手' },
          { key: 'bilibili', label: 'B站' },
        ].map(p => {
          const auth = user && platformAuths[p.key] === 'authorized';
          const badgeText = !user ? '未登录' : (auth ? '已授权' : '待授权');
          return (
            <div key={p.key} className="flex items-center justify-between px-3 py-2 rounded-xl bg-card border border-border/40">
              <span className="text-xs font-semibold text-muted-foreground">{p.label}</span>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                !user
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : auth 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              )}>
                {badgeText}
              </span>
            </div>
          );
        })}
      </div>

      {/* 授权账号弹窗 */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setAuthModalOpen(false)} />
          {/* Card */}
          <Card className="relative w-full max-w-md bg-card border border-border shadow-2xl z-10 overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">第三方平台账户授权</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">授权获取各平台的投放数据回流</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setAuthModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {[
                { key: 'douyin', label: '抖音', color: 'bg-black text-white hover:bg-black/90' },
                { key: 'tiktok', label: 'TikTok', color: 'bg-black text-white hover:bg-black/90' },
                { key: 'xiaohongshu', label: '小红书', color: 'bg-red-600 text-white hover:bg-red-700' },
                { key: 'kuaishou', label: '快手', color: 'bg-orange-500 text-white hover:bg-orange-600' },
                { key: 'bilibili', label: 'B站', color: 'bg-sky-400 text-white hover:bg-sky-500' },
              ].map(p => {
                const status = platformAuths[p.key];
                return (
                  <div key={p.key} className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-card border border-border/50 flex items-center justify-center font-bold text-xs">
                        {p.label[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{p.label}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            status === 'authorized' ? "bg-emerald-500" : "bg-amber-500"
                          )} />
                          <span className="text-[11px] text-muted-foreground">
                            {status === 'authorized' ? '已授权' : '待授权'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={status === 'authorized' ? 'outline' : 'default'}
                      className={cn("h-8 text-xs font-semibold px-4 rounded-lg", status === 'authorized' ? 'border-destructive/30 text-destructive hover:bg-destructive/5' : p.color)}
                      onClick={async () => {
                        if (status === 'pending') {
                          const id = toast.loading(`正在拉取 ${p.label} 授权页面...`);
                          setTimeout(() => {
                            updatePlatformAuth(p.key, 'authorized');
                            toast.success(`成功授权并登录 ${p.label} 账号！`, { id });
                          }, 1200);
                        } else {
                          updatePlatformAuth(p.key, 'pending');
                          toast.info(`已解除与 ${p.label} 的账号授权`);
                        }
                      }}
                    >
                      {status === 'authorized' ? '解除授权' : '授权'}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
