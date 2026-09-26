import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Calendar,
  MapPin,
  Trash2,
  Layers,
  Activity,
  ShieldCheck,
  Loader2,
  RotateCw,
  Search,
  Filter,
  X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { hasSqlInjection } from '../../utils/validation';

export const EquipmentManager = () => {
  const { equipment = [], addEquipment, updateEquipment, deleteEquipment, fetchEquipment, addToast } = useGymData();

  useEffect(() => {
    fetchEquipment?.();
  }, [fetchEquipment]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
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

  const [formData, setFormData] = useState({
    name: '',
    category: 'Free Weights & Racks',
    location: 'Zone A - Heavy Iron',
    status: 'Operational',
    condition: 'Excellent',
    nextServiceDue: '2026-11-15'
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (
      hasSqlInjection(formData.name) ||
      hasSqlInjection(formData.location) ||
      hasSqlInjection(formData.condition)
    ) {
      if (addToast) addToast('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }
    if (!formData.name) return;

    try {
      setIsSubmitting(true);
      await addEquipment({
        name: formData.name,
        category: formData.category,
        location: formData.location,
        status: formData.status,
        condition: formData.condition,
        next_service_due: formData.nextServiceDue,
        nextServiceDue: formData.nextServiceDue
      });

      setIsAddOpen(false);
      setFormData({
        name: '',
        category: 'Free Weights & Racks',
        location: 'Zone A - Heavy Iron',
        status: 'Operational',
        condition: 'Excellent',
        nextServiceDue: '2026-11-15'
      });
      if (addToast) addToast('New equipment asset registered successfully!', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = (item) => {
    const nextStatus = item.status === 'Operational' ? 'Maintenance Needed' : 'Operational';
    updateEquipment(item.id, { status: nextStatus });
    if (addToast) {
      addToast(
        nextStatus === 'Maintenance Needed'
          ? `Flagged "${item.name}" for maintenance inspection!`
          : `Marked "${item.name}" as operational!`,
        nextStatus === 'Maintenance Needed' ? 'info' : 'success'
      );
    }
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to remove "${item.name}" from your equipment inventory?`)) {
      deleteEquipment(item.id);
      if (addToast) addToast(`Removed "${item.name}" from inventory.`, 'info');
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCategory !== 'ALL') count++;
    if (filterStatus !== 'ALL') count++;
    return count;
  }, [filterCategory, filterStatus]);

  const handleResetFilters = () => {
    setFilterCategory('ALL');
    setFilterStatus('ALL');
    setSearchTerm('');
  };

  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase();
    return equipment
      .filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [equipment, searchTerm]);

  const operationalCount = equipment.filter((i) => i.status === 'Operational').length;
  const maintenanceCount = equipment.filter((i) => i.status !== 'Operational').length;

  const filteredEquipment = useMemo(() => {
    return equipment.filter((item) => {
      if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(query);
        const matchesCategory = item.category?.toLowerCase().includes(query);
        const matchesLocation = item.location?.toLowerCase().includes(query);
        const matchesCondition = item.condition?.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesLocation && !matchesCondition) return false;
      }
      return true;
    });
  }, [equipment, filterCategory, filterStatus, searchTerm]);

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Equipment & Assets
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Log machine conditions, schedule preventative servicing, and track zone floor allocations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Add Equipment Asset</span>
            <span className="inline sm:hidden">Add Asset</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Maintenance</span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1">{maintenanceCount} Pending</div>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium hidden sm:block">Routine inspections</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Assets</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{equipment.length} Units</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">Free weights & machines</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Operational</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">{operationalCount} Ready</div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium hidden sm:block">100% floor certified</span>
        </div>
      </div>

      {/* UNIFIED SEARCH & FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Autocomplete Search Bar */}
          <div ref={searchContainerRef} className="relative flex-1">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                placeholder="Search equipment by name, category, or floor zone..."
                className="w-full pl-9 pr-9 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {isSearchDropdownOpen && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden divide-y divide-slate-100">
                <div className="p-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Matching Equipment
                </div>
                {searchSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSearchTerm(item.name);
                      setIsSearchDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50/60 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({item.category})</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">{item.location}</span>
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

            {filterCategory !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Category: {filterCategory}
                <button
                  type="button"
                  onClick={() => setFilterCategory('ALL')}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Status: {filterStatus}
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
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
              Showing {filteredEquipment.length} records
            </span>
          </div>
        )}
      </div>

      {/* Equipment Cards Grid or Empty State */}
      {filteredEquipment.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-xl sm:rounded-2xl border border-dashed border-slate-200 bg-white shadow-sm">
          <Wrench className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
            {activeFiltersCount > 0 || searchTerm ? "No Matching Equipment Assets" : "No Assets Found"}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-3 max-w-sm mx-auto">
            {activeFiltersCount > 0 || searchTerm
              ? "No equipment assets match your current search and filter criteria."
              : "Add your gym's workout machines, free weights, and maintenance schedules."}
          </p>
          <div className="flex items-center justify-center gap-2">
            {activeFiltersCount > 0 || searchTerm ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Clear All Filters
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              + Add Asset
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
          {filteredEquipment.map((item) => {
            const isOperational = item.status === 'Operational';

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                    <div className="min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {item.category || 'Gym Equipment'}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-1 truncate">
                        {item.name}
                      </h3>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                        isOperational
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isOperational ? (
                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      ) : (
                        <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      )}
                      {item.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] sm:text-xs mb-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> Location:
                      </span>
                      <span className="font-semibold text-slate-800">{item.location || 'Main Floor'}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> Next Service:
                      </span>
                      <span className="font-semibold text-slate-800">{item.nextServiceDue || item.next_service_due || 'Scheduled'}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 block">Condition:</span>
                      <p className="text-slate-700 text-[11px] sm:text-xs mt-0.5 line-clamp-2">{item.condition || 'Operational & structurally sound.'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove equipment asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatus(item)}
                    className="px-2.5 py-1.5 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                  >
                    <Wrench className="w-3 h-3 text-amber-600" />
                    <span>{isOperational ? 'Flag for Maintenance' : 'Mark Operational'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD EQUIPMENT MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Gym Equipment / Asset"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Equipment / Machine Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rogue Echo Bike V3"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Free Weights & Racks">Free Weights & Racks</option>
                <option value="Cardio">Cardio</option>
                <option value="Cables & Machines">Cables & Machines</option>
                <option value="Functional / CrossFit">Functional / CrossFit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Floor Location</label>
              <input
                type="text"
                placeholder="e.g. Zone A - Cardio Deck"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Operational Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Operational">Operational</option>
                <option value="Maintenance Needed">Maintenance Needed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Next Service Due</label>
              <input
                type="date"
                value={formData.nextServiceDue}
                onChange={(e) => setFormData({ ...formData, nextServiceDue: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Condition Notes</label>
            <input
              type="text"
              placeholder="e.g. Cables replaced last month, smooth pulley glide"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Asset'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* PORTALLED FILTER MODAL */}
      {showFilterModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all animate-scaleUp">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Equipment Filters</h3>
                  <p className="text-[11px] text-slate-400">Filter by category & operational status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Category Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Equipment Category</label>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'All Categories', val: 'ALL' },
                    { label: 'Free Weights & Racks', val: 'Free Weights & Racks' },
                    { label: 'Cardio Equipment', val: 'Cardio' },
                    { label: 'Cables & Machines', val: 'Cables & Machines' },
                    { label: 'Functional / CrossFit', val: 'Functional / CrossFit' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setFilterCategory(opt.val)}
                      className={`py-2 px-3 text-left rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        filterCategory === opt.val
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Operational Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'All', val: 'ALL' },
                    { label: 'Operational', val: 'Operational' },
                    { label: 'Maintenance', val: 'Maintenance Needed' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setFilterStatus(opt.val)}
                      className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        filterStatus === opt.val
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-500 hover:text-rose-700 cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
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
