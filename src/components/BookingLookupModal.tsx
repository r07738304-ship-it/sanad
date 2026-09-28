import React, { useState } from 'react';
import { api } from '../utils/api';
import { X, Search, Trash2, CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';

interface BookingLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataErased?: () => void;
}

export const BookingLookupModal: React.FC<BookingLookupModalProps> = ({
  isOpen,
  onClose,
  onDataErased,
}) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [erasedNotice, setErasedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);
    setErasedNotice(null);

    try {
      const res = await api.lookupBooking(query.trim());
      if (res.found) {
        setResult(res);
      } else {
        setError('لم نتمكن من العثور على أي حجز أو تسجيل مطابق لهذا الرمز أو الرقم.');
      }
    } catch (err: any) {
      setError(err.message || 'لم يتم العثور على بيانات مطابقة.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleEraseData = async () => {
    const toErase = result?.data?.id || query.trim();
    if (!toErase) return;

    const confirmed = window.confirm(
      'تنبيه: سيتم مسح كافة بياناتكِ ورقمكِ وحذفكِ من أي حجز أو قائمة انتظار بالكامل ولا يمكن التراجع. هل أنتِ متأكدة؟'
    );
    if (!confirmed) return;

    setIsErasing(true);
    try {
      const res = await api.eraseData(toErase);
      setErasedNotice(res.message);
      setResult(null);
      setQuery('');
      if (onDataErased) onDataErased();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء مسح البيانات.');
    } finally {
      setIsErasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-stone-200 text-right space-y-5 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-stone-900">
            متابعة الحجز أو مسح بياناتكِ
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {erasedNotice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs sm:text-sm flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>{erasedNotice}</div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Lookup input */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              اكتبي رمز الحجز (مثال: SND-4081) أو رقم الموبايل / الإيميل:
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="رمز الحجز أو رقم الهاتف أو البريد"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-rose-400 focus:bg-white text-left"
                dir="ltr"
                required
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSearching}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSearching ? <span>جاري البحث...</span> : <span>استعلام عن الحجز</span>}
            </button>
          </div>
        </form>

        {/* Found result preview */}
        {result && (
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900">
                {result.type === 'booking' ? 'حجز موعد مؤكد' : 'مسجلة في قائمة الانتظار'}
              </span>
              <span className="text-xs font-mono font-bold text-rose-800 bg-white px-2 py-0.5 rounded border border-rose-200">
                {result.data.id}
              </span>
            </div>

            <div className="space-y-1 text-xs text-stone-700">
              <div>المحاربة: <strong>{result.data.fighterFirstName}</strong></div>
              <div>نوع الدعم: <strong>{result.data.supportType}</strong></div>

              {result.type === 'booking' && (
                <>
                  <div>المتطوعة: <strong>{result.data.volunteerName}</strong></div>
                  <div className="flex items-center gap-1.5 text-stone-600 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    <span>
                      {result.data.slot?.dayName} {result.data.slot?.date} الساعة {result.data.slot?.time}
                    </span>
                  </div>
                </>
              )}

              {result.type === 'waiting' && (
                <div className="text-amber-800 pt-1">
                  الحالة: بانتظار توفر متطوعة شاغرة (سيتم التحويل والتواصل معكِ تلقائياً فوراً).
                </div>
              )}
            </div>

            {/* Erase button inside result */}
            <div className="pt-2 border-t border-stone-200/60">
              <button
                type="button"
                onClick={handleEraseData}
                disabled={isErasing}
                className="w-full py-2 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>امسحي بياناتي تماماً وألغي الحجز</span>
              </button>
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="text-xs text-stone-500 hover:text-stone-800 underline"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
