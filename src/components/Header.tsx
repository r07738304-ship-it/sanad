import React from 'react';
import { Heart, Search, Lock, UserCheck, CalendarPlus } from 'lucide-react';

interface HeaderProps {
  activeTab: 'fighter' | 'volunteer' | 'admin';
  setActiveTab: (tab: 'fighter' | 'volunteer' | 'admin') => void;
  onOpenLookupModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenLookupModal,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF7F5]/95 backdrop-blur-md border-b border-stone-200/70">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => setActiveTab('fighter')}
          className="flex items-center gap-2 text-rose-800 hover:text-rose-900 transition-colors text-right"
          aria-label="سند - الرئيسية"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-xs">
            <Heart className="w-4 h-4 fill-white text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight font-sans text-stone-900">
            سند
          </span>
        </button>

        {/* Zone 2: Navigation Links (single line, unboxed, text with hover underlines/subtle active indicator) */}
        <nav className="flex items-center gap-1 sm:gap-4 text-xs sm:text-sm font-medium text-stone-600">
          <button
            onClick={() => setActiveTab('fighter')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'fighter'
                ? 'text-rose-800 font-bold bg-rose-100/70'
                : 'hover:text-stone-900 hover:bg-stone-100/70'
            }`}
          >
            <CalendarPlus className="w-3.5 h-3.5 text-rose-600" />
            <span>حجز موعد</span>
          </button>

          <button
            onClick={() => setActiveTab('volunteer')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'volunteer'
                ? 'text-rose-800 font-bold bg-rose-100/70'
                : 'hover:text-stone-900 hover:bg-stone-100/70'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>بوابة المتطوعة</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'admin'
                ? 'text-rose-800 font-bold bg-rose-100/70'
                : 'hover:text-stone-900 hover:bg-stone-100/70'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-stone-500" />
            <span>لوحة الإدارة</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action / Erase or Lookup Data */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLookupModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors whitespace-nowrap shadow-2xs"
            title="متابعة الحجز أو مسح البيانات"
          >
            <Search className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">متابعة / امسحي بياناتي</span>
            <span className="sm:hidden">استعلام</span>
          </button>
        </div>
      </div>
    </header>
  );
};
