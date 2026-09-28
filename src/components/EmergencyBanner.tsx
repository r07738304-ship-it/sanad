import React from 'react';
import { AlertCircle, PhoneCall, ShieldCheck } from 'lucide-react';

interface EmergencyBannerProps {
  compact?: boolean;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ compact = false }) => {
  return (
    <div
      role="alert"
      className={`w-full bg-rose-50 border-y border-rose-200/80 text-rose-950 px-4 transition-all ${
        compact ? 'py-2 text-xs' : 'py-3 text-sm'
      }`}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 text-right w-full sm:w-auto">
          <span className="p-1 rounded-full bg-rose-100 text-rose-700 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </span>
          <p className="font-medium leading-relaxed">
            <strong className="text-rose-800">تنبيه هام ومستمر: </strong>
            هذه الخدمة ليست بديلًا للطوارئ الطبية، وفي الطوارئ اتصلي بالإسعاف 123.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            دعم توجيهي وتطوعي غير طارئ
          </span>
          <a
            href="tel:123"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>اتصال 123</span>
          </a>
        </div>
      </div>
    </div>
  );
};
