import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, User, Phone, Check } from 'lucide-react';

export function MemberSearchSelect({
  members = [],
  value = '',
  onChange,
  placeholder = 'Search & select member...',
  required = false,
  disabled = false,
  className = '',
  id = 'member-search-select'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize ID helper
  const cleanId = (idVal) => String(idVal || '').replace(/\D/g, '');

  // Extract raw string value if value is an event object
  const resolvedValue = typeof value === 'object' && value !== null && value.target ? value.target.value : value;

  // Find currently selected member
  const selectedMember = members.find(
    (m) => String(m.id) === String(resolvedValue) || cleanId(m.id) === cleanId(resolvedValue)
  );

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filtered members based on typed search query
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (m.name || '').toLowerCase();
    const phone = (m.phone || '').toLowerCase();
    const email = (m.email || '').toLowerCase();
    const memberId = String(m.id || '').toLowerCase();
    const plan = (m.planName || m.plan || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || email.includes(q) || memberId.includes(q) || plan.includes(q);
  });

  const handleSelect = (member) => {
    if (onChange) {
      const idVal = member ? member.id : '';
      const eventObj = {
        target: { name: 'memberId', value: idVal },
        member,
        toString() { return String(idVal); },
        valueOf() { return idVal; }
      };
      onChange(eventObj);
    }
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      const eventObj = {
        target: { name: 'memberId', value: '' },
        member: null,
        toString() { return ''; },
        valueOf() { return ''; }
      };
      onChange(eventObj);
    }
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required={required}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Main interactive combobox box */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen && inputRef.current) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        className={`w-full min-h-[44px] px-3.5 py-2 bg-slate-50 border rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all duration-200 ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              id={id}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type member name, phone or ID..."
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : selectedMember ? (
            <div className="flex items-center gap-2 truncate text-left">
              <span className="font-semibold text-sm text-slate-900 truncate">
                {selectedMember.name}
              </span>
              {selectedMember.phone && (
                <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {selectedMember.phone}
                </span>
              )}
              {selectedMember.planName && (
                <span className="text-[11px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md shrink-0">
                  {selectedMember.planName}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedMember && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200/80 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Quick Header */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
            <span>Members ({filteredMembers.length})</span>
            {searchQuery && (
              <span className="text-emerald-600">Matching "{searchQuery}"</span>
            )}
          </div>

          {/* Members List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100/80">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">
                No members found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isSelected =
                  String(member.id) === String(value) ||
                  cleanId(member.id) === cleanId(value);

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelect(member)}
                    className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors duration-150 ${
                      isSelected
                        ? 'bg-emerald-50/80 hover:bg-emerald-100/70 text-emerald-950'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          member.name?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate flex items-center gap-2">
                          <span className="truncate">{member.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded">
                            {member.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 truncate">
                          {member.phone && <span>{member.phone}</span>}
                          {member.planName && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-medium truncate">
                                {member.planName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {member.status && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            member.status.toLowerCase().includes('active')
                              ? 'bg-emerald-100 text-emerald-700'
                              : member.status.toLowerCase().includes('frozen')
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {member.status}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberSearchSelect;
