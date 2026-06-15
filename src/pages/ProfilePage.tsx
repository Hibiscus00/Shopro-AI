import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  User, Bell, Shield, Video, ImageIcon, LogOut,
  Camera, Key, Sparkles, Zap, FolderOpen, TrendingUp,
  ChevronRight, Edit3, Check, X, Star, Award,
  Clock, BarChart2, Film, Package, Globe, Settings,
  Loader2, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ─── 头像颜色方案 ─────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
];

function getGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xfffffff;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name?.trim()) return name.trim().slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return 'U';
}

// ─── 统计卡片 ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg, onClick }: {
  icon: React.ElementType; label: string; value: number | string;
  color: string; bg: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 p-4 rounded-2xl border border-border/60 bg-card',
        'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
        onClick && 'cursor-pointer',
      )}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bg)}>
        <Icon className={cn('w-4.5 h-4.5', color)} />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── 菜单行 ──────────────────────────────────────────────────────────────────
function MenuRow({ icon: Icon, label, desc, onClick, danger = false, badge }: {
  icon: React.ElementType; label: string; desc?: string;
  onClick: () => void; danger?: boolean; badge?: string;
}) {
  return (
    <button onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors text-left',
        danger
          ? 'hover:bg-destructive/10 text-destructive'
          : 'hover:bg-muted/50 text-foreground',
      )}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        danger ? 'bg-destructive/10' : 'bg-muted')}>
        <Icon className={cn('w-4 h-4', danger ? 'text-destructive' : 'text-muted-foreground')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', danger ? 'text-destructive' : '')}>{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{desc}</p>}
      </div>
      {badge && (
        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border shrink-0">{badge}</Badge>
      )}
      {!danger && <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />}
    </button>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? '');
  const [notification, setNotification] = useState(profile?.notification_enabled ?? true);
  const [stats, setStats] = useState({ videos: 0, materials: 0, products: 0, published: 0 });
  const [userPlan, setUserPlan] = useState<{
    credits_total: number; credits_used: number;
    plan: { name: string; credits: number } | null;
  } | null>(null);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [activity] = useState(() => {
    // 模拟最近30天活跃度热力图数据
    return Array.from({ length: 30 }, (_, i) => ({
      day: i,
      count: Math.floor(Math.random() * 6),
    }));
  });

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? '');
      setNotification(profile.notification_enabled ?? true);
    }
    loadAll();
  }, [profile]);

  const loadAll = async () => {
    if (!user) return;
    const [vRes, mRes, pRes, pubRes, planRes] = await Promise.all([
      supabase.from('video_projects').select('id', { count: 'exact', head: true }),
      supabase.from('materials').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('video_projects').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('user_plans').select('credits_total,credits_used,plan:plans(name,credits)').eq('user_id', user.id).maybeSingle(),
    ]);
    setStats({
      videos: vRes.count ?? 0,
      materials: mRes.count ?? 0,
      products: pRes.count ?? 0,
      published: pubRes.count ?? 0,
    });
    if (planRes.data) {
      const d = planRes.data as any;
      setUserPlan({ credits_total: d.credits_total, credits_used: d.credits_used, plan: d.plan ?? null });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!username.trim()) { toast.error('用户名不能为空'); return; }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      toast.error('用户名只能包含字母、数字、下划线或中文'); return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      username: username.trim(),
      notification_enabled: notification,
    }).eq('id', user.id);
    setSaving(false);
    if (error) { toast.error('保存失败：' + error.message); return; }
    await refreshProfile();
    toast.success('资料已更新');
    setEditOpen(false);
  };

  const handleChangePw = async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error('两次密码不一致'); return; }
    if (pwForm.next.length < 8) { toast.error('密码至少8位'); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    setPwSaving(false);
    if (error) { toast.error('修改失败：' + error.message); return; }
    toast.success('密码已修改，下次登录生效');
    setPwForm({ current: '', next: '', confirm: '' });
    setPwOpen(false);
  };

  const handleNotificationToggle = async (val: boolean) => {
    setNotification(val);
    if (!user) return;
    await supabase.from('profiles').update({ notification_enabled: val }).eq('id', user.id);
    await refreshProfile();
    toast.success(val ? '通知已开启' : '通知已关闭');
  };

  const copyUserId = () => {
    if (user?.id) { navigator.clipboard.writeText(user.id); toast.success('已复制 User ID'); }
  };

  const gradient = getGradient(user?.id ?? 'default');
  const initials = getInitials(profile?.username, user?.email);
  const creditsLeft = userPlan ? userPlan.credits_total - userPlan.credits_used : 0;
  const creditsUsedPct = userPlan
    ? Math.min(100, Math.round((userPlan.credits_used / Math.max(userPlan.credits_total, 1)) * 100))
    : 0;
  const memberDays = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
    : 0;

  // 活跃热力图颜色
  const heatColor = (count: number) => {
    if (count === 0) return 'bg-muted/50';
    if (count === 1) return 'bg-primary/20';
    if (count === 2) return 'bg-primary/40';
    if (count === 3) return 'bg-primary/60';
    return 'bg-primary';
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ── Hero 横幅 ── */}
      <div className="relative h-36 md:h-44 bg-gradient-to-br from-primary/80 via-primary to-primary/60 overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted/20 to-transparent" />
      </div>

      <div className="px-4 md:px-6 pb-10 -mt-16 max-w-3xl mx-auto space-y-5">
        {/* ── 个人信息卡 ── */}
        <div className="rounded-3xl bg-card border border-border/60 shadow-lg overflow-hidden">
          <div className="p-5 md:p-6">
            <div className="flex items-end gap-4">
              {/* 头像 */}
              <div className="relative shrink-0">
                <div className={cn(
                  'w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br flex items-center justify-center',
                  'ring-4 ring-card shadow-xl text-white font-bold text-2xl md:text-3xl select-none',
                  gradient,
                )}>
                  {initials}
                </div>
                <button
                  onClick={() => toast.info('头像上传功能开发中')}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 名称 & 邮箱 */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg md:text-xl font-bold truncate text-balance">
                    {profile?.username || user?.email?.split('@')[0] || '创作者'}
                  </h2>
                  {profile?.role === 'admin' && (
                    <Badge className="text-[10px] bg-warning/15 text-warning border-warning/30 border shrink-0">管理员</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />注册 {memberDays} 天
                  </span>
                  {userPlan?.plan && (
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary gap-1">
                      <Star className="w-2.5 h-2.5 fill-primary" />{userPlan.plan.name}
                    </Badge>
                  )}
                </div>
              </div>

              <Button size="sm" variant="outline" className="shrink-0 gap-1.5 h-9 hidden sm:flex"
                onClick={() => setEditOpen(true)}>
                <Edit3 className="w-3.5 h-3.5" />编辑资料
              </Button>
            </div>

            <Button size="sm" variant="outline" className="w-full gap-1.5 h-9 mt-4 sm:hidden"
              onClick={() => setEditOpen(true)}>
              <Edit3 className="w-3.5 h-3.5" />编辑资料
            </Button>
          </div>

          {/* 积分进度条 */}
          {userPlan && (
            <div className="px-5 md:px-6 pb-5 pt-1">
              <Separator className="mb-4" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-warning" />AI 积分
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    <span className={creditsLeft < 50 ? 'text-destructive' : 'text-success'}>{creditsLeft.toLocaleString()}</span>
                    <span className="text-muted-foreground font-normal"> / {userPlan.credits_total.toLocaleString()}</span>
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-primary" onClick={() => navigate('/credits')}>
                    充值 <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Progress value={creditsUsedPct} className="h-2.5 rounded-full" />
              <p className="text-xs text-muted-foreground mt-1.5">已使用 {creditsUsedPct}%</p>
            </div>
          )}
        </div>

        {/* ── 数据统计 ── */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-0.5">创作概览</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Video}     label="生成视频" value={stats.videos}    color="text-primary"    bg="bg-primary/10"    onClick={() => navigate('/works')} />
            <StatCard icon={Film}      label="完成作品" value={stats.published} color="text-success"    bg="bg-success/10"    onClick={() => navigate('/works')} />
            <StatCard icon={ImageIcon} label="素材文件" value={stats.materials} color="text-info"       bg="bg-info/10"       onClick={() => navigate('/works')} />
            <StatCard icon={Package}   label="商品管理" value={stats.products}  color="text-warning"   bg="bg-warning/10"    onClick={() => navigate('/products')} />
          </div>
        </div>

        {/* ── 活跃热力图 ── */}
        <Card className="rounded-3xl border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />近 30 天创作活跃
              </p>
              <span className="text-xs text-muted-foreground">
                共 {activity.filter(d => d.count > 0).length} 天有创作
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {activity.map(d => (
                <div key={d.day}
                  title={`第 ${d.day + 1} 天：${d.count} 次操作`}
                  className={cn('w-6 h-6 rounded-md transition-colors', heatColor(d.count))} />
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
              <span>少</span>
              {[0, 1, 2, 3, 4].map(c => (
                <div key={c} className={cn('w-3.5 h-3.5 rounded-sm', heatColor(c))} />
              ))}
              <span>多</span>
            </div>
          </CardContent>
        </Card>

        {/* ── 快捷导航 ── */}
        <Card className="rounded-3xl border-border/60">
          <CardContent className="p-2">
            <p className="text-xs font-semibold text-muted-foreground px-4 pt-3 pb-1">快速入口</p>
            <MenuRow icon={FolderOpen}  label="作品管理"    desc="查看我的视频作品和素材"        onClick={() => navigate('/works')} />
            <MenuRow icon={Zap}         label="积分与套餐"  desc={userPlan ? `剩余 ${creditsLeft} 积分` : '查看用量和充值'} onClick={() => navigate('/credits')} badge={creditsLeft < 50 ? '不足' : undefined} />
            <MenuRow icon={Globe}       label="跨平台导出"  desc="多格式导出和一键分发"           onClick={() => navigate('/export-formats')} />
            <MenuRow icon={TrendingUp}  label="投放数据回流" desc="查看广告投放效果"              onClick={() => navigate('/data-feedback')} />
            <MenuRow icon={Sparkles}    label="AI工具箱"    desc="风格复刻、知识库等高级工具"     onClick={() => navigate('/ai-toolbox')} />
          </CardContent>
        </Card>

        {/* ── 账号设置 ── */}
        <Card className="rounded-3xl border-border/60">
          <CardContent className="p-2">
            <p className="text-xs font-semibold text-muted-foreground px-4 pt-3 pb-1">账号设置</p>

            {/* 通知开关 */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">消息通知</p>
                <p className="text-xs text-muted-foreground mt-0.5">视频生成完成时接收通知</p>
              </div>
              <Switch checked={notification} onCheckedChange={handleNotificationToggle} />
            </div>

            <MenuRow icon={Key}     label="修改密码"  desc="定期更换密码保护账号安全"  onClick={() => setPwOpen(true)} />
            <MenuRow icon={Shield}  label="账号安全"  desc="登录记录与安全设置"         onClick={() => toast.info('安全设置功能开发中')} />

            {/* User ID */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">User ID</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{user?.id?.slice(0, 20)}…</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={copyUserId}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 危险区 ── */}
        <Card className="rounded-3xl border-destructive/20">
          <CardContent className="p-2">
            <MenuRow icon={LogOut} label="退出登录" desc="退出当前账号" danger onClick={async () => { await signOut(); navigate('/login'); }} />
          </CardContent>
        </Card>

        {/* ── 版本信息 ── */}
        <div className="text-center pb-2">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground/60">
            <Award className="w-3.5 h-3.5" />
            <span>AIGC带货视频生成系统 v1.0</span>
            <span>·</span>
            <span>© 2025</span>
          </div>
        </div>
      </div>

      {/* ── 编辑资料弹窗 ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance">
              <Edit3 className="w-4 h-4 text-primary" />编辑个人资料
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            {/* 头像预览 */}
            <div className="flex flex-col items-center gap-3">
              <div className={cn('w-20 h-20 rounded-3xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-2xl select-none', gradient)}>
                {getInitials(username, user?.email)}
              </div>
              <p className="text-xs text-muted-foreground">头像根据用户名自动生成</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal">用户名</label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="输入用户名"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">支持中文、字母、数字、下划线</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal">邮箱</label>
              <Input value={user?.email ?? ''} disabled className="opacity-60" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>取消</Button>
              <Button className="flex-1 gap-1.5" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? '保存中…' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 修改密码弹窗 ── */}
      <Dialog open={pwOpen} onOpenChange={v => { setPwOpen(v); if (!v) setPwForm({ current: '', next: '', confirm: '' }); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance">
              <Key className="w-4 h-4 text-primary" />修改密码
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-normal">新密码</label>
              <Input type="password" placeholder="至少 8 位" value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal">确认新密码</label>
              <Input type="password" placeholder="再次输入新密码" value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
              {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                <p className="text-xs text-destructive flex items-center gap-1"><X className="w-3 h-3" />两次密码不一致</p>
              )}
              {pwForm.confirm && pwForm.next === pwForm.confirm && pwForm.next.length >= 8 && (
                <p className="text-xs text-success flex items-center gap-1"><Check className="w-3 h-3" />密码匹配</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setPwOpen(false)}>取消</Button>
              <Button className="flex-1 gap-1.5" onClick={handleChangePw} disabled={pwSaving}>
                {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {pwSaving ? '修改中…' : '确认修改'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
