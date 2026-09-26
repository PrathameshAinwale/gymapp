import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import {
  ShoppingBag,
  Search,
  Plus,
  Filter,
  ChevronDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
  Tag,
  Trash2,
  Edit2,
  ShoppingCart,
  IndianRupee,
  Layers,
  Loader2,
  RotateCw,
  X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import {
  hasSqlInjection,
  sanitizeDigits,
  sanitizeDecimal,
  preventNonNumericKey
} from '../../utils/validation';

const ProductImage = ({ src, alt, category }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
        <Package className="w-10 h-10 sm:w-12 sm:h-12 stroke-[1.5] text-slate-400 mb-1" />
        <span className="text-[10px] font-medium text-slate-500 tracking-wide uppercase">{category || 'Product'}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
      onError={() => setHasError(true)}
    />
  );
};

export const ProductsManager = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    recordProductSale,
    members,
    fetchProducts,
    fetchMembers,
    addToast
  } = useGymData();

  useEffect(() => {
    fetchProducts?.();
    fetchMembers?.();
  }, [fetchProducts, fetchMembers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [priceRangeFilter, setPriceRangeFilter] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingSell, setIsSubmittingSell] = useState(false);
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);
  const [sellingProduct, setSellingProduct] = useState(null);
  const [restockingProduct, setRestockingProduct] = useState(null);
  const [restockAmount, setRestockAmount] = useState(10);

  // Form State for New Product
  const [formData, setFormData] = useState({
    name: '',
    category: 'Supplements',
    sku: 'SUP-' + Math.floor(100 + Math.random() * 900),
    price: 999,
    costPrice: 650,
    stock: 20,
    minStockAlert: 5,
    image: '',
    description: ''
  });

  // Sell Form State
  const [sellQuantity, setSellQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState(members[0]?.name || 'Walk-in Customer');
  const [sellPaymentMethod, setSellPaymentMethod] = useState('UPI');

  // KPI Calculations
  const totalProducts = products.length;
  const totalStockCount = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const totalInventoryValue = products.reduce(
    (acc, p) => acc + (Number(p.price) || 0) * (Number(p.stock) || 0),
    0
  );
  const lowStockCount = products.filter(
    (p) => Number(p.stock) <= Number(p.minStockAlert || 5) && Number(p.stock) > 0
  ).length;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'ALL') count++;
    if (stockStatusFilter !== 'ALL') count++;
    if (priceRangeFilter !== 'ALL') count++;
    return count;
  }, [categoryFilter, stockStatusFilter, priceRangeFilter]);

  const handleResetFilters = () => {
    setCategoryFilter('ALL');
    setStockStatusFilter('ALL');
    setPriceRangeFilter('ALL');
    setSearchTerm('');
  };

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase().trim();
    return products
      .filter((p) =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.sku || '').toLowerCase().includes(term) ||
        (p.category || '').toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [searchTerm, products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (p.category || '').toLowerCase().includes(searchTerm.toLowerCase().trim());

      if (!matchesSearch) return false;

      if (categoryFilter !== 'ALL' && (p.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      if (stockStatusFilter !== 'ALL') {
        const stock = Number(p.stock) || 0;
        const minAlert = Number(p.minStockAlert || 5);
        if (stockStatusFilter === 'IN_STOCK' && stock <= minAlert) return false;
        if (stockStatusFilter === 'LOW_STOCK' && (stock > minAlert || stock <= 0)) return false;
        if (stockStatusFilter === 'OUT_OF_STOCK' && stock > 0) return false;
      }

      if (priceRangeFilter !== 'ALL') {
        const price = Number(p.price) || 0;
        if (priceRangeFilter === 'UNDER_500' && price >= 500) return false;
        if (priceRangeFilter === '500_1500' && (price < 500 || price > 1500)) return false;
        if (priceRangeFilter === 'OVER_1500' && price <= 1500) return false;
      }

      return true;
    });
  }, [products, searchTerm, categoryFilter, stockStatusFilter, priceRangeFilter]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (hasSqlInjection(formData.name) || hasSqlInjection(formData.sku) || hasSqlInjection(formData.description)) {
      addToast?.('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }
    if (!formData.name) return;

    try {
      setIsSubmittingAdd(true);
      await addProduct({
        ...formData,
        price: Number(formData.price),
        costPrice: Number(formData.costPrice),
        stock: Number(formData.stock),
        minStockAlert: Number(formData.minStockAlert)
      });

      setIsAddModalOpen(false);
      setFormData({
        name: '',
        category: 'Supplements',
        sku: 'SUP-' + Math.floor(100 + Math.random() * 900),
        price: 999,
        costPrice: 650,
        stock: 20,
        minStockAlert: 5,
        image: '',
        description: ''
      });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (hasSqlInjection(buyerName)) {
      addToast?.('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }
    if (!sellingProduct) return;

    try {
      setIsSubmittingSell(true);
      const success = await recordProductSale({
        productId: sellingProduct.id,
        quantity: Number(sellQuantity),
        buyerName: buyerName || 'Walk-in Customer',
        paymentMethod: sellPaymentMethod
      });

      if (success) {
        setSellingProduct(null);
        setSellQuantity(1);
      }
    } finally {
      setIsSubmittingSell(false);
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockingProduct) return;

    try {
      setIsSubmittingRestock(true);
      await updateProduct(restockingProduct.id, {
        stock: Number(restockingProduct.stock) + Number(restockAmount)
      });
      setRestockingProduct(null);
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">Pro Shop & Inventory</h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Manage inventory and retail sales of gym supplements, protein, merchandise, lifting gear, and beverages.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="inline sm:hidden">Add Item</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Active SKUs</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{totalProducts}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">Catalog items</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">In Stock</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">{totalStockCount}</div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium hidden sm:block">Units on hand</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Retail Value</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">₹{totalInventoryValue.toLocaleString('en-IN')}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">At retail price</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Low Stock</span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1">{lowStockCount}</div>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium hidden sm:block">Need reordering</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Autocomplete Search Bar */}
          <div ref={searchContainerRef} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setIsSearchDropdownOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              placeholder="Search products by name, SKU, or category..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setIsSearchDropdownOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Autocomplete Suggestions Dropdown */}
            {isSearchDropdownOpen && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Product Suggestions
                </div>
                {searchSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchTerm(item.name || '');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50/60 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="text-[10px] text-slate-400">({item.sku})</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      ₹{item.price}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons: Filter */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFiltersCount > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Chips & Clear Action */}
        {(activeFiltersCount > 0 || searchTerm) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
            <span className="text-slate-400 font-medium">Active:</span>

            {categoryFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Category: {categoryFilter}
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ALL')}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {stockStatusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Stock: {stockStatusFilter === 'IN_STOCK' ? 'In Stock' : stockStatusFilter === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock'}
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('ALL')}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {priceRangeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Price: {priceRangeFilter === 'UNDER_500' ? '< ₹500' : priceRangeFilter === '500_1500' ? '₹500 - ₹1500' : '> ₹1500'}
                <button
                  type="button"
                  onClick={() => setPriceRangeFilter('ALL')}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                "{searchTerm}"
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium ml-1 cursor-pointer"
            >
              Reset all
            </button>

            <span className="ml-auto text-[11px] text-slate-400">
              Showing {filteredProducts.length} of {products.length} products
            </span>
          </div>
        )}
      </div>

      {/* Product Catalog Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <EmptyState
            icon={ShoppingBag}
            title={searchTerm || activeFiltersCount > 0 ? "No matching products found" : "No Products in Store"}
            description={
              searchTerm || activeFiltersCount > 0
                ? "No inventory items match your current search or filters. Try resetting filters or adding a new product."
                : "Add supplements, gym accessories, protein snacks, and fitness gear to your gym's retail pro shop."
            }
            actionText="Add New Product"
            onAction={() => setIsAddModalOpen(true)}
            secondaryActionText={searchTerm || activeFiltersCount > 0 ? "Clear Filters" : undefined}
            onSecondaryAction={searchTerm || activeFiltersCount > 0 ? handleResetFilters : undefined}
            color="emerald"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-5">
          {filteredProducts.map((p) => {
            const isOutOfStock = Number(p.stock) <= 0;
            const isLowStock = Number(p.stock) <= Number(p.minStockAlert || 5) && !isOutOfStock;
            const profitMargin =
              p.costPrice > 0 ? (((p.price - p.costPrice) / p.price) * 100).toFixed(0) : '—';

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Image & Badges */}
                  <div className="relative h-32 sm:h-40 w-full rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 mb-2.5 sm:mb-3 border border-slate-100">
                    <ProductImage src={p.image} alt={p.name} category={p.category} />
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-white/90 backdrop-blur-sm text-slate-800 border border-slate-200 shadow-sm">
                      {p.category}
                    </span>

                    <span
                      className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold shadow-sm ${
                        isOutOfStock
                          ? 'bg-rose-500 text-white'
                          : isLowStock
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : `${p.stock} in stock`}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-1">{p.name}</h3>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5">{p.sku}</p>
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}

                  {/* Stock, Cost, Margin Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px] sm:text-[11px] text-slate-500">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-bold">Cost</span>
                      <span className="font-semibold text-slate-700">₹{p.costPrice || 0}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-bold">Margin</span>
                      <span className="font-semibold text-emerald-600">+{profitMargin}%</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-bold">Min Alert</span>
                      <span className="font-semibold text-slate-700">{p.minStockAlert || 5}</span>
                    </div>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Selling Price</span>
                    <span className="text-base sm:text-lg font-black text-slate-900">₹{p.price}</span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSellingProduct(p);
                        setSellQuantity(1);
                        setBuyerName(members[0]?.name || 'Walk-in Customer');
                      }}
                      disabled={isOutOfStock}
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-[11px] sm:text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Sell</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRestockingProduct(p);
                        setRestockAmount(10);
                      }}
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer active:scale-95 shrink-0"
                    >
                      Restock
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProduct(p.id)}
                      className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent transition-colors cursor-pointer active:scale-95 shrink-0"
                      title="Remove product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Pro Shop Product"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Product Title *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Optimum Nutrition 100% Whey Gold Standard"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Supplements">Supplements & Protein</option>
                <option value="Accessories">Accessories & Bottles</option>
                <option value="Gear">Lifting Gear & Belts</option>
                <option value="Apparel">Gym Apparel & Merch</option>
                <option value="Drinks">Energy Drinks & Nutrition</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">SKU / Code</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                required
                min="0"
                inputMode="decimal"
                value={formData.price}
                onKeyDown={(e) => preventNonNumericKey(e, true)}
                onChange={(e) => setFormData({ ...formData, price: sanitizeDecimal(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Cost Price (₹)</label>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={formData.costPrice}
                onKeyDown={(e) => preventNonNumericKey(e, true)}
                onChange={(e) => setFormData({ ...formData, costPrice: sanitizeDecimal(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Initial Stock Count *</label>
              <input
                type="number"
                required
                min="0"
                inputMode="numeric"
                value={formData.stock}
                onKeyDown={(e) => preventNonNumericKey(e, false)}
                onChange={(e) => setFormData({ ...formData, stock: sanitizeDigits(e.target.value, 6) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Low Stock Alert Quantity</label>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={formData.minStockAlert}
                onKeyDown={(e) => preventNonNumericKey(e, false)}
                onChange={(e) => setFormData({ ...formData, minStockAlert: sanitizeDigits(e.target.value, 6) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Image URL</label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="Enter image URL (optional)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Flavor, key benefits, weight, size..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdd}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmittingAdd && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingAdd ? 'Saving...' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Sell / POS Modal */}
      <Modal
        isOpen={Boolean(sellingProduct)}
        onClose={() => setSellingProduct(null)}
        title={`Point of Sale: ${sellingProduct?.name || 'Sell Product'}`}
        maxWidth="max-w-md"
      >
        {sellingProduct && (
          <form onSubmit={handleSellSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Unit Price</span>
                <div className="text-xl font-black text-slate-900">
                  ₹{Number(sellingProduct.price).toLocaleString('en-IN')}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-white text-emerald-700 border border-emerald-200">
                Available: {sellingProduct.stock}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity to Sell *</label>
              <input
                type="number"
                required
                min="1"
                max={sellingProduct.stock}
                inputMode="numeric"
                value={sellQuantity}
                onKeyDown={(e) => preventNonNumericKey(e, false)}
                onChange={(e) => setSellQuantity(sanitizeDigits(e.target.value, 4))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer / Member Name</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Walk-in Customer or Member Name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Method</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {['UPI', 'GPay', 'PhonePe', 'Account Transfer', 'Cash', 'Card'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSellPaymentMethod(m)}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center truncate ${
                      sellPaymentMethod === m
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    title={m}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Billing Preview */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total Collection:</span>
              <span className="text-xl font-black text-emerald-600">
                ₹{(Number(sellingProduct.price) * Number(sellQuantity)).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSellingProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingSell}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {isSubmittingSell && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSubmittingSell ? 'Recording Sale...' : 'Confirm Sale & Record Receipt'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Restock Modal */}
      <Modal
        isOpen={Boolean(restockingProduct)}
        onClose={() => setRestockingProduct(null)}
        title={`Restock Inventory: ${restockingProduct?.name || ''}`}
        maxWidth="max-w-sm"
      >
        {restockingProduct && (
          <form onSubmit={handleRestockSubmit} className="space-y-4">
            <div className="text-xs text-slate-500">
              Current stock on floor: <strong className="text-slate-900">{restockingProduct.stock} units</strong>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Add Units to Inventory *</label>
              <input
                type="number"
                required
                min="1"
                inputMode="numeric"
                value={restockAmount}
                onKeyDown={(e) => preventNonNumericKey(e, false)}
                onChange={(e) => setRestockAmount(sanitizeDigits(e.target.value, 6))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRestockingProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingRestock}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {isSubmittingRestock && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSubmittingRestock ? 'Restocking...' : 'Add to Stock'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Advanced Filter Modal (Portalled to document.body) */}
      {showFilterModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Filter Products Catalog</h3>
                  <p className="text-xs text-slate-500">Refine retail inventory & products</p>
                </div>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Product Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Product Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['ALL', 'Supplements', 'Accessories', 'Gear', 'Apparel', 'Drinks'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat === 'ALL' ? 'All Categories' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Stock Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ALL', label: 'All Stock Levels' },
                    { id: 'IN_STOCK', label: 'In Stock' },
                    { id: 'LOW_STOCK', label: 'Low Stock (< 5)' },
                    { id: 'OUT_OF_STOCK', label: 'Out of Stock (0)' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStockStatusFilter(st.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                        stockStatusFilter === st.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ALL', label: 'Any Price' },
                    { id: 'UNDER_500', label: 'Under ₹500' },
                    { id: '500_1500', label: '₹500 - ₹1,500' },
                    { id: 'OVER_1500', label: 'Above ₹1,500' }
                  ].map((pr) => (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => setPriceRangeFilter(pr.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                        priceRangeFilter === pr.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
