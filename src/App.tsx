import React, { useState } from 'react';
import { Header } from './components/Header';
import { EmergencyBanner } from './components/EmergencyBanner';
import { FighterJourney } from './components/FighterJourney';
import { VolunteerPortal } from './components/VolunteerPortal';
import { AdminPortal } from './components/AdminPortal';
import { BookingLookupModal } from './components/BookingLookupModal';
import { Heart, ShieldCheck, PhoneCall, HelpCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'fighter' | 'volunteer' | 'admin'>('fighter');
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF7F5] text-stone-800 flex flex-col font-sans" dir="rtl">
      {/* 1. Persistent Medical Emergency Notice Banner (Rule 1) */}
      <EmergencyBanner />

      {/* 2. Top Bar Navigation Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLookupModal={() => setIsLookupModalOpen(true)}
      />

      {/* 3. Main Content Viewport */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'fighter' && (
          <FighterJourney onDataErased={() => {}} />
        )}

        {activeTab === 'volunteer' && (
          <VolunteerPortal />
        )}

        {activeTab === 'admin' && (
          <AdminPortal />
        )}
      </main>

      {/* 4. Booking Lookup & "امسحي بياناتي" Modal */}
      <BookingLookupModal
        isOpen={isLookupModalOpen}
        onClose={() => setIsLookupModalOpen(false)}
      />

      {/* 5. Soothing, Dignified Footer */}
      <footer className="border-t border-stone-200/70 bg-white/70 py-8 px-4 sm:px-6 text-stone-600 text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-rose-800 font-bold text-sm">
              <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
              <span>سند · مساندة محاربات السرطان</span>
            </div>
            <p className="text-stone-500">
              مبادرة تطوعية وإنسانية غير ربحية لوصل المحاربات بالمتخصصات بدون أي تدخل بشري وبسرية مطلقة.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-stone-500">
            <button
              onClick={() => setIsLookupModalOpen(true)}
              className="hover:text-rose-700 underline transition-colors cursor-pointer"
            >
              امسحي بياناتكِ
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('volunteer')}
              className="hover:text-rose-700 underline transition-colors cursor-pointer"
            >
              انضمي كمتطوعة
            </button>
            <span aria-hidden="true">·</span>
            <a
              href="tel:123"
              className="text-rose-700 font-semibold flex items-center gap-1 hover:underline"
            >
              <PhoneCall className="w-3 h-3" />
              <span>طوارئ الإسعاف: 123</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
