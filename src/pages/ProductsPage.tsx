import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Product, ProductSpec } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Package, Plus, Search, LayoutGrid, List, Edit2, Trash2, X,
  Upload, ChevronDown, ImageIcon, Filter, Loader2, Check,
  Download, FileSpreadsheet, AlertCircle, Star, ChevronRight,
  Info, Image, GripVertical, PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── 常量 ──────────────────────────────────────────────────────────────────
const CATEGORIES = ['服装配饰', '美妆护肤', '家居用品', '数码电器', '食品饮料', '母婴用品', '运动户外', '其他'];
const STATUS_MAP = {
  active:   { label: '已上架', cls: 'bg-success/15 text-success border-success/30' },
  inactive: { label: '已下架', cls: 'bg-muted text-muted-foreground border-border' },
  draft:    { label: '草稿',   cls: 'bg-warning/15 text-warning border-warning/30' },
};

type ProductStatus = 'active' | 'inactive' | 'draft';

// 表单步骤定义
const FORM_STEPS = [
  { id: 1, label: '基本信息', desc: '商品名称、分类' },
  { id: 2, label: '销售信息', desc: '卖点、价格、库存' },
  { id: 3, label: '图片规格', desc: '图片、规格参数' },
  { id: 4, label: '发布设置', desc: '状态配置' },
];

// ── 初始表单 ──────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', category: '服装配饰', sub_category: '',
  description: '', selling_points: ['', '', ''],
  original_price: '', sale_price: '', stock: '0',
  specs: [] as ProductSpec[],
  images: [] as string[], cover_image: '',
  status: 'active' as ProductStatus,
};

type FormState = typeof EMPTY_FORM;

// ── 步骤指示器 ────────────────────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {FORM_STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <div className={cn(
              'flex items-center gap-1.5 shrink-0',
            )}>
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors',
                isCompleted ? 'bg-success text-white' :
                isActive    ? 'bg-primary text-primary-foreground' :
                              'bg-muted text-muted-foreground',
              )}>
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : <span>{step.id}</span>}
              </div>
              <div className="hidden md:block min-w-0">
                <p className={cn('text-xs font-medium truncate', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {step.label}
                </p>
              </div>
            </div>
            {idx < totalSteps - 1 && (
              <div className={cn('flex-1 h-0.5 mx-2 rounded', currentStep > step.id ? 'bg-success/60' : 'bg-border/60')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 商品卡片 ─────────────────────────────────────────────────────────────
function ProductCard({ product, selected, onSelect, onEdit, onDelete, onToggle }: {
  product: Product; selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onToggle: (p: Product) => void;
}) {
  const st = STATUS_MAP[product.status];
  return (
    <Card className={cn('h-full flex flex-col transition-all duration-200 cursor-pointer hover:shadow-md group', selected && 'ring-2 ring-primary')}>
      <div className="relative" onClick={() => onSelect(product.id)}>
        <div className="aspect-square overflow-hidden rounded-t-xl bg-muted">
          {product.cover_image
            ? <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground/30" /></div>
          }
        </div>
        {/* 多选勾选框：hover 时显示，已选中时常驻 */}
        <div className={cn('absolute top-2 left-2 transition-opacity', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
          <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center bg-background shadow-sm',
            selected ? 'bg-primary border-primary' : 'border-muted-foreground/60')}>
            {selected && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full border', st.cls)}>{st.label}</span>
        </div>
      </div>
      <CardContent className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold truncate mb-1" title={product.name}>{product.name}</p>
        <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
        <div className="flex items-center gap-2 mb-3">
          {product.sale_price != null
            ? <><span className="text-sm font-bold text-primary">¥{product.sale_price}</span>
               <span className="text-xs text-muted-foreground line-through">¥{product.original_price}</span></>
            : product.original_price != null
              ? <span className="text-sm font-bold text-primary">¥{product.original_price}</span>
              : <span className="text-xs text-muted-foreground">未设置价格</span>
          }
        </div>
        <div className="text-xs text-muted-foreground mb-3">库存：{product.stock} | 销量：{product.sales_count}</div>
        <div className="flex items-center gap-2 mt-auto">
          <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" onClick={() => onEdit(product)}>
            <Edit2 className="w-3 h-3 mr-1" />编辑
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => onToggle(product)}>
            {product.status === 'active' ? '下架' : '上架'}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => onDelete(product.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── 表单分区标题 ──────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, label }: { icon: typeof Package; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
    </div>
  );
}

// ── 卖点编辑区 ────────────────────────────────────────────────────────────
function SellingPointsSection({ form, updateSP, addSP, removeSP }: {
  form: FormState;
  updateSP: (i: number, val: string) => void;
  addSP: () => void;
  removeSP: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Star} label="核心卖点" />
        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:bg-primary/5" onClick={addSP}
          disabled={form.selling_points.length >= 6}>
          <Plus className="w-3 h-3 mr-1" />添加卖点
        </Button>
      </div>
      <div className="space-y-2">
        {form.selling_points.map((sp, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              sp.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>{i + 1}</div>
            <Input placeholder={`卖点 ${i + 1}，如：纯棉材质、透气不闷热`} className="px-3 flex-1" value={sp}
              onChange={e => updateSP(i, e.target.value)} />
            <Button size="icon" variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
              onClick={() => removeSP(i)} disabled={form.selling_points.length <= 1}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">已填 {form.selling_points.filter(Boolean).length} 个，最多 6 个。卖点越精准，AI生成的带货文案越有吸引力</p>
    </div>
  );
}

// ── 价格库存区 ────────────────────────────────────────────────────────────
function PriceStockSection({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  const discount = form.original_price && form.sale_price
    ? Math.round((parseFloat(form.sale_price) / parseFloat(form.original_price)) * 10 * 10) / 10
    : null;

  return (
    <div className="space-y-3">
      <SectionTitle icon={Package} label="价格与库存" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="p-price-s">原价（¥）</Label>
          <Input id="p-price-s" type="number" min="0" step="0.01" placeholder="0.00" className="px-3 h-10"
            value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-sale-s">
            促销价（¥）
            {discount !== null && (
              <span className="ml-1.5 text-xs font-medium text-success">
                {discount < 10 ? `${discount}折` : '已优惠'}
              </span>
            )}
          </Label>
          <Input id="p-sale-s" type="number" min="0" step="0.01" placeholder="0.00" className="px-3 h-10"
            value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
        </div>
        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label htmlFor="p-stock-s">库存数量</Label>
          <Input id="p-stock-s" type="number" min="0" placeholder="0" className="px-3 h-10"
            value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
        </div>
      </div>
      {form.sale_price && form.original_price && parseFloat(form.sale_price) > parseFloat(form.original_price) && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          促销价不应高于原价
        </div>
      )}
    </div>
  );
}

// ── 图片管理区 ────────────────────────────────────────────────────────────
function ImagesSection({ form, imgUrlInput, setImgUrlInput, imgInputRef, addImageUrl, removeImage, setCoverImage }: {
  form: FormState;
  imgUrlInput: string;
  setImgUrlInput: (v: string) => void;
  imgInputRef: React.RefObject<HTMLInputElement>;
  addImageUrl: () => void;
  removeImage: (i: number) => void;
  setCoverImage: (url: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Image} label="商品图片" />
        <span className="text-xs text-muted-foreground">{form.images.length} 张 / 最多 8 张</span>
      </div>
      {/* URL输入框 */}
      <div className="flex gap-2">
        <Input
          ref={imgInputRef}
          placeholder="粘贴图片URL，如 https://example.com/img.jpg"
          className="px-3 text-sm flex-1"
          value={imgUrlInput}
          onChange={e => setImgUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addImageUrl()}
          disabled={form.images.length >= 8}
        />
        <Button variant="outline" className="h-9 px-3 shrink-0" onClick={addImageUrl}
          disabled={!imgUrlInput.trim() || form.images.length >= 8}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">按 Enter 或点击 + 按钮添加。点击图片可设为封面图</p>
      {/* 图片预览网格 */}
      {form.images.length > 0 ? (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {form.images.map((img, i) => {
            const isCover = form.cover_image === img || i === 0;
            return (
              <div key={i}
                className={cn('relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group transition-all',
                  isCover ? 'border-primary shadow-sm' : 'border-border/50 hover:border-primary/50')}
                onClick={() => setCoverImage(img)}
                title="点击设为封面">
                <img src={img} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                {/* 封面标签 */}
                {isCover && (
                  <div className="absolute bottom-0 left-0 right-0 bg-primary/85 text-primary-foreground text-center py-0.5">
                    <span className="text-[9px] font-semibold">封面</span>
                  </div>
                )}
                {/* 删除按钮 */}
                <button
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                  onClick={e => { e.stopPropagation(); removeImage(i); }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          {form.images.length < 8 && (
            <div className="aspect-square rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground/50 cursor-pointer hover:border-primary/40 hover:text-primary/50 transition-colors"
              onClick={() => imgInputRef.current?.focus()}>
              <Plus className="w-5 h-5" />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border/50 p-6 flex flex-col items-center gap-2 text-center cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => imgInputRef.current?.focus()}>
          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">点击上方输入框粘贴图片URL</p>
          <p className="text-xs text-muted-foreground/60">支持JPG、PNG、WebP格式，建议800×800px</p>
        </div>
      )}
    </div>
  );
}

// ── 规格参数区 ────────────────────────────────────────────────────────────
function SpecsSection({ form, addSpec, removeSpec, updateSpec }: {
  form: FormState;
  addSpec: () => void;
  removeSpec: (i: number) => void;
  updateSpec: (i: number, key: 'name' | 'value', val: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle icon={GripVertical} label="规格参数" />
        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:bg-primary/5" onClick={addSpec}>
          <Plus className="w-3 h-3 mr-1" />添加规格
        </Button>
      </div>
      {form.specs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">暂未添加规格（可选），如颜色、尺寸、口味等</p>
          <Button variant="ghost" size="sm" className="h-7 mt-2 text-xs" onClick={addSpec}>
            <Plus className="w-3 h-3 mr-1" />立即添加
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground px-1">
            <span>规格名</span>
            <span>规格值</span>
          </div>
          {form.specs.map((spec, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="如：颜色" className="px-3 flex-1" value={spec.name}
                onChange={e => updateSpec(i, 'name', e.target.value)} />
              <Input placeholder="如：红色、蓝色" className="px-3 flex-1" value={spec.value}
                onChange={e => updateSpec(i, 'value', e.target.value)} />
              <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeSpec(i)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // 步骤表单状态（仅新增时启用）
  const [formStep, setFormStep] = useState(1);
  // 图片URL输入临时状态
  const [imgUrlInput, setImgUrlInput] = useState('');
  const imgInputRef = useRef<HTMLInputElement | null>(null);

  // ── 加载商品 ────────────────────────────────────────────────────────────
  const DEMO_UID = '7d58d08f-8aa3-43f5-a30f-b7495d59d147';
  const loadProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.eq.${DEMO_UID}`)
      .order('created_at', { ascending: false });
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── 过滤与排序 ──────────────────────────────────────────────────────────
  const filtered = products
    .filter(p => {
      const q = search.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created_at_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price_desc':      return (b.sale_price ?? b.original_price ?? 0) - (a.sale_price ?? a.original_price ?? 0);
        case 'price_asc':       return (a.sale_price ?? a.original_price ?? 0) - (b.sale_price ?? b.original_price ?? 0);
        case 'sales_desc':      return b.sales_count - a.sales_count;
        default:                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // ── 多选 ────────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)));

  // ── 打开新增/编辑弹窗 ───────────────────────────────────────────────────
  const openAdd = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormStep(1);
    setImgUrlInput('');
    setDialogOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormStep(1); // 编辑直接显示完整表单（step=0标记）
    setImgUrlInput('');
    setForm({
      name: p.name, category: p.category, sub_category: p.sub_category ?? '',
      description: p.description ?? '',
      selling_points: p.selling_points.length ? [...p.selling_points, '', ''].slice(0, Math.max(p.selling_points.length, 3)) : ['', '', ''],
      original_price: p.original_price != null ? String(p.original_price) : '',
      sale_price: p.sale_price != null ? String(p.sale_price) : '',
      stock: String(p.stock),
      specs: p.specs ?? [],
      images: p.images ?? [],
      cover_image: p.cover_image ?? '',
      status: p.status,
    });
    setDialogOpen(true);
  };

  // ── 步骤校验 ────────────────────────────────────────────────────────────
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!form.name.trim()) { toast.error('请填写商品名称'); return false; }
      return true;
    }
    if (step === 2) {
      if (form.original_price && isNaN(parseFloat(form.original_price))) {
        toast.error('原价格式不正确'); return false;
      }
      if (form.sale_price && isNaN(parseFloat(form.sale_price))) {
        toast.error('促销价格式不正确'); return false;
      }
      if (form.sale_price && form.original_price && parseFloat(form.sale_price) > parseFloat(form.original_price)) {
        toast.error('促销价不能高于原价'); return false;
      }
      return true;
    }
    return true;
  };

  const goNextStep = () => {
    if (!validateStep(formStep)) return;
    setFormStep(s => Math.min(s + 1, FORM_STEPS.length));
  };
  const goPrevStep = () => setFormStep(s => Math.max(s - 1, 1));

  // ── 保存商品 ────────────────────────────────────────────────────────────
  const handleSave = async (continueAdd = false) => {
    if (!form.name.trim()) { toast.error('请填写商品名称'); return; }
    if (form.sale_price && form.original_price && parseFloat(form.sale_price) > parseFloat(form.original_price)) {
      toast.error('促销价不能高于原价'); return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      sub_category: form.sub_category || null,
      description: form.description || null,
      selling_points: form.selling_points.filter(Boolean),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      stock: parseInt(form.stock) || 0,
      specs: form.specs,
      images: form.images,
      cover_image: form.images[0] ?? null,
      status: form.status,
      user_id: user!.id,
    };
    const { error } = editingProduct
      ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
      : await supabase.from('products').insert(payload);
    setSaving(false);
    if (error) { toast.error('保存失败：' + error.message); return; }
    toast.success(editingProduct ? '商品已更新' : '商品已添加');
    loadProducts();
    if (continueAdd && !editingProduct) {
      // 继续新增：重置表单，回到第一步
      setForm(EMPTY_FORM);
      setFormStep(1);
      setImgUrlInput('');
    } else {
      setDialogOpen(false);
    }
  };

  // ── 删除 ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    toast.success('已删除');
    setDeleteId(null);
    loadProducts();
  };
  const handleBatchDelete = async () => {
    await supabase.from('products').delete().in('id', Array.from(selected));
    toast.success(`已删除 ${selected.size} 个商品`);
    setSelected(new Set());
    setBatchDeleteOpen(false);
    loadProducts();
  };

  // ── 上下架 ──────────────────────────────────────────────────────────────
  const handleToggle = async (p: Product) => {
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    await supabase.from('products').update({ status: newStatus }).eq('id', p.id);
    toast.success(newStatus === 'active' ? '已上架' : '已下架');
    loadProducts();
  };

  // ── 规格管理 ────────────────────────────────────────────────────────────
  const addSpec = () => setForm(f => ({ ...f, specs: [...f.specs, { name: '', value: '' }] }));
  const removeSpec = (i: number) => setForm(f => ({ ...f, specs: f.specs.filter((_, idx) => idx !== i) }));
  const updateSpec = (i: number, key: 'name' | 'value', val: string) =>
    setForm(f => { const s = [...f.specs]; s[i] = { ...s[i], [key]: val }; return { ...f, specs: s }; });

  // ── 卖点管理（支持动态增减）─────────────────────────────────────────────
  const updateSP = (i: number, val: string) =>
    setForm(f => { const sp = [...f.selling_points]; sp[i] = val; return { ...f, selling_points: sp }; });
  const addSP = () => {
    if (form.selling_points.length >= 6) { toast.info('最多添加6个卖点'); return; }
    setForm(f => ({ ...f, selling_points: [...f.selling_points, ''] }));
  };
  const removeSP = (i: number) => {
    if (form.selling_points.length <= 1) return;
    setForm(f => ({ ...f, selling_points: f.selling_points.filter((_, idx) => idx !== i) }));
  };

  // ── 图片管理 ────────────────────────────────────────────────────────────
  const addImageUrl = () => {
    const url = imgUrlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { toast.error('请输入有效的图片URL（以http://或https://开头）'); return; }
    if (form.images.includes(url)) { toast.error('该图片已添加'); return; }
    setForm(f => ({ ...f, images: [...f.images, url], cover_image: f.images.length === 0 ? url : f.cover_image }));
    setImgUrlInput('');
    if (imgInputRef.current) imgInputRef.current.focus();
  };
  const removeImage = (i: number) => {
    setForm(f => {
      const imgs = f.images.filter((_, idx) => idx !== i);
      return { ...f, images: imgs, cover_image: imgs[0] ?? '' };
    });
  };
  const setCoverImage = (url: string) => setForm(f => ({ ...f, cover_image: url }));

  // ── F-08: CSV 导出 ────────────────────────────────────────────────────
  const handleExport = () => {
    const targets = selected.size > 0 ? products.filter(p => selected.has(p.id)) : filtered;
    if (targets.length === 0) { toast.error('没有可导出的商品'); return; }
    const headers = ['商品名称', '分类', '子分类', '描述', '原价', '售价', '库存', '状态', '销量', '卖点'];
    const rows = targets.map(p => [
      p.name,
      p.category,
      p.sub_category ?? '',
      (p.description ?? '').replace(/,/g, '，'),
      p.original_price ?? '',
      p.sale_price ?? '',
      p.stock,
      p.status,
      p.sales_count,
      p.selling_points.join('|'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `商品列表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${targets.length} 条商品数据`);
  };

  // ── F-08: CSV 导入 ────────────────────────────────────────────────────
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  const handleImportFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) { toast.error('请上传 CSV 格式文件'); return; }
    setImporting(true);
    setImportErrors([]);
    try {
      const text = await file.text();
      const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
      if (lines.length < 2) { toast.error('CSV 文件内容为空'); setImporting(false); return; }
      // 跳过表头
      const dataLines = lines.slice(1);
      const parseRow = (line: string): string[] => {
        const cols: string[] = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { inQ = !inQ; continue; }
          if (ch === ',' && !inQ) { cols.push(cur); cur = ''; continue; }
          cur += ch;
        }
        cols.push(cur);
        return cols;
      };
      const errs: string[] = [];
      const payloads: object[] = [];
      dataLines.forEach((line, idx) => {
        const cols = parseRow(line);
        const name = cols[0]?.trim();
        if (!name) { errs.push(`第 ${idx + 2} 行：商品名称不能为空`); return; }
        const price = parseFloat(cols[4] ?? '') || null;
        const salePrice = parseFloat(cols[5] ?? '') || null;
        const stock = parseInt(cols[6] ?? '') || 0;
        payloads.push({
          name,
          category: cols[1]?.trim() || '其他',
          sub_category: cols[2]?.trim() || null,
          description: cols[3]?.trim() || null,
          original_price: price,
          sale_price: salePrice,
          stock,
          status: (['active', 'inactive', 'draft'].includes(cols[7]?.trim()) ? cols[7]?.trim() : 'draft') as 'active' | 'inactive' | 'draft',
          sales_count: parseInt(cols[8] ?? '') || 0,
          selling_points: cols[9]?.split('|').map(s => s.trim()).filter(Boolean) ?? [],
          images: [],
          cover_image: null,
          user_id: user!.id,
        });
      });
      setImportErrors(errs);
      if (payloads.length === 0) { toast.error('没有有效数据可导入'); setImporting(false); return; }
      const { error } = await supabase.from('products').insert(payloads);
      if (error) throw error;
      toast.success(`成功导入 ${payloads.length} 个商品${errs.length > 0 ? `，跳过 ${errs.length} 行错误数据` : ''}`);
      setImportOpen(false);
      loadProducts();
    } catch (e: unknown) {
      toast.error('导入失败：' + (e instanceof Error ? e.message : '未知错误'));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = '"商品名称","分类","子分类","描述","原价","售价","库存","状态","销量","卖点"';
    const example = '"示例商品","美妆护肤","面霜","这是一款示例商品","299","199","100","active","0","保湿滋润|温和不刺激"';
    const csv = [header, example].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '商品导入模板.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* 页头 */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-balance">
            <Package className="w-5 h-5 text-primary" />商品管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理您的商品信息，快速创建带货视频</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" />导出CSV
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />批量导入
          </Button>
          <Button onClick={openAdd} className="h-9">
            <Plus className="w-4 h-4 mr-2" />添加商品
          </Button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索商品名称或分类..." className="pl-9 pr-3" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-9"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">已上架</SelectItem>
              <SelectItem value="inactive">已下架</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 h-9">
              <ChevronDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">最新上架</SelectItem>
              <SelectItem value="created_at_asc">最早上架</SelectItem>
              <SelectItem value="price_desc">价格从高到低</SelectItem>
              <SelectItem value="price_asc">价格从低到高</SelectItem>
              <SelectItem value="sales_desc">销量最高</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-md overflow-hidden h-9">
            <button onClick={() => setViewMode('grid')} className={cn('px-2.5 transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('table')} className={cn('px-2.5 transition-colors border-l border-border', viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm font-medium text-primary">已选 {selected.size} 个</span>
          <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
            onClick={() => setBatchDeleteOpen(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />批量删除
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelected(new Set())}>
            <X className="w-3.5 h-3.5 mr-1" />取消选择
          </Button>
        </div>
      )}

      {/* 内容区 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col h-full">
              <Skeleton className="aspect-square w-full bg-muted" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-muted" />
                <Skeleton className="h-3 w-1/2 bg-muted" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-7 flex-1 bg-muted" />
                  <Skeleton className="h-7 w-7 bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">{search || categoryFilter !== 'all' ? '未找到匹配商品' : '暂无商品，点击「添加商品」开始'}</p>
          {!search && categoryFilter === 'all' && (
            <Button onClick={openAdd} size="sm"><Plus className="w-4 h-4 mr-1" />添加商品</Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} selected={selected.has(p.id)}
                onSelect={toggleSelect} onEdit={openEdit}
                onDelete={id => setDeleteId(id)} onToggle={handleToggle} />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">商品</TableHead>
                  <TableHead className="whitespace-nowrap">分类</TableHead>
                  <TableHead className="whitespace-nowrap">价格</TableHead>
                  <TableHead className="whitespace-nowrap">库存</TableHead>
                  <TableHead className="whitespace-nowrap">销量</TableHead>
                  <TableHead className="whitespace-nowrap">状态</TableHead>
                  <TableHead className="whitespace-nowrap">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const st = STATUS_MAP[p.status];
                  return (
                    <TableRow key={p.id} className={cn(selected.has(p.id) && 'bg-primary/5')} onClick={() => toggleSelect(p.id)}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0">
                            {p.cover_image
                              ? <img src={p.cover_image} alt={p.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/40" /></div>
                            }
                          </div>
                          <span className="text-sm font-medium max-w-[160px] truncate">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{p.category}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {p.sale_price != null ? `¥${p.sale_price}` : p.original_price != null ? `¥${p.original_price}` : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{p.stock}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{p.sales_count}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', st.cls)}>{st.label}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => handleToggle(p)}>
                            {p.status === 'active' ? '下架' : '上架'}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── 添加/编辑弹窗（分步表单） ── */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setFormStep(1); setImgUrlInput(''); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[92dvh] flex flex-col p-0 overflow-hidden">
          {/* 弹窗头 */}
          <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
            <div className="flex items-center justify-between gap-4 mb-1">
              <DialogTitle className="text-balance text-lg">
                {editingProduct ? '编辑商品' : '新增商品'}
              </DialogTitle>
              {!editingProduct && (
                <span className="text-xs text-muted-foreground shrink-0">
                  步骤 {formStep} / {FORM_STEPS.length}
                </span>
              )}
            </div>
            {/* 步骤指示器（仅新增时显示） */}
            {!editingProduct && (
              <StepIndicator currentStep={formStep} totalSteps={FORM_STEPS.length} />
            )}
            {/* 当前步骤说明（仅新增时） */}
            {!editingProduct && (
              <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {FORM_STEPS[formStep - 1]?.desc}
                </p>
              </div>
            )}
          </DialogHeader>

          {/* 滚动内容区 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">

            {/* ── 编辑模式：显示完整表单 ─────────────────────────── */}
            {editingProduct ? (
              <div className="space-y-5">
                {/* 基本信息 */}
                <div className="space-y-3">
                  <SectionTitle icon={Package} label="基本信息" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="p-name">商品名称 <span className="text-destructive">*</span></Label>
                      <Input id="p-name" placeholder="输入商品名称" className="px-3" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>商品分类 <span className="text-destructive">*</span></Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="p-sub">子分类（可选）</Label>
                      <Input id="p-sub" placeholder="如：连衣裙" className="px-3" value={form.sub_category}
                        onChange={e => setForm(f => ({ ...f, sub_category: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-desc">商品描述</Label>
                    <Textarea id="p-desc" placeholder="详细描述商品特点..." className="px-3 resize-none" rows={3}
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
                <Separator />
                <SellingPointsSection form={form} updateSP={updateSP} addSP={addSP} removeSP={removeSP} />
                <Separator />
                <PriceStockSection form={form} setForm={setForm} />
                <Separator />
                <ImagesSection form={form} imgUrlInput={imgUrlInput} setImgUrlInput={setImgUrlInput}
                  imgInputRef={imgInputRef} addImageUrl={addImageUrl} removeImage={removeImage} setCoverImage={setCoverImage} />
                <Separator />
                <SpecsSection form={form} addSpec={addSpec} removeSpec={removeSpec} updateSpec={updateSpec} />
                <Separator />
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">立即上架</p>
                    <p className="text-xs text-muted-foreground mt-0.5">关闭则保存为草稿</p>
                  </div>
                  <Switch checked={form.status === 'active'} onCheckedChange={v => setForm(f => ({ ...f, status: v ? 'active' : 'draft' }))} />
                </div>
              </div>
            ) : (
              /* ── 新增模式：分步表单 ─────────────────────────────── */
              <div>
                {/* 步骤1：基本信息 */}
                {formStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="p-name-new">
                          商品名称 <span className="text-destructive">*</span>
                        </Label>
                        <Input id="p-name-new" placeholder="输入商品名称，建议包含关键词" className="px-3 h-10"
                          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && goNextStep()} />
                        <p className="text-xs text-muted-foreground">建议包含品牌名和核心产品词，如"XX品牌女式连衣裙"</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>商品分类 <span className="text-destructive">*</span></Label>
                        <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-sub-new">子分类 <span className="text-xs text-muted-foreground font-normal">（可选）</span></Label>
                        <Input id="p-sub-new" placeholder="如：连衣裙、口红、手机壳" className="px-3 h-10"
                          value={form.sub_category} onChange={e => setForm(f => ({ ...f, sub_category: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="p-desc-new">商品描述 <span className="text-xs text-muted-foreground font-normal">（可选，AI脚本生成时会参考）</span></Label>
                      <Textarea id="p-desc-new" placeholder="详细描述商品的材质、功能、使用场景等，有助于AI生成更精准的带货文案..." className="px-3 resize-none" rows={4}
                        value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    {/* 提示卡片 */}
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex gap-3">
                      <Star className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">完善商品信息有助于AI生成更好的带货视频</p>
                        <p className="text-xs text-muted-foreground mt-0.5 text-pretty">商品名称和描述越详细，AI生成的脚本针对性越强、转化率越高</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 步骤2：销售信息（卖点+价格） */}
                {formStep === 2 && (
                  <div className="space-y-5">
                    <SellingPointsSection form={form} updateSP={updateSP} addSP={addSP} removeSP={removeSP} />
                    <Separator />
                    <PriceStockSection form={form} setForm={setForm} />
                  </div>
                )}

                {/* 步骤3：图片+规格 */}
                {formStep === 3 && (
                  <div className="space-y-5">
                    <ImagesSection form={form} imgUrlInput={imgUrlInput} setImgUrlInput={setImgUrlInput}
                      imgInputRef={imgInputRef} addImageUrl={addImageUrl} removeImage={removeImage} setCoverImage={setCoverImage} />
                    <Separator />
                    <SpecsSection form={form} addSpec={addSpec} removeSpec={removeSpec} updateSpec={updateSpec} />
                  </div>
                )}

                {/* 步骤4：发布设置 */}
                {formStep === 4 && (
                  <div className="space-y-5">
                    {/* 信息预览摘要 */}
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                      <p className="text-sm font-semibold">信息确认</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex gap-2 col-span-2">
                          <span className="text-muted-foreground shrink-0">名称</span>
                          <span className="font-medium truncate">{form.name || '—'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">分类</span>
                          <span>{form.category}{form.sub_category ? ` · ${form.sub_category}` : ''}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">价格</span>
                          <span>{form.sale_price ? `¥${form.sale_price}` : form.original_price ? `¥${form.original_price}` : '未填写'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">库存</span>
                          <span>{form.stock || '0'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">图片</span>
                          <span>{form.images.length > 0 ? `${form.images.length} 张` : '未上传'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">卖点</span>
                          <span>{form.selling_points.filter(Boolean).length} 个</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">规格</span>
                          <span>{form.specs.length > 0 ? `${form.specs.length} 项` : '未设置'}</span>
                        </div>
                      </div>
                    </div>
                    {/* 上架状态 */}
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">发布状态</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {form.status === 'active' ? '商品将立即上架，在商品列表中可见' : '商品将保存为草稿，不对外展示'}
                          </p>
                        </div>
                        <Switch checked={form.status === 'active'} onCheckedChange={v => setForm(f => ({ ...f, status: v ? 'active' : 'draft' }))} />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', STATUS_MAP[form.status].cls)}>
                          {STATUS_MAP[form.status].label}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="shrink-0 px-6 py-4 border-t border-border/50 bg-background">
            {editingProduct ? (
              /* 编辑模式：简单保存/取消 */
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="h-9" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button className="h-9 min-w-[90px]" onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                  保存修改
                </Button>
              </div>
            ) : formStep < FORM_STEPS.length ? (
              /* 新增模式非最后一步：上一步 + 下一步 */
              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" className="h-9" onClick={formStep === 1 ? () => setDialogOpen(false) : goPrevStep}>
                  {formStep === 1 ? '取消' : '上一步'}
                </Button>
                <div className="flex gap-2">
                  {/* 步骤2以后允许跳过 */}
                  {formStep >= 2 && (
                    <Button variant="ghost" className="h-9 text-muted-foreground" onClick={goNextStep}>
                      跳过
                    </Button>
                  )}
                  <Button className="h-9 min-w-[80px]" onClick={goNextStep}>
                    下一步 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ) : (
              /* 新增模式最后一步：保存 + 保存并继续 */
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Button variant="outline" className="h-9" onClick={goPrevStep}>上一步</Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-9 text-sm" onClick={() => handleSave(true)} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <PlusCircle className="w-3.5 h-3.5 mr-1.5" />}
                    保存并继续新增
                  </Button>
                  <Button className="h-9 min-w-[90px]" onClick={() => handleSave(false)} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                    完成保存
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 单条删除确认 */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复，确定要删除这个商品吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认 */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>批量删除确认</AlertDialogTitle>
            <AlertDialogDescription>将删除选中的 {selected.size} 个商品，此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBatchDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── F-08: CSV 批量导入弹窗 ── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />批量导入商品
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 下载模板 */}
            <div className="rounded-xl bg-muted/40 border border-border/60 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-balance">第一步：下载导入模板</p>
                <p className="text-xs text-muted-foreground mt-0.5 text-pretty">按照模板格式填写商品数据，支持批量导入</p>
                <Button variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={downloadTemplate}>
                  <Download className="w-3.5 h-3.5 mr-1" />下载CSV模板
                </Button>
              </div>
            </div>

            {/* 上传文件 */}
            <div>
              <p className="text-sm font-medium mb-2">第二步：上传填好的CSV文件</p>
              <label className={cn(
                'flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                'hover:border-primary/50 hover:bg-primary/5',
                importing ? 'opacity-60 pointer-events-none' : ''
              )}>
                <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center">
                  {importing
                    ? <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    : <Upload className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-balance">
                    {importing ? '正在导入...' : '点击或拖拽上传 CSV 文件'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">仅支持 .csv 格式，文件大小不超过 10MB</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }}
                />
              </label>
            </div>

            {/* 导入错误提示 */}
            {importErrors.length > 0 && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />发现 {importErrors.length} 行格式错误（已跳过）
                </p>
                <div className="max-h-24 overflow-y-auto space-y-0.5">
                  {importErrors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{e}</p>
                  ))}
                </div>
              </div>
            )}

            {/* 字段说明 */}
            <div className="rounded-xl bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground mb-1.5">CSV 字段说明</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  ['商品名称', '必填'],
                  ['分类', '必填'],
                  ['状态', 'active/inactive/draft'],
                  ['卖点', '多个用 | 分隔'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-medium text-foreground">{k}</span>
                    <span className="text-muted-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
