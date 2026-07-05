import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sparkles, Search, Languages, Camera, Download, Star, Check, Video, ArrowRight, Info, Eye, Loader2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── 智能选品数据类型 ───────────────────────────────────────────────────────
interface SelectableProduct {
  id: string;
  name: string;
  category: string;
  original_price: number;
  sale_price: number;
  currency: string;
  country: string;
  country_flag: string;
  rating: number;
  commission_rate: number;
  stock: number;
  cover_image: string;
  shop_name: string;
  shop_logo: string;
  shop_sales: string;
  influencer_rate: string;
  trend_data: number[];
  sales_7d: string;
  sales_7d_raw: number;
  revenue_7d: string;
  total_sales: string;
  total_sales_raw: number;
  total_revenue: string;
  associated_influencers: number;
  shop_type: 'crossborder' | 'local';
  product_type: 'new' | 'free_shipping' | 'local_warehouse' | 'hot';
  status: 'active' | 'inactive';
}

// ── 静态爆款商品池 ────────────────────────────────────────────────────────
const MOCK_SELECTION_POOL: SelectableProduct[] = [
  {
    id: "sp-1",
    name: "[SOCKS HOUSE] MEGA SALE Men's Cotton Socks (10 Pairs Pack)",
    category: "男装与男士内衣",
    original_price: 15.00,
    sale_price: 2.13,
    currency: "RM",
    country: "马来西亚",
    country_flag: "🇲🇾",
    rating: 4.7,
    commission_rate: 5,
    stock: 24500,
    cover_image: "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=200",
    shop_name: "SOCKS HOUSE",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "755.73万",
    influencer_rate: "100%",
    trend_data: [120, 115, 125, 130, 128, 145, 139],
    sales_7d: "13.96万",
    sales_7d_raw: 139600,
    revenue_7d: "RM14.65万 ($3.18万)",
    total_sales: "490.97万",
    total_sales_raw: 4909700,
    total_revenue: "RM612.95万 ($132.96万)",
    associated_influencers: 4399,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-3",
    name: "[Anua] Heartleaf 77% Soothing Toner 250ml",
    category: "美妆个护",
    original_price: 25.00,
    sale_price: 18.50,
    currency: "$",
    country: "美国",
    country_flag: "🇺🇸",
    rating: 4.8,
    commission_rate: 15,
    stock: 5400,
    cover_image: "https://images.unsplash.com/photo-1556229010-aa3f7ff66b24?w=200",
    shop_name: "Anua Official Store",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "124.50万",
    influencer_rate: "85%",
    trend_data: [50, 65, 70, 75, 80, 95, 102],
    sales_7d: "4.25万",
    sales_7d_raw: 42500,
    revenue_7d: "$78.62万",
    total_sales: "88.40万",
    total_sales_raw: 884000,
    total_revenue: "$1635.40万",
    associated_influencers: 1250,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-4",
    name: "[Bioaqua] Salicylic Acid Acne Treatment Mask (120g)",
    category: "美妆个护",
    original_price: 19.99,
    sale_price: 8.99,
    currency: "RM",
    country: "马来西亚",
    country_flag: "🇲🇾",
    rating: 4.6,
    commission_rate: 12,
    stock: 35000,
    cover_image: "https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=200",
    shop_name: "Bioaqua Mall",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "985.20万",
    influencer_rate: "95%",
    trend_data: [150, 160, 155, 175, 180, 192, 186],
    sales_7d: "18.60万",
    sales_7d_raw: 186000,
    revenue_7d: "RM167.21万 ($36.35万)",
    total_sales: "1240.50万",
    total_sales_raw: 12405000,
    total_revenue: "RM1.11亿 ($2413.04万)",
    associated_influencers: 8900,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-5",
    name: "Indomie Mi Goreng Instant Fried Noodles 80g x 5 Packs",
    category: "食品饮料",
    original_price: 20000,
    sale_price: 15500,
    currency: "Rp",
    country: "印度尼西亚",
    country_flag: "🇮🇩",
    rating: 4.9,
    commission_rate: 3,
    stock: 120000,
    cover_image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=200",
    shop_name: "Indomie Official Store",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "1540.30万",
    influencer_rate: "45%",
    trend_data: [200, 220, 210, 230, 225, 240, 245],
    sales_7d: "24.50万",
    sales_7d_raw: 245000,
    revenue_7d: "Rp37.97亿 ($24.30万)",
    total_sales: "3200.00万",
    total_sales_raw: 32000000,
    total_revenue: "Rp4960亿 ($3174.00万)",
    associated_influencers: 340,
    shop_type: "local",
    product_type: "local_warehouse",
    status: "active"
  },
  {
    id: "sp-6",
    name: "[Garnier] Bright Complete Vitamin C Booster Serum 30ml",
    category: "美妆个护",
    original_price: 399,
    sale_price: 299,
    currency: "฿",
    country: "泰国",
    country_flag: "🇹🇭",
    rating: 4.7,
    commission_rate: 10,
    stock: 18000,
    cover_image: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=200",
    shop_name: "Garnier Thailand Official",
    shop_logo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50",
    shop_sales: "420.50万",
    influencer_rate: "92%",
    trend_data: [75, 82, 80, 85, 88, 92, 89],
    sales_7d: "8.90万",
    sales_7d_raw: 89000,
    revenue_7d: "฿2661万 ($72.50万)",
    total_sales: "310.40万",
    total_sales_raw: 3104000,
    total_revenue: "฿9.28亿 ($2530.00万)",
    associated_influencers: 3100,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-7",
    name: "[Colgate] Max Fresh Cooling Crystals Gel Toothpaste 150g",
    category: "美妆个护",
    original_price: 4.99,
    sale_price: 3.50,
    currency: "£",
    country: "英国",
    country_flag: "🇬🇧",
    rating: 4.5,
    commission_rate: 6,
    stock: 45000,
    cover_image: "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=200",
    shop_name: "Colgate UK Store",
    shop_logo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=50",
    shop_sales: "210.80万",
    influencer_rate: "60%",
    trend_data: [25, 28, 26, 32, 29, 30, 31],
    sales_7d: "3.10万",
    sales_7d_raw: 31000,
    revenue_7d: "£10.85万 ($13.80万)",
    total_sales: "145.20万",
    total_sales_raw: 1452000,
    total_revenue: "£508.20万 ($645.40万)",
    associated_influencers: 890,
    shop_type: "crossborder",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-8",
    name: "[Cosrx] Low pH Good Morning Gel Cleanser 150ml (Acne Care)",
    category: "美妆个护",
    original_price: 18.00,
    sale_price: 12.90,
    currency: "S$",
    country: "新加坡",
    country_flag: "🇸🇬",
    rating: 4.8,
    commission_rate: 10,
    stock: 12000,
    cover_image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200",
    shop_name: "COSRX SG Official",
    shop_logo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=50",
    shop_sales: "85.60万",
    influencer_rate: "88%",
    trend_data: [15, 17, 16, 18, 19, 18, 18.5],
    sales_7d: "1.85万",
    sales_7d_raw: 18500,
    revenue_7d: "S$23.86万 ($17.50万)",
    total_sales: "62.40万",
    total_sales_raw: 624000,
    total_revenue: "S$804.96万 ($591.60万)",
    associated_influencers: 1540,
    shop_type: "local",
    product_type: "new",
    status: "active"
  }
];

// ── 过滤器配置 ─────────────────────────────────────────────────────────────
const REGIONS = [
  { value: 'all', label: '全部' },
  { value: '美国', label: '美国' },
  { value: '印度尼西亚', label: '印度尼西亚' },
  { value: '英国', label: '英国' },
  { value: '越南', label: '越南' },
  { value: '泰国', label: '泰国' },
  { value: '马来西亚', label: '马来西亚' },
  { value: '菲律宾', label: '菲律宾' },
  { value: '西班牙', label: '西班牙', isNew: true },
  { value: '墨西哥', label: '墨西哥', isNew: true },
  { value: '德国', label: '德国', isNew: true },
  { value: '法国', label: '法国', isNew: true },
  { value: '意大利', label: '意大利', isNew: true },
  { value: '巴西', label: '巴西', isNew: true },
  { value: '日本', label: '日本', isNew: true },
  { value: '新加坡', label: '新加坡', isNew: true }
];

const CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: '美妆个护', label: '美妆个护' },
  { value: '女装与女士内衣', label: '女装与女士内衣' },
  { value: '保健', label: '保健' },
  { value: '时尚配件', label: '时尚配件' },
  { value: '运动与户外', label: '运动与户外' },
  { value: '手机与数码', label: '手机与数码' },
  { value: '居家日用', label: '居家日用' },
  { value: '食品饮料', label: '食品饮料' },
  { value: '汽车与摩托车', label: '汽车与摩托车' },
  { value: '男装与男士内衣', label: '男装与男士内衣' },
  { value: '收藏品', label: '收藏品' },
  { value: '玩具和爱好', label: '玩具和爱好' },
  { value: '厨房用品', label: '厨房用品' }
];

const SHOP_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'crossborder', label: '跨境店' },
  { value: 'local', label: '本土店' }
];

const PRODUCT_STATUSES = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '在售' },
  { value: 'inactive', label: '下架' }
];

const TRANSLATIONS: Record<string, string> = {
  "sp-1": "【热卖】SOCKS HOUSE 男士纯棉运动短袜 (10双超值装)",
  "sp-3": "【护肤】Anua 77%鱼腥草舒缓控油爽肤水 250ml",
  "sp-4": "【清洁】泊泉雅 水杨酸祛痘修护净颜面膜 120g",
  "sp-5": "【速食】Indomie 营多牌经典印尼捞面 80g x 5包",
  "sp-6": "【精华】卡尼尔 30倍维他命C强效美白提亮精华液 30ml",
  "sp-7": "【清洁】高露洁 Max Fresh 冰爽劲白薄荷啫喱牙膏 150g",
  "sp-8": "【洁面】COSRX 晨间温和弱酸性洁面凝胶 150ml"
};

export default function ProductSelectionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isTranslated, setIsTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [isSearchingByImage, setIsSearchingByImage] = useState(false);
  const [imageSearchProgress, setImageSearchProgress] = useState(0);
  const [imageSearchPreview, setImageSearchPreview] = useState<string | null>(null);
  const [hasActiveImageSearch, setHasActiveImageSearch] = useState(false);
  const imageSearchInputRef = useRef<HTMLInputElement>(null);

  const handleTranslateToggle = () => {
    if (isTranslated) {
      setIsTranslated(false);
      toast.success('已恢复原始英文标题');
      return;
    }
    setTranslating(true);
    const toastId = toast.loading('AI 正在智能翻译商品标题及核心详情...');
    setTimeout(() => {
      setTranslating(false);
      setIsTranslated(true);
      toast.success('翻译完成！已成功切换至中文本地化展示', { id: toastId });
    }, 1000);
  };

  const handleTriggerImageSearch = () => {
    imageSearchInputRef.current?.click();
  };

  const handleImageSearchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSearchPreview(reader.result as string);
        setIsSearchingByImage(true);
        setImageSearchProgress(0);
        
        let progress = 0;
        const interval = setInterval(() => {
          progress += 8;
          if (progress >= 100) {
            clearInterval(interval);
            setImageSearchProgress(100);
            setTimeout(() => {
              setIsSearchingByImage(false);
              setHasActiveImageSearch(true);
              toast.success('🎉 图搜匹配成功！已为您筛选出同款相似的美妆商品。');
            }, 400);
          } else {
            setImageSearchProgress(progress);
          }
        }, 120);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImageSearch = () => {
    setHasActiveImageSearch(false);
    setImageSearchPreview(null);
    if (imageSearchInputRef.current) {
      imageSearchInputRef.current.value = '';
    }
    toast.info('已重置商品列表');
  };
  
  // ── 基础搜索 & 过滤状态 ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedShopType, setSelectedShopType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('active'); // 默认在售
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // 展开分类状态
  const [showAllCategories, setShowAllCategories] = useState(false);

  // ── 指标下拉筛选状态 ──────────────────────────────────────────────────────
  const [minCommission, setMinCommission] = useState('all');
  const [minSales7d, setMinSales7d] = useState('all');
  const [minTotalSales, setMinTotalSales] = useState('all');

  // ── SKU库存对话框状态 ─────────────────────────────────────────────────────
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [selectedSkuProduct, setSelectedSkuProduct] = useState<SelectableProduct | null>(null);

  // ── 已导入 Supabase 商品 ID 记录 ──────────────────────────────────────────
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [importingId, setImportingId] = useState<string | null>(null);

  // ── 加载用户现有的商品 (用于去重与显示“已导入”) ───────────────────────────
  const fetchExistingProducts = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .eq('user_id', user.id);
      
      if (!error && data) {
        const existingNames = new Set(data.map(p => p.name));
        const matchedIds = new Set<string>();
        for (const item of MOCK_SELECTION_POOL) {
          if (existingNames.has(item.name)) {
            matchedIds.add(item.id);
          }
        }
        setImportedIds(matchedIds);
      }
    } catch (err) {
      console.error('Error fetching user products:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchExistingProducts();
  }, [fetchExistingProducts]);

  // ── 切换商品类型勾选 ──────────────────────────────────────────────────────
  const toggleProductType = (type: string) => {
    setSelectedProductTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // ── 执行商品导入到个人商品库 ────────────────────────────────────────────────
  const handleImportProduct = async (item: SelectableProduct) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    setImportingId(item.id);
    try {
      // 检查是否已经存在
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('name', item.name)
        .eq('user_id', user.id);

      if (existing && existing.length > 0) {
        toast.info('该商品已存在于您的商品管理中');
        setImportedIds(prev => new Set([...prev, item.id]));
        return;
      }

      // 映射到商品管理的常规分类
      let targetCategory = '其他';
      if (item.category.includes('美妆') || item.category.includes('个护')) targetCategory = '美妆护肤';
      else if (item.category.includes('服装') || item.category.includes('内衣')) targetCategory = '服装配饰';
      else if (item.category.includes('数码') || item.category.includes('手机')) targetCategory = '数码电器';
      else if (item.category.includes('家居') || item.category.includes('日用')) targetCategory = '家居用品';
      else if (item.category.includes('食品') || item.category.includes('饮料')) targetCategory = '食品饮料';
      else if (item.category.includes('运动') || item.category.includes('户外')) targetCategory = '运动户外';
      else if (item.category.includes('母婴') || item.category.includes('玩具')) targetCategory = '母婴用品';

      const payload = {
        user_id: user.id,
        name: isTranslated ? (TRANSLATIONS[item.id] || item.name) : item.name,
        category: targetCategory,
        sub_category: item.category,
        description: `【智能选品导入】来自${item.country}店铺 ${item.shop_name} 的爆款商品。7天销量达 ${item.sales_7d}。`,
        selling_points: ['跨境高出单率爆品', `带货达人推荐（已关联${item.associated_influencers}人）`, `佣金比例：${item.commission_rate}%`],
        original_price: item.original_price,
        sale_price: item.sale_price,
        stock: item.stock,
        specs: [
          { name: '地区', value: item.country },
          { name: '佣金率', value: `${item.commission_rate}%` },
          { name: '店铺', value: item.shop_name }
        ],
        images: [item.cover_image],
        cover_image: item.cover_image,
        status: 'active',
        sales_count: 0
      };

      const { error } = await supabase.from('products').insert(payload);
      if (error) {
        toast.error('导入失败：' + error.message);
      } else {
        toast.success('🎉 导入成功！已添加到“商品管理”');
        setImportedIds(prev => new Set([...prev, item.id]));
      }
    } catch (err: any) {
      toast.error('导入出错：' + err.message);
    } finally {
      setImportingId(null);
    }
  };

  // ── 计算过滤结果 ──────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return MOCK_SELECTION_POOL.filter(item => {
      // 图搜同款过滤 (只展示美妆个护分类商品作为匹配结果)
      if (hasActiveImageSearch && item.category !== '美妆个护') return false;

      // 搜索框过滤
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const displayName = isTranslated ? (TRANSLATIONS[item.id] || item.name) : item.name;
        const matchName = displayName.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
        const matchCategory = item.category.toLowerCase().includes(query);
        const matchShop = item.shop_name.toLowerCase().includes(query);
        if (!matchName && !matchCategory && !matchShop) return false;
      }

      // 国家/地区过滤
      if (selectedRegion !== 'all' && item.country !== selectedRegion) return false;

      // 分类过滤
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // 店铺类型过滤
      if (selectedShopType !== 'all' && item.shop_type !== selectedShopType) return false;

      // 商品状态过滤
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;

      // 商品类型过滤 (CheckBoxes)
      if (selectedProductTypes.length > 0) {
        const matchesType = selectedProductTypes.some(type => {
          if (type === 'new') return item.product_type === 'new';
          if (type === 'free_shipping') return item.product_type === 'free_shipping';
          if (type === 'local_warehouse') return item.product_type === 'local_warehouse';
          if (type === 'hot') return item.product_type === 'hot';
          return false;
        });
        if (!matchesType) return false;
      }

      // 佣金率过滤
      if (minCommission !== 'all') {
        const minComm = parseInt(minCommission);
        if (item.commission_rate < minComm) return false;
      }

      // 7天销量过滤
      if (minSales7d !== 'all') {
        const minS = parseInt(minSales7d);
        if (item.sales_7d_raw < minS) return false;
      }

      // 总销量过滤
      if (minTotalSales !== 'all') {
        const minT = parseInt(minTotalSales);
        if (item.total_sales_raw < minT) return false;
      }

      return true;
    });
  }, [
    searchQuery,
    selectedRegion,
    selectedCategory,
    selectedShopType,
    selectedStatus,
    selectedProductTypes,
    minCommission,
    minSales7d,
    minTotalSales,
    isTranslated,
    hasActiveImageSearch
  ]);

  // ── CSV 数据导出 ──────────────────────────────────────────────────────────
  const handleExportData = () => {
    if (filteredProducts.length === 0) {
      toast.error('暂无数据可导出');
      return;
    }
    const headers = ['商品名称', '分类', '售价', '国家/地区', '佣金比例', '所属店铺', '店铺销量', '近7天销量', '总销量', '关联达人'];
    const rows = filteredProducts.map(item => [
      item.name,
      item.category,
      `${item.currency}${item.sale_price}`,
      item.country,
      `${item.commission_rate}%`,
      item.shop_name,
      item.shop_sales,
      item.sales_7d,
      item.total_sales,
      item.associated_influencers
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `智能选品数据_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`成功导出 ${filteredProducts.length} 条选品数据`);
  };

  // ── 渲染 Sparkline 趋势折线图 ───────────────────────────────────────────────
  const renderSparkline = (data: number[]) => {
    if (!data || data.length === 0) return null;
    const width = 110;
    const height = 36;
    const padding = 2;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const fillD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#trend-grad)" />
        <path d={pathD} fill="none" stroke="#ec4899" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── 头部标题 ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-balance text-rose-600 dark:text-rose-400">
            <Sparkles className="w-6 h-6 animate-pulse" /> 智能选品
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            汇聚全球电商爆款，大数据实时追踪，一键导入商品并创作AIGC带货视频
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/30 dark:text-rose-400" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-1.5" /> 数据导出
          </Button>
        </div>
      </div>

      {/* ── 搜索栏 ────────────────────────────────────────────────────────── */}
      <div className="bg-card/75 border border-rose-100 dark:border-rose-950/20 backdrop-blur-md rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="商品搜索（输入商品名、分类或店铺进行检索）"
              className="pl-9 pr-3 h-11 border-rose-100 dark:border-rose-950/30 focus-visible:ring-rose-500 rounded-xl"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <input
              type="file"
              ref={imageSearchInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSearchUpload}
            />
            <Button
              variant={isTranslated ? "default" : "outline"}
              onClick={handleTranslateToggle}
              disabled={translating}
              className={cn(
                "h-11 px-4 gap-2 border-rose-100 dark:border-rose-950/30 text-xs font-medium rounded-xl transition-all",
                isTranslated
                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                  : "hover:bg-rose-50 hover:text-rose-600"
              )}
            >
              {translating ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              ) : (
                <Languages className="w-4 h-4 text-rose-500" />
              )}
              <span>{isTranslated ? '显示英文' : '翻译中文'}</span>
            </Button>
            <Button
              onClick={handleTriggerImageSearch}
              className="h-11 px-5 gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white border-0 font-medium rounded-xl shadow-md shadow-rose-500/25 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>图搜同款</span>
            </Button>
          </div>
        </div>

        {/* ── 过滤器面板 ────────────────────────────────────────────────────── */}
        <div className="space-y-3.5 pt-2 text-sm border-t border-rose-100/50 dark:border-rose-950/10">
          {/* 国家/地区 */}
          <div className="flex flex-wrap items-start gap-2">
            <span className="text-muted-foreground w-20 shrink-0 py-1.5 font-medium">国家/地区:</span>
            <div className="flex-1 flex flex-wrap gap-1.5">
              {REGIONS.map(reg => (
                <button
                  key={reg.value}
                  onClick={() => setSelectedRegion(reg.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                    selectedRegion === reg.value
                      ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                  )}
                >
                  {reg.label}
                  {reg.isNew && (
                    <span className="text-[9px] bg-emerald-500 text-white font-bold px-1 rounded-sm scale-90 leading-none py-0.5">NEW</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 商品分类 */}
          <div className="flex flex-wrap items-start gap-2">
            <span className="text-muted-foreground w-20 shrink-0 py-1.5 font-medium">商品分类:</span>
            <div className="flex-1 flex flex-wrap gap-1.5 items-center">
              {(showAllCategories ? CATEGORIES : CATEGORIES.slice(0, 8)).map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all",
                    selectedCategory === cat.value
                      ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                  )}
                >
                  {cat.label}
                </button>
              ))}
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-xs text-rose-500 font-semibold hover:underline flex items-center ml-2 py-1"
              >
                {showAllCategories ? '收起 ^' : '展开 v'}
              </button>
            </div>
          </div>

          {/* 店铺类型 & 商品状态 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0 font-medium">店铺类型:</span>
              <div className="flex gap-1.5">
                {SHOP_TYPES.map(st => (
                  <button
                    key={st.value}
                    onClick={() => setSelectedShopType(st.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      selectedShopType === st.value
                        ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                        : "bg-muted/50 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0 font-medium">商品状态:</span>
              <div className="flex gap-1.5">
                {PRODUCT_STATUSES.map(ps => (
                  <button
                    key={ps.value}
                    onClick={() => setSelectedStatus(ps.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      selectedStatus === ps.value
                        ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                        : "bg-muted/50 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                    )}
                  >
                    {ps.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 商品类型 Checkboxes */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground w-20 shrink-0 font-medium font-medium">商品类型:</span>
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { id: 'new', label: '上新商品' },
                { id: 'free_shipping', label: '包邮商品' },
                { id: 'local_warehouse', label: '本地仓商品' },
                { id: 'hot', label: '爆款商品' }
              ].map(type => (
                <label key={type.id} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-muted-foreground hover:text-rose-600">
                  <input
                    type="checkbox"
                    checked={selectedProductTypes.includes(type.id)}
                    onChange={() => toggleProductType(type.id)}
                    className="rounded border-rose-300 text-rose-500 focus:ring-rose-500 h-4 w-4"
                  />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 上架时间 & 多重过滤下拉框 */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* 上架时间 */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0 font-medium">上架时间:</span>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  className="px-2 py-1 text-xs border border-rose-100 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 bg-background"
                  value={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-muted-foreground text-xs">→</span>
                <input
                  type="date"
                  className="px-2 py-1 text-xs border border-rose-100 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 bg-background"
                  value={dateRange.end}
                  onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>

            {/* 多重过滤下拉框 */}
            <div className="flex flex-wrap gap-2 flex-1 md:justify-end">
              <Select value={minCommission} onValueChange={setMinCommission}>
                <SelectTrigger className="w-32 h-8 text-xs border-rose-100 bg-background">
                  <SelectValue placeholder="佣金比例" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">佣金比例: 全部</SelectItem>
                  <SelectItem value="5">5% 及以上</SelectItem>
                  <SelectItem value="10">10% 及以上</SelectItem>
                  <SelectItem value="15">15% 及以上</SelectItem>
                </SelectContent>
              </Select>

              <Select value={minSales7d} onValueChange={setMinSales7d}>
                <SelectTrigger className="w-32 h-8 text-xs border-rose-100 bg-background">
                  <SelectValue placeholder="近7天销量" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">近7天销量: 全部</SelectItem>
                  <SelectItem value="10000">1万及以上</SelectItem>
                  <SelectItem value="50000">5万及以上</SelectItem>
                  <SelectItem value="100000">10万及以上</SelectItem>
                </SelectContent>
              </Select>

              <Select value={minTotalSales} onValueChange={setMinTotalSales}>
                <SelectTrigger className="w-32 h-8 text-xs border-rose-100 bg-background">
                  <SelectValue placeholder="总销量" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">总销量: 全部</SelectItem>
                  <SelectItem value="100000">10万及以上</SelectItem>
                  <SelectItem value="1000000">100万及以上</SelectItem>
                  <SelectItem value="3000000">300万及以上</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger className="w-32 h-8 text-xs border-rose-100 bg-background">
                  <SelectValue placeholder="带货达人人数" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">带货达人: 全部</SelectItem>
                  <SelectItem value="100">100人以上</SelectItem>
                  <SelectItem value="1000">1000人以上</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {hasActiveImageSearch && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/15 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
            {imageSearchPreview && (
              <img src={imageSearchPreview} className="w-8 h-8 object-cover rounded-md border border-rose-200" alt="Search source" />
            )}
            <div>
              <span className="font-semibold">已启用图搜同款过滤</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">正在为您展示与上传图片视觉特征最相似的商品货源</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearImageSearch}
            className="h-8 px-2.5 text-rose-600 hover:bg-rose-100/50 hover:text-rose-700 font-semibold"
          >
            <X className="w-3.5 h-3.5 mr-1" /> 重置筛选
          </Button>
        </div>
      )}

      {/* ── 商品列表表格 ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-rose-100 dark:border-rose-950/20 rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-rose-50/50 dark:bg-rose-950/10">
            <TableRow className="border-rose-100/50 dark:border-rose-950/10">
              <TableHead className="text-xs font-semibold py-4 w-[280px]">商品</TableHead>
              <TableHead className="text-xs font-semibold py-4 w-[160px]">所属店铺</TableHead>
              <TableHead className="text-xs font-semibold py-4 w-[100px] text-center">达人出单率</TableHead>
              <TableHead className="text-xs font-semibold py-4 w-[130px] text-center">近7天销量趋势</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center text-rose-500">近7天销量</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center">近7天销售额</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center">总销量</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center">总销售额</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center">关联达人</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center w-[120px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                  没有找到符合过滤条件的爆款选品，请尝试调整搜索词或筛选条件。
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map(item => {
                const isImported = importedIds.has(item.id);
                return (
                  <TableRow key={item.id} className="border-rose-100/40 hover:bg-rose-50/10 dark:border-rose-950/5 transition-colors">
                    {/* 商品主体列 */}
                    <TableCell className="py-4">
                      <div className="flex gap-3">
                        <img
                          src={item.cover_image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-xl border border-rose-100/50 dark:border-rose-950/10 shrink-0 bg-muted"
                          onError={e => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1582966772680-860e372bb558?w=200';
                          }}
                        />
                        <div className="flex flex-col justify-between min-w-0">
                          <p className="text-xs font-semibold leading-tight text-foreground line-clamp-2 hover:text-rose-500 transition-colors" title={isTranslated ? (TRANSLATIONS[item.id] || item.name) : item.name}>
                            {isTranslated ? (TRANSLATIONS[item.id] || item.name) : item.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-xs font-bold text-rose-500">
                              售价: {item.currency}{item.sale_price}
                            </span>
                            <span className="text-[10px] text-muted-foreground line-through">
                              {item.currency}{item.original_price}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-rose-50 text-rose-600 dark:bg-rose-950/20 border-0 flex items-center gap-0.5">
                              <span>{item.country_flag}</span>
                              <span>{item.country}</span>
                            </Badge>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-yellow-50 text-yellow-600 dark:bg-yellow-950/20 border-0 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500 shrink-0" />
                              <span>{item.rating}</span>
                            </Badge>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 border-0">
                              佣金: {item.commission_rate}%
                            </Badge>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedSkuProduct(item);
                              setSkuModalOpen(true);
                            }}
                            className="text-[10px] text-rose-500 font-semibold hover:underline mt-1 text-left w-fit flex items-center gap-0.5"
                          >
                            <Eye className="w-3 h-3" /> SKU库存
                          </button>
                        </div>
                      </div>
                    </TableCell>

                    {/* 所属店铺 */}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.shop_logo}
                          alt={item.shop_name}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-muted bg-muted"
                          onError={e => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate" title={item.shop_name}>
                            {item.shop_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            店铺销量: {item.shop_sales}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* 达人出单率 */}
                    <TableCell className="py-4 text-center text-xs font-medium text-foreground">
                      {item.influencer_rate}
                    </TableCell>

                    {/* 近7天销量趋势 */}
                    <TableCell className="py-4 text-center">
                      <div className="inline-block">
                        {renderSparkline(item.trend_data)}
                      </div>
                    </TableCell>

                    {/* 近7天销量 */}
                    <TableCell className="py-4 text-center text-sm font-bold text-rose-500 dark:text-rose-400">
                      {item.sales_7d}
                    </TableCell>

                    {/* 近7天销售额 */}
                    <TableCell className="py-4 text-center text-xs text-muted-foreground">
                      {item.revenue_7d}
                    </TableCell>

                    {/* 总销量 */}
                    <TableCell className="py-4 text-center text-xs font-medium text-foreground">
                      {item.total_sales}
                    </TableCell>

                    {/* 总销售额 */}
                    <TableCell className="py-4 text-center text-xs text-muted-foreground">
                      {item.total_revenue}
                    </TableCell>

                    {/* 关联达人 */}
                    <TableCell className="py-4 text-center text-xs font-medium text-foreground">
                      {item.associated_influencers}
                    </TableCell>

                    {/* 操作列 */}
                    <TableCell className="py-4 text-center">
                      <div className="flex flex-col gap-1.5 items-center justify-center">
                        {isImported ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-20 text-[11px] border-emerald-500 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 cursor-default"
                              disabled
                            >
                              <Check className="w-3.5 h-3.5 mr-0.5" /> 已导入
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 w-20 text-[11px] bg-rose-500 hover:bg-rose-600 text-white shadow-sm flex items-center justify-center gap-0.5"
                              onClick={() => {
                                // 带着商品名称去生成视频
                                navigate('/video/create', { state: { prefillProductName: item.name } });
                              }}
                            >
                              <Video className="w-3 h-3" /> 去带货
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            disabled={importingId === item.id}
                            className="h-8 w-20 text-[11px] bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white border-0 font-medium rounded-md shadow-sm"
                            onClick={() => handleImportProduct(item)}
                          >
                            {importingId === item.id ? '导入中...' : '一键导入'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── SKU库存详情弹窗 ───────────────────────────────────────────────── */}
      <Dialog open={skuModalOpen} onOpenChange={setSkuModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Info className="w-5 h-5 text-rose-500" /> SKU库存详情
            </DialogTitle>
          </DialogHeader>
          {selectedSkuProduct && (
            <div className="space-y-4 py-2">
              <div className="flex gap-3 pb-3 border-b border-rose-100/50 dark:border-rose-950/15">
                <img
                  src={selectedSkuProduct.cover_image}
                  className="w-12 h-12 object-cover rounded-lg bg-muted"
                  alt=""
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold line-clamp-1">{selectedSkuProduct.name}</p>
                  <p className="text-[11px] text-rose-500 font-bold mt-1">
                    在售售价: {selectedSkuProduct.currency}{selectedSkuProduct.sale_price}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">规格明细</p>
                <div className="divide-y divide-rose-100/30 border border-rose-100/30 rounded-xl overflow-hidden text-xs">
                  <div className="flex justify-between p-2.5 bg-muted/40 font-medium text-muted-foreground">
                    <span>规格名称</span>
                    <span>库存数量</span>
                  </div>
                  <div className="flex justify-between p-2.5 hover:bg-muted/10">
                    <span>标准版 / 经典配色</span>
                    <span className="font-semibold">{Math.round(selectedSkuProduct.stock * 0.4)} 件</span>
                  </div>
                  <div className="flex justify-between p-2.5 hover:bg-muted/10">
                    <span>升级版 / 极客灰</span>
                    <span className="font-semibold">{Math.round(selectedSkuProduct.stock * 0.35)} 件</span>
                  </div>
                  <div className="flex justify-between p-2.5 hover:bg-muted/10">
                    <span>至尊版 / 幻影黑</span>
                    <span className="font-semibold">{Math.round(selectedSkuProduct.stock * 0.25)} 件</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center bg-rose-50/50 dark:bg-rose-950/10 p-3 rounded-xl border border-rose-100/30">
                <span className="text-xs text-muted-foreground">总库存数量:</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {selectedSkuProduct.stock.toLocaleString()} 件
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="w-full h-9 text-xs rounded-xl" onClick={() => setSkuModalOpen(false)}>
              关闭窗口
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 图搜扫描动画弹窗 ──────────────────────────────────────────────── */}
      <Dialog open={isSearchingByImage} onOpenChange={setIsSearchingByImage}>
        <DialogContent className="max-w-xs rounded-2xl bg-zinc-950 border border-zinc-800/80 p-6 flex flex-col items-center justify-center text-center">
          <DialogHeader className="w-full">
            <DialogTitle className="text-sm font-bold text-zinc-200 flex items-center justify-center gap-1.5">
              <Camera className="w-4 h-4 text-rose-500 animate-pulse" /> 智能以图搜款
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 relative w-32 h-32 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
            {imageSearchPreview ? (
              <img src={imageSearchPreview} className="w-full h-full object-cover" alt="Searching" />
            ) : (
              <Camera className="w-8 h-8 text-zinc-600" />
            )}
            
            {/* 扫描线动画 */}
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent top-0 animate-[scan_2s_ease-in-out_infinite]" style={{ animation: 'scan 2s ease-in-out infinite' }} />
            <div className="absolute inset-0 bg-rose-500/5 pointer-events-none" />
          </div>

          <div className="mt-4 w-full space-y-1">
            <p className="text-xs text-zinc-400 font-medium">AI 正在提取视觉特征并在全球供应链检索...</p>
            <div className="flex justify-between text-[10px] text-zinc-500 px-1 pt-1.5">
              <span>检索中...</span>
              <span>{imageSearchProgress}%</span>
            </div>
            {/* 进度条 */}
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-150"
                style={{ width: `${imageSearchProgress}%` }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
