import React, { useState } from 'react';
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
  Layers
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const ProductsManager = () => {
  const { products, addProduct, updateProduct, deleteProduct, recordProductSale, members } = useGymData();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
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

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (categoryFilter === 'ALL') return matchesSearch;
    return matchesSearch && (p.category || '').toLowerCase() === categoryFilter.toLowerCase();
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;

    addProduct({
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
      image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
      description: ''
    });
  };

  const handleSellSubmit = (e) => {
    e.preventDefault();
    if (!sellingProduct) return;

    const success = recordProductSale({
      productId: sellingProduct.id,
      quantity: Number(sellQuantity),
      buyerName: buyerName || 'Walk-in Customer',
      paymentMethod: sellPaymentMethod
    });

    if (success) {
      setSellingProduct(null);
      setSellQuantity(1);
    }
  };

  const handleRestockSubmit = (e) => {
    e.preventDefault();
    if (!restockingProduct) return;

    updateProduct(restockingProduct.id, {
      stock: Number(restockingProduct.stock) + Number(restockAmount)
    });
    setRestockingProduct(null);
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

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Add Product</span>
          <span className="inline sm:hidden">Add Item</span>
        </button>
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

      {/* Sleek Compact Search & Category Filter Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search Input Box */}
        <div className="relative flex-1 sm:w-72 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products, SKU, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-[10px] sm:placeholder:text-[11px] placeholder:text-slate-400 text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 text-[10px] font-bold cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Dropdown */}
        <div className="relative shrink-0">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs cursor-pointer"
          >
            <option value="ALL">All ({products.length})</option>
            <option value="Supplements">Supplements ({products.filter(p => p.category === 'Supplements').length})</option>
            <option value="Accessories">Accessories ({products.filter(p => p.category === 'Accessories').length})</option>
            <option value="Gear">Gear ({products.filter(p => p.category === 'Gear').length})</option>
            <option value="Apparel">Apparel ({products.filter(p => p.category === 'Apparel').length})</option>
            <option value="Drinks">Drinks ({products.filter(p => p.category === 'Drinks').length})</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Product Catalog Grid */}
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
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80';
                    }}
                  />
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
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{p.name}</h3>
                    <p className="text-[9px] sm:text-[10px] font-mono text-slate-400 mt-0.5">SKU: {p.sku}</p>
                  </div>
                </div>

                {p.description && (
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 line-clamp-2">{p.description}</p>
                )}

                {/* Pricing Details */}
                <div className="mt-2.5 sm:mt-3.5 p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block">Selling Price</span>
                    <span className="font-black text-slate-900 text-sm sm:text-base">₹{Number(p.price).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block">Cost / Margin</span>
                    <span className="font-bold text-emerald-600 text-[11px] sm:text-xs">
                      ₹{p.costPrice} <span className="text-[9px] sm:text-[10px] text-slate-500 font-normal">({profitMargin}%)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => setSellingProduct(p)}
                  className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-sm flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                  <span>Sell / POS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRestockingProduct(p)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold border border-slate-200 transition-colors cursor-pointer active:scale-95 shrink-0"
                  title="Restock units"
                >
                  + Stock
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
          );
        })}
      </div>

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
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Cost Price (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
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
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Low Stock Alert Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: e.target.value })}
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
              placeholder="https://images.unsplash.com/..."
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Save Product
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
                value={sellQuantity}
                onChange={(e) => setSellQuantity(e.target.value)}
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
              <div className="flex gap-2">
                {['UPI', 'Cash', 'Card'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSellPaymentMethod(m)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                      sellPaymentMethod === m
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Confirm Sale & Record Receipt
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
                value={restockAmount}
                onChange={(e) => setRestockAmount(e.target.value)}
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Add to Stock
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
