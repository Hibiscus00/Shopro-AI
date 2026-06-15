import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard, Video, FolderOpen, ImageIcon,
  Menu, ChevronRight, Sparkles,
  Package, Users2, CreditCard, Wand2,
  Search, X, ArrowRight, Scissors, Moon, Sun,
  Layers, Share2, Code2, Gift, LayoutGrid, Bell,} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

// ── FE-UX 主题持久化 hook ─────────────────────────────────────────────────
export type ThemeType = 'light' | 'dark';

function useThemePersist() {
  const [theme, setTheme] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('theme') as ThemeType;
    if (saved && ['light', 'dark'].includes(saved)) return saved as ThemeType;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-ecommerce');
    if (theme === 'dark') root.classList.add('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme };
}

const navGroups = [
  {
    label: '主要功能',
    items: [
      { path: '/',              label: '工作台',     icon: LayoutDashboard },
      { path: '/products',      label: '商品管理',   icon: Package },
      { path: '/script',        label: 'AI脚本生成', icon: Wand2 },
      { path: '/avatars',       label: '数字人库',   icon: Users2 },
      { path: '/video/create',  label: '生成视频',   icon: Video },
      { path: '/video/edit',    label: '视频剪辑',   icon: Scissors },
      { path: '/ai-toolbox',    label: 'AI工具箱',   icon: LayoutGrid },
      { path: '/works',         label: '作品管理',   icon: FolderOpen },
      { path: '/export-formats', label: '跨平台导出', icon: Layers },
      { path: '/data-feedback',  label: '投放数据回流', icon: Share2 },
    ],
  },
  {
    label: '生态扩展',
    items: [
      { path: '/team',      label: '团队协作空间', icon: Users2 },
      { path: '/open-api',  label: '开放 API',     icon: Code2 },
    ],
  },
];

// F-09: 全局搜索结果类型
type SearchResult = {
  id: string;
  type: 'product' | 'video' | 'material';
  label: string;
  sub?: string;
  path: string;
};

// F-09: 全局搜索组件
function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K 快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    if (!open) { setQuery(''); setResults([]); }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const [pRes, vRes, mRes] = await Promise.all([
        supabase.from('products').select('id,name,category').ilike('name', `%${q}%`).limit(4),
        supabase.from('video_projects').select('id,title,status').ilike('title', `%${q}%`).limit(4),
        supabase.from('materials').select('id,name,type').ilike('name', `%${q}%`).limit(3),
      ]);
      const mapped: SearchResult[] = [
        ...(pRes.data ?? []).map(p => ({ id: p.id, type: 'product' as const, label: p.name, sub: p.category, path: '/products' })),
        ...(vRes.data ?? []).map(v => ({ id: v.id, type: 'video' as const, label: v.title || '未命名视频', sub: v.status, path: '/works' })),
        ...(mRes.data ?? []).map(m => ({ id: m.id, type: 'material' as const, label: m.name, sub: m.type, path: '/works' })),
      ];
      setResults(mapped);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const typeConfig = {
    product:  { label: '商品', icon: Package,   color: 'text-orange-500 bg-orange-500/10' },
    video:    { label: '视频', icon: Video,     color: 'text-primary bg-primary/10' },
    material: { label: '素材', icon: ImageIcon, color: 'text-info bg-info/10' },
  };

  return (
    <>
      {/* 搜索触发按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/70 transition-colors text-sm text-muted-foreground min-w-0"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="hidden md:inline truncate">搜索商品、视频、素材...</span>
        <kbd className="hidden md:flex items-center gap-0.5 text-[10px] font-mono bg-background border border-border/60 rounded px-1 py-0.5 ml-auto shrink-0">
          ⌘K
        </kbd>
      </button>

      {/* 全屏搜索弹窗 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" onClick={() => setOpen(false)}>
          {/* 遮罩 */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          {/* 搜索面板 */}
          <div
            className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 搜索输入框 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="搜索商品、视频、素材..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
              />
              {searching && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 搜索结果 */}
            <div className="max-h-72 overflow-y-auto">
              {query.trim() === '' ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  输入关键词搜索商品、视频或素材
                </div>
              ) : results.length === 0 && !searching ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  未找到「{query}」相关内容
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {results.map(r => {
                    const { icon: Icon, color, label } = typeConfig[r.type];
                    return (
                      <button
                        key={r.id}
                        onClick={() => { navigate(r.path); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                          <p className="text-xs text-muted-foreground">{label}{r.sub ? ` · ${r.sub}` : ''}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 底部提示 */}
            <div className="px-4 py-2.5 border-t border-border/50 flex items-center gap-3 text-[11px] text-muted-foreground bg-muted/20">
              <span className="flex items-center gap-1"><kbd className="font-mono bg-background border border-border rounded px-1">↑↓</kbd>导航</span>
              <span className="flex items-center gap-1"><kbd className="font-mono bg-background border border-border rounded px-1">↵</kbd>前往</span>
              <span className="flex items-center gap-1"><kbd className="font-mono bg-background border border-border rounded px-1">Esc</kbd>关闭</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavItem({ path, label, icon: Icon, active, onClick }: {
  path: string; label: string; icon: typeof LayoutDashboard; active: boolean; onClick?: () => void;
}) {
  return (
    <Link to={path} onClick={onClick}>
      <div className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}>
        <Icon className={cn('w-5 h-5 shrink-0', active && 'text-sidebar-primary-foreground')} />
        <span className="text-sm font-medium truncate">{label}</span>
        {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
      </div>
    </Link>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('已退出登录');
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const username = profile?.username ?? '用户';
  const initial = username[0]?.toUpperCase() ?? 'U';

  return (
    <div className="flex flex-col h-full bg-sidebar sidebar-gradient">
      {/* Logo — 点击跳转官网 */}
      <Link to="/landing" onClick={onNavClick} className="block">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border transition-colors hover:bg-sidebar-accent/50">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-sidebar-foreground truncate">AIGC带货视频</p>
            <p className="text-xs text-sidebar-foreground/50">AI驱动 · 高效带货</p>
          </div>
        </div>
      </Link>

      {/* 导航 */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto min-h-0">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-medium text-sidebar-foreground/40 uppercase tracking-wider px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.path} {...item} active={isActive(item.path)} onClick={onNavClick} />
              ))}
            </div>
          </div>
        ))}

        {/* 用户区已移至右上角 TopBarUserMenu，侧边栏不再显示 */}
      </nav>
    </div>
  );
}

// ── 顶栏快捷图标按钮 ─────────────────────────────────────────────────────
function TopBarQuickLink({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Button
      variant="ghost"
      size="sm"
      title={label}
      onClick={() => navigate(to)}
      className={cn(
        'h-8 w-8 p-0 flex items-center justify-center rounded-lg transition-colors',
        isActive
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
}

// ── 通知 Bell（顶栏）─────────────────────────────────────────────────────
const NOTIF_PREVIEWS = [
  { id: '1', title: '视频生成完成', body: '「烟酰胺精华28天变白挑战」已生成完毕', time: '2分钟前', unread: true },
  { id: '2', title: '限时积分奖励', body: '5月大促期间生成视频可获双倍积分', time: '1小时前', unread: true },
  { id: '3', title: '系统更新 v42', body: 'AI工具箱升级、数字人库融合视频模板', time: '5小时前', unread: false },
];

function TopBarNotificationBell() {
  const navigate = useNavigate();
  const unread = NOTIF_PREVIEWS.filter(n => n.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0 text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-2 border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">消息通知</span>
            {unread > 0 && (
              <Badge className="h-4 px-1.5 text-[10px] bg-destructive text-destructive-foreground">{unread}</Badge>
            )}
          </div>
          <button
            onClick={() => navigate('/notifications')}
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            查看全部<ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-border/30">
          {NOTIF_PREVIEWS.map(n => (
            <div key={n.id} className={cn('px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors', n.unread && 'bg-primary/3')}>
              <div className="flex items-start gap-2">
                {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
                <div className={cn('flex-1 min-w-0', !n.unread && 'pl-3.5')}>
                  <p className={cn('text-sm leading-snug truncate', n.unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{n.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground hover:text-primary gap-1.5 justify-center"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="w-3.5 h-3.5" />前往消息中心
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── 顶栏用户菜单 ──────────────────────────────────────────────────────────
function TopBarUserMenu() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const username = profile?.username ?? '用户';
  const initial = username[0]?.toUpperCase() ?? 'U';

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 gap-2 shrink-0 hover:bg-muted"
      onClick={() => navigate('/profile')}
      title="个人中心"
    >
      <Avatar className="w-6 h-6 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium hidden md:block max-w-[80px] truncate">{username}</span>
    </Button>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useThemePersist();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* 桌面端侧边栏 */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border">
        <SidebarContent />
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
        {/* 顶部栏：移动端汉堡 + 全局搜索（桌面端也显示） */}
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border bg-card shrink-0">
          {/* 移动端菜单 */}
          <div className="lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
                <SidebarContent onNavClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          {/* 移动端 Logo */}
          <Link to="/landing" className="lg:hidden flex items-center gap-2 min-w-0 shrink-0">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm truncate">AIGC带货视频</span>
          </Link>

          {/* F-09: 全局搜索 — 桌面端占满剩余空间，移动端缩小 */}
          <div className="flex-1 min-w-0 flex items-center">
            <GlobalSearch />
          </div>

          {/* 右上角工具栏：通知 + 主题切换 + 邀请/积分 + 头像 */}
          <div className="flex items-center gap-1 shrink-0">
            {/* 消息通知 */}
            <TopBarNotificationBell />

            {/* 主题切换 */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* 邀请有礼 + 积分套餐 */}
            <div className="hidden md:flex items-center gap-0.5">
              <TopBarQuickLink to="/invite"   icon={Gift}       label="邀请有礼" />
              <TopBarQuickLink to="/credits"  icon={CreditCard} label="积分套餐" />
            </div>

            {/* 头像 */}
            <TopBarUserMenu />
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
