import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Users2, Plus, Crown, Shield, Pen, Eye, Trash2,
  Mail, RefreshCw, Settings, Copy, CheckCircle2,
  UserPlus, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── 类型 ────────────────────────────────────────────────────────────────────
type Role = 'owner' | 'admin' | 'editor' | 'viewer';

interface Team {
  id: string;
  name: string;
  owner_id: string;
  plan: string;
  max_members: number;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: Role;
  status: string;
  joined_at: string;
}

const ROLE_CONFIG: Record<Role, { label: string; icon: React.ElementType; color: string }> = {
  owner:  { label: '所有者', icon: Crown,  color: 'text-warning' },
  admin:  { label: '管理员', icon: Shield, color: 'text-primary' },
  editor: { label: '编辑者', icon: Pen,    color: 'text-info' },
  viewer: { label: '观察者', icon: Eye,    color: 'text-muted-foreground' },
};

const ROLE_PERMS: Record<Role, string[]> = {
  owner:  ['创建/删除团队', '管理所有成员', '编辑所有内容', '查看所有数据'],
  admin:  ['邀请/移除成员', '编辑所有内容', '查看所有数据'],
  editor: ['创建/编辑视频', '上传素材', '查看团队数据'],
  viewer: ['查看视频与分析数据（只读）'],
};

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', cfg.color)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function TeamSpacePage() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // 查用户拥有或加入的团队
    const { data: owned } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (owned) {
      setTeam(owned as Team);
      const { data: mems } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', owned.id)
        .eq('status', 'active')
        .order('joined_at');
      setMembers((mems ?? []) as TeamMember[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !user) return;
    setCreating(true);
    try {
      const { data: newTeam, error } = await supabase
        .from('teams')
        .insert({ name: teamName.trim(), owner_id: user.id })
        .select('*')
        .maybeSingle();
      if (error) throw error;
      // 创建者自动加入
      await supabase.from('team_members').insert({
        team_id: newTeam!.id, user_id: user.id, role: 'owner', status: 'active',
      });
      toast.success('团队创建成功！');
      setCreateOpen(false);
      setTeamName('');
      await loadTeam();
    } catch (e) {
      toast.error(`创建失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !team) return;
    setInviting(true);
    try {
      const { data: inv, error } = await supabase
        .from('team_invitations')
        .insert({ team_id: team.id, email: inviteEmail, role: inviteRole, invited_by: user!.id })
        .select('token')
        .maybeSingle();
      if (error) throw error;
      const link = `${window.location.origin}/team/join?token=${inv!.token}`;
      setInviteLink(link);
      toast.success('邀请链接已生成');
    } catch (e) {
      toast.error(`邀请失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('邀请链接已复制');
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from('team_members').update({ status: 'removed' }).eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success('成员已移除');
  };

  const handleChangeRole = async (memberId: string, role: Role) => {
    await supabase.from('team_members').update({ role }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    toast.success('角色已更新');
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users2 className="w-5 h-5 text-primary" />团队协作空间
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">P3-M03 · 多人协同创作，权限分级管理</p>
        </div>
        {!team && (
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />创建团队
          </Button>
        )}
      </div>

      {!team ? (
        /* 未创建团队 */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users2 className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-muted-foreground">还没有团队</p>
          <p className="text-sm text-muted-foreground mt-1">创建团队，邀请同事共同创作带货视频</p>
          <Button className="mt-5 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />立即创建团队
          </Button>
        </div>
      ) : (
        <>
          {/* 团队信息卡 */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{team.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">{team.plan === 'free' ? '免费版' : '专业版'}</Badge>
                      <span className="text-xs text-muted-foreground">{members.length}/{team.max_members} 成员</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="w-4 h-4" />邀请成员
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 成员列表 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users2 className="w-4 h-4 text-primary" />团队成员 ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {member.user_id.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">用户 {member.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      加入于 {new Date(member.joined_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {member.role === 'owner' ? (
                      <RoleBadge role="owner" />
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleChangeRole(member.id, v as Role)}
                      >
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['admin','editor','viewer'] as Role[]).map(r => (
                            <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {member.role !== 'owner' && (
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">还没有成员，点击「邀请成员」开始协作</p>
              )}
            </CardContent>
          </Card>

          {/* 角色权限说明 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />角色权限说明
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
              {(Object.entries(ROLE_PERMS) as [Role, string[]][]).map(([role, perms]) => {
                const cfg = ROLE_CONFIG[role];
                const Icon = cfg.icon;
                return (
                  <div key={role} className="rounded-xl border border-border/60 p-3 space-y-2">
                    <p className={cn('text-sm font-medium flex items-center gap-1.5', cfg.color)}>
                      <Icon className="w-4 h-4" />{cfg.label}
                    </p>
                    <ul className="space-y-1">
                      {perms.map(p => (
                        <li key={p} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-success shrink-0" />{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      {/* 创建团队弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader><DialogTitle>创建团队</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-normal">团队名称</label>
              <Input placeholder="例：视频创作团队" value={teamName} onChange={e => setTeamName(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleCreateTeam} disabled={creating || !teamName.trim()}>
              {creating ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
              {creating ? '创建中…' : '立即创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 邀请成员弹窗 */}
      <Dialog open={inviteOpen} onOpenChange={v => { if (!v) { setInviteOpen(false); setInviteLink(''); setInviteEmail(''); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>邀请团队成员</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-normal">邀请邮箱</label>
              <Input type="email" placeholder="colleague@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal">角色</label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['admin','editor','viewer'] as Role[]).map(r => (
                    <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label} — {ROLE_PERMS[r][0]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-1.5" onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {inviting ? '生成中…' : '生成邀请链接'}
            </Button>

            {inviteLink && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">邀请链接（7天有效）</p>
                <div className="flex items-center gap-2">
                  <Input value={inviteLink} readOnly className="text-xs" />
                  <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={handleCopyLink}>
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '已复制' : '复制'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
