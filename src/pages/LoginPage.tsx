import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Eye, EyeOff, Video, Sparkles, TrendingUp, Zap,
  Mail, Lock, User, ArrowLeft, CheckCircle2, KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 三种模式：login / register / forgot
type Mode = 'login' | 'register' | 'forgot';

const BRAND_FEATURES = [
  { icon: Zap,        title: 'AI一键生成',   desc: '秒出带货视频脚本，效率提升10倍' },
  { icon: Video,      title: '可视化编辑',   desc: '分镜时间轴，拖拽式流畅操作' },
  { icon: TrendingUp, title: '流量预测',     desc: '智能分析爆款潜力，精准投放' },
  { icon: Sparkles,   title: '竞品监控',     desc: '实时追踪竞争对手，快速跟进' },
];

function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary/40 flex-col justify-between p-12">
      {/* 网格背景 */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* 光晕 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-white/20 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-8 w-64 h-64 rounded-full bg-white/10 blur-[60px] pointer-events-none" />

      {/* Logo */}
      <div className="relative flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
          <Video className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-bold text-white text-lg leading-none">AIGC 带货</p>
          <p className="text-white/80 text-xs">电商视频生成平台</p>
        </div>
      </div>

      {/* 中心标语 */}
      <div className="relative space-y-4">
        <h1 className="text-4xl font-bold text-white leading-tight text-balance">
          AI 驱动<br />
          <span className="text-white font-black underline decoration-white/30 underline-offset-4">带货视频</span><br />
          智能生成
        </h1>
        <p className="text-white/80 text-base leading-relaxed max-w-sm text-pretty">
          低成本批量生产高转化潜力的抖音/TikTok带货视频，让 AI 替你完成创作
        </p>
      </div>

      {/* 功能特性 */}
      <div className="relative grid grid-cols-2 gap-3">
        {BRAND_FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl bg-white/10 border border-white/20 p-4 space-y-1.5 hover:bg-white/15 transition-colors backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white text-sm font-semibold">{title}</span>
            </div>
            <p className="text-white/70 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const inviteCodeParam = searchParams.get('invite');
  const initialMode = searchParams.get('mode') as Mode || 'login';
  const [mode, setMode] = useState<Mode>(initialMode);
  
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 已登录用户直接跳转工作台
  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true });
  }, [user, authLoading, navigate]);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (mode === 'forgot') {
      if (!form.email.trim()) errs.email = '请输入邮箱地址';
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = '邮箱格式不正确';
    } else {
      if (!form.username.trim()) errs.username = '请输入用户名';
      else if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) errs.username = '用户名 3-20 位字母/数字/下划线';
      if (!form.password) errs.password = '请输入密码';
      else if (form.password.length < 6) errs.password = '密码至少 6 位';
      if (mode === 'register') {
        if (!form.confirmPassword) errs.confirmPassword = '请再次输入密码';
        else if (form.password !== form.confirmPassword) errs.confirmPassword = '两次密码不一致';
        if (!agreed) errs.agreed = '请同意用户协议和隐私政策';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === 'forgot') {
        // F-02: 发送密码重置邮件
        const resetEmail = form.email.includes('@') ? form.email : `${form.email}@example.com`;
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${window.location.origin}/login?mode=reset`,
        });
        if (error) throw error;
        setForgotSent(true);
        toast.success('重置链接已发送，请检查您的邮箱');
      } else {
        const email = `${form.username}@example.com`;
        if (mode === 'login') {
          const { error } = await supabase.auth.signInWithPassword({ email, password: form.password });
          if (error) throw error;
          toast.success('登录成功，欢迎回来！');
          navigate('/');
        } else {
          // F-01: 完整注册
          const { data, error } = await supabase.auth.signUp({ 
            email, 
            password: form.password,
            options: {
              data: {
                invited_by_code: inviteCodeParam || null
              }
            }
          });
          if (error) throw error;
          
          // 注册成功后，手动创建 profile 和免费套餐（因为 trigger 已移除）
          if (data?.user) {
            try {
              const username = email.split('@')[0];
              // 创建 profile（忽略冲突）
              await supabase.from('profiles').upsert({
                id: data.user.id,
                email: data.user.email,
                username,
                role: 'user',
              }, { onConflict: 'id' });
              
              // 获取免费套餐并绑定
              const { data: freePlan } = await supabase.from('plans').select('id').eq('name', '免费版').maybeSingle();
              if (freePlan) {
                await supabase.from('user_plans').upsert({
                  user_id: data.user.id,
                  plan_id: freePlan.id,
                  credits_total: 100,
                  credits_used: 0,
                }, { onConflict: 'user_id' });
              }
            } catch (setupErr) {
              console.error('注册后初始化数据失败:', setupErr);
            }
          }
          
          toast.success('注册成功，欢迎加入！');
          navigate('/');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      if (msg.includes('Invalid login credentials')) setErrors({ password: '用户名或密码错误' });
      else if (msg.includes('User already registered')) setErrors({ username: '该用户名已被注册' });
      else if (msg.includes('Email not confirmed')) setErrors({ password: '账号未验证，请检查邮箱' });
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const titleMap: Record<Mode, string> = {
    login: '欢迎回来',
    register: '创建账号',
    forgot: '找回密码',
  };
  const subtitleMap: Record<Mode, string> = {
    login: '使用您的账号登录 AIGC 带货平台',
    register: '填写信息，开启 AI 视频创作之旅',
    forgot: '输入邮箱或用户名，我们将发送重置链接',
  };

  return (
    <div className="min-h-screen flex bg-background">
      <BrandPanel />
      {/* 右侧表单区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 bg-background relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-info/10 rounded-full blur-[100px] pointer-events-none" />

        {/* 移动端 Logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <Video className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-lg">AIGC 带货</span>
        </div>

        <div className="w-full max-w-sm relative">
          {/* 返回按钮（找回密码模式） */}
          {mode === 'forgot' && (
            <button
              onClick={() => { setMode('login'); setForgotSent(false); setErrors({}); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />返回登录
            </button>
          )}

          {/* 标题 */}
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">{titleMap[mode]}</h2>
            <p className="text-sm text-muted-foreground mt-2 text-pretty">{subtitleMap[mode]}</p>
          </div>

          {/* 找回密码成功状态 */}
          {forgotSent ? (
            <div className="rounded-2xl border border-success/20 bg-success/5 p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <p className="font-semibold text-foreground">重置链接已发送</p>
              <p className="text-sm text-muted-foreground text-pretty">
                请检查您的邮箱，点击链接重置密码。如未收到，请检查垃圾邮件文件夹。
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => { setMode('login'); setForgotSent(false); }}>
                返回登录
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 忘记密码：邮箱输入 */}
              {mode === 'forgot' && (
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-normal">邮箱地址</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      className={cn('pl-9', errors.email && 'border-destructive focus-visible:ring-destructive')}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive flex items-center gap-1">{errors.email}</p>}
                </div>
              )}

              {/* 登录/注册：用户名 */}
              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-sm font-normal">用户名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="username"
                      placeholder="字母/数字/下划线，3-20位"
                      value={form.username}
                      onChange={e => set('username', e.target.value)}
                      className={cn('pl-9', errors.username && 'border-destructive focus-visible:ring-destructive')}
                    />
                  </div>
                  {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
                </div>
              )}

              {/* 密码 */}
              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-normal">密码</Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setErrors({}); }}
                        className="text-xs text-primary hover:underline"
                      >
                        忘记密码？
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={mode === 'register' ? '至少 6 位密码' : '请输入密码'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      className={cn('pl-9 pr-10', errors.password && 'border-destructive focus-visible:ring-destructive')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
              )}

              {/* 确认密码（注册） */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-normal">确认密码</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="再次输入密码"
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      className={cn('pl-9', errors.confirmPassword && 'border-destructive focus-visible:ring-destructive')}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>
              )}

              {/* 用户协议（注册） */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="agreed"
                      checked={agreed}
                      onCheckedChange={v => { setAgreed(!!v); setErrors(e => ({ ...e, agreed: '' })); }}
                      className="mt-0.5"
                    />
                    <label htmlFor="agreed" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                      我已阅读并同意
                      <span className="text-primary hover:underline cursor-pointer mx-0.5">《用户协议》</span>
                      和
                      <span className="text-primary hover:underline cursor-pointer mx-0.5">《隐私政策》</span>
                    </label>
                  </div>
                  {errors.agreed && <p className="text-xs text-destructive pl-6">{errors.agreed}</p>}
                </div>
              )}

              {/* 提交按钮 */}
              <Button type="submit" className="w-full h-11 font-semibold rounded-lg shadow-md transition-transform hover:-translate-y-0.5" disabled={loading}>
                {loading
                  ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />处理中...</span>
                  : mode === 'login' ? '登 录' : mode === 'register' ? '立 即 注 册' : '发送重置链接'
                }
              </Button>

              {/* 分隔线 */}
              {mode !== 'forgot' && (
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">或</span></div>
                </div>
              )}

              {/* 切换模式 */}
              {mode === 'login' && (
                <p className="text-sm text-center text-muted-foreground">
                  还没有账号？
                  <button type="button" onClick={() => { setMode('register'); setErrors({}); setForm(f => ({ ...f, confirmPassword: '' })); }}
                    className="text-primary font-medium hover:underline ml-1">
                    立即注册
                  </button>
                </p>
              )}
              {mode === 'register' && (
                <p className="text-sm text-center text-muted-foreground">
                  已有账号？
                  <button type="button" onClick={() => { setMode('login'); setErrors({}); }}
                    className="text-primary font-medium hover:underline ml-1">
                    直接登录
                  </button>
                </p>
              )}
            </form>
          )}

          {/* Demo 账号提示 */}
          {mode === 'login' && !forgotSent && (
            <div className="mt-8 rounded-xl bg-card border border-border/80 p-5 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" />快速体验通道</p>
              <div className="grid grid-cols-2 gap-3">
                {[{ user: 'demo_user', pwd: 'demo123456' }, { user: 'test_user', pwd: 'test123456' }].map(({ user, pwd }) => (
                  <button
                    key={user}
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      setErrors({});
                      const email = `${user}@example.com`;
                      try {
                        // 先尝试登录
                        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password: pwd });
                        if (!loginErr) {
                          toast.success(`Demo 账号登录成功：${user}`);
                          navigate('/');
                          return;
                        }
                        // 登录失败则自动注册
                        if (loginErr.message.includes('Invalid login')) {
                          const { error: signUpErr, data: signUpData } = await supabase.auth.signUp({ email, password: pwd });
                          if (signUpErr) throw signUpErr;
                          
                          // 注册成功后手动创建 profile 和免费套餐
                          if (signUpData?.user) {
                            try {
                              await supabase.from('profiles').upsert({
                                id: signUpData.user.id,
                                email: signUpData.user.email,
                                username: user,
                                role: 'user',
                              }, { onConflict: 'id' });
                              const { data: freePlan } = await supabase.from('plans').select('id').eq('name', '免费版').maybeSingle();
                              if (freePlan) {
                                await supabase.from('user_plans').upsert({
                                  user_id: signUpData.user.id,
                                  plan_id: freePlan.id,
                                  credits_total: 100,
                                  credits_used: 0,
                                }, { onConflict: 'user_id' });
                              }
                            } catch (setupErr) {
                              console.error('Demo 注册后初始化失败:', setupErr);
                            }
                          }
                          
                          // 注册后再次登录
                          const { error: reLoginErr } = await supabase.auth.signInWithPassword({ email, password: pwd });
                          if (reLoginErr) {
                            // 如果登录失败可能是因为邮箱未确认，尝试再次注册（已存在用户）
                            if (reLoginErr.message.includes('Email not confirmed')) {
                              toast.info('账号已创建，请稍等后重试');
                              return;
                            }
                            throw reLoginErr;
                          }
                          toast.success(`Demo 账号已创建并登录：${user}`);
                          navigate('/');
                        } else if (loginErr.message.includes('Email not confirmed')) {
                          toast.error('该账号邮箱尚未确认，请联系管理员');
                        } else {
                          throw loginErr;
                        }
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : '操作失败';
                        // 友好化错误提示
                        let displayMsg = msg;
                        if (msg.includes('profiles') && msg.includes('does not exist')) {
                          displayMsg = '系统数据表未初始化，请联系管理员';
                        } else if (msg.includes('relation') && msg.includes('does not exist')) {
                          displayMsg = '系统数据表缺失，请联系管理员';
                        } else if (msg.includes('User already registered')) {
                          displayMsg = '该账号已存在，请直接登录';
                        } else if (msg.includes('Email not confirmed')) {
                          displayMsg = '账号邮箱尚未确认，无法登录';
                        } else if (msg.length > 80) {
                          displayMsg = '登录/注册失败，请稍后重试或联系管理员';
                        }
                        toast.error(displayMsg);
                        console.error('Demo login error:', msg);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-primary/5 hover:border-primary/30 transition-colors text-center text-xs group"
                  >
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{user}</span>
                    <span className="text-muted-foreground scale-90 opacity-70 mt-0.5">一键登录体验</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

