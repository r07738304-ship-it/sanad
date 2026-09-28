import React, { useState } from 'react';
import {
  SUPPORT_TYPES,
  GOVERNORATES,
  SupportType,
  Governorate,
  Volunteer,
  Booking,
  AppointmentSlot,
} from '../types';
import { api } from '../utils/api';
import {
  UserCheck,
  PlusCircle,
  LogIn,
  CheckCircle,
  Clock,
  Phone,
  Calendar,
  AlertCircle,
  Lock,
  CalendarCheck,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const VolunteerPortal: React.FC = () => {
  const [viewMode, setViewMode] = useState<'login' | 'register' | 'dashboard'>('login');

  // Login credentials
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Authenticated volunteer state
  const [currentVolunteer, setCurrentVolunteer] = useState<Volunteer | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regTypes, setRegTypes] = useState<SupportType[]>([]);
  const [regGov, setRegGov] = useState<Governorate>('القاهرة');
  const [regOffersOnline, setRegOffersOnline] = useState(true);
  const [regMaxCases, setRegMaxCases] = useState<number>(4);
  const [regBio, setRegBio] = useState('');
  const [regSlots, setRegSlots] = useState<Omit<AppointmentSlot, 'id'>[]>([]);

  // New slot temporary inputs
  const [newSlotDay, setNewSlotDay] = useState('الأحد');
  const [newSlotDate, setNewSlotDate] = useState('2026-10-11');
  const [newSlotTime, setNewSlotTime] = useState('06:00 م');
  const [newSlotNotes, setNewSlotNotes] = useState('');

  // Dashboard add slot inputs
  const [dashDay, setDashDay] = useState('الإثنين');
  const [dashDate, setDashDate] = useState('2026-10-12');
  const [dashTime, setDashTime] = useState('05:30 م');
  const [dashNotes, setDashNotes] = useState('');
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Toggle support type in registration
  const toggleSupportType = (type: SupportType) => {
    if (regTypes.includes(type)) {
      setRegTypes(regTypes.filter((t) => t !== type));
    } else {
      setRegTypes([...regTypes, type]);
    }
  };

  // Add slot to registration list
  const handleAddSlotToReg = () => {
    if (!newSlotDay || !newSlotDate || !newSlotTime) return;
    setRegSlots([
      ...regSlots,
      {
        dayName: newSlotDay,
        date: newSlotDate,
        time: newSlotTime,
        notes: newSlotNotes || undefined,
      },
    ]);
    setNewSlotNotes('');
  };

  // Remove slot from registration list
  const handleRemoveSlotFromReg = (index: number) => {
    setRegSlots(regSlots.filter((_, i) => i !== index));
  };

  // Submit Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim()) {
      setRegError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (regTypes.length === 0) {
      setRegError('يرجى اختيار نوع دعم واحد على الأقل من القائمة');
      return;
    }
    if (regSlots.length === 0) {
      setRegError('يرجى إضافة موعد واحد على الأقل في قائمة مواعيدكِ المتاحة');
      return;
    }

    setIsSubmittingReg(true);
    setRegError(null);

    try {
      const formattedSlots: AppointmentSlot[] = regSlots.map((s, idx) => ({
        id: `slot-reg-${Date.now()}-${idx}`,
        dayName: s.dayName,
        date: s.date,
        time: s.time,
        notes: s.notes,
      }));

      const res = await api.registerVolunteer({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword || 'password123',
        supportTypes: regTypes,
        governorate: regGov,
        offersOnline: regOffersOnline,
        maxCases: regMaxCases,
        availableSlots: formattedSlots,
        bio: regBio.trim(),
      });

      if (res.success) {
        setRegSuccessMessage(
          'تم تسجيلكِ بنجاح! حسابكِ الآن بحالة «قيد المراجعة» وسيقوم فريق الإدارة بمراجعته وتفعيله قريباً.'
        );
        // Clear form
        setRegName('');
        setRegEmail('');
        setRegPhone('');
        setRegPassword('');
        setRegTypes([]);
        setRegSlots([]);
        setRegBio('');
      } else {
        setRegError(res.error || 'حدث خطأ أثناء التسجيل');
      }
    } catch (err: any) {
      setRegError(err.message || 'حدث خطأ في التسجيل');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await api.volunteerLogin(loginEmail, loginPassword);
      if (res.success && res.volunteer) {
        setCurrentVolunteer(res.volunteer);
        setMyBookings(res.bookings || []);
        setViewMode('dashboard');
      } else {
        setLoginError(res.error || 'بيانات الدخول غير صحيحة');
      }
    } catch (err: any) {
      setLoginError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quick login helper for demo evaluators
  const handleQuickLogin = async (email: string) => {
    setLoginEmail(email);
    setLoginPassword('password123');
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await api.volunteerLogin(email, 'password123');
      if (res.success && res.volunteer) {
        setCurrentVolunteer(res.volunteer);
        setMyBookings(res.bookings || []);
        setViewMode('dashboard');
      }
    } catch (err: any) {
      setLoginError(err.message || 'تعذر تسجيل الدخول السريع');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // "أنهيت المتابعة" (Complete Follow-up) -> decreases currentCases by 1
  const handleCompleteCase = async (bookingId: string) => {
    if (!currentVolunteer) return;
    const confirmAction = window.confirm('هل تودين تأكيد إنهاء متابعة هذه الحالة وإفساح مكان لحالة جديدة؟');
    if (!confirmAction) return;

    try {
      const res = await api.volunteerCompleteCase(currentVolunteer.id, bookingId);
      if (res.success) {
        setCurrentVolunteer({
          ...currentVolunteer,
          currentCases: res.currentCases,
        });
        setMyBookings(res.bookings || []);
        setActionFeedback(
          res.autoAllocatedCount > 0
            ? `تم إنهاء المتابعة بنجاح! وتم تلقائياً تحويل ${res.autoAllocatedCount} حالة جديدة من قائمة الانتظار.`
            : 'تم إنهاء المتابعة بنجاح وخفض عدد حالاتكِ الحالية بمقدار 1.'
        );
      }
    } catch (err: any) {
      setActionFeedback(err.message || 'حدث خطأ أثناء إنهاء المتابعة.');
    }
  };

  // Add slot in Dashboard
  const handleDashboardAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVolunteer || !dashDay || !dashDate || !dashTime) return;

    setIsAddingSlot(true);
    try {
      const res = await api.volunteerAddSlot(currentVolunteer.id, {
        dayName: dashDay,
        date: dashDate,
        time: dashTime,
        notes: dashNotes || undefined,
      });

      if (res.success && res.slots) {
        setCurrentVolunteer({
          ...currentVolunteer,
          availableSlots: res.slots,
        });
        setDashNotes('');
        setActionFeedback('تمت إضافة الموعد الجديد بنجاح إلى جدول مواعيدكِ المتاحة للمحاربات.');
      }
    } catch (err: any) {
      setActionFeedback(err.message || 'تعذر إضافة الموعد.');
    } finally {
      setIsAddingSlot(false);
    }
  };

  const handleLogout = () => {
    setCurrentVolunteer(null);
    setMyBookings([]);
    setViewMode('login');
    setLoginPassword('');
    setActionFeedback(null);
  };

  return (
    <div className="w-full py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation between Login and Register if not authenticated */}
        {!currentVolunteer && (
          <div className="flex items-center justify-center gap-2 p-1 bg-stone-100 rounded-2xl max-w-sm mx-auto">
            <button
              onClick={() => {
                setViewMode('login');
                setLoginError(null);
                setRegSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                viewMode === 'login'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              تسجيل دخول المتطوعة
            </button>
            <button
              onClick={() => {
                setViewMode('register');
                setLoginError(null);
                setRegSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                viewMode === 'register'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              انضمي كمتطوعة جديدة
            </button>
          </div>
        )}

        {/* VIEW 1: VOLUNTEER LOGIN */}
        {viewMode === 'login' && !currentVolunteer && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs max-w-lg mx-auto text-right space-y-6">
            <div>
              <span className="text-xs font-semibold text-rose-700 block mb-1">
                بوابة المتطوعات
              </span>
              <h2 className="text-xl font-bold text-stone-900">
                تسجيل الدخول إلى حسابكِ التطوعي
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                متابعة الحالات المسندة إليكِ، إنهاء المتابعات، وإضافة مواعيد شاغرة جديدة
              </p>
            </div>

            {loginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white text-left"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isLoggingIn ? (
                  <span>جاري تسجيل الدخول...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>دخول إلى لوحة المتابعة</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Access Buttons for Evaluators */}
            <div className="pt-4 border-t border-stone-100 text-right space-y-2">
              <span className="text-xs font-medium text-stone-500 block">
                دخول سريع بالمتطوعات التجريبيات (كلمة المرور: password123):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('dr.sara@sanad.org')}
                  className="text-xs px-2.5 py-1.5 bg-stone-100 hover:bg-rose-100 rounded-lg text-stone-800 transition-colors"
                >
                  د. سارة (أورام)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('dr.farida@sanad.org')}
                  className="text-xs px-2.5 py-1.5 bg-stone-100 hover:bg-rose-100 rounded-lg text-stone-800 transition-colors"
                >
                  د. فريدة (نفسية)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('yasmin.coach@sanad.org')}
                  className="text-xs px-2.5 py-1.5 bg-stone-100 hover:bg-rose-100 rounded-lg text-stone-800 transition-colors"
                >
                  أ. ياسمين (كوتش وفن)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: VOLUNTEER REGISTRATION FORM */}
        {viewMode === 'register' && !currentVolunteer && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs text-right space-y-6">
            <div>
              <span className="text-xs font-semibold text-rose-700 block mb-1">
                عطاء ومساندة
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
                تسجيل متطوعة متخصصة جديدة
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                شكراً لقلبكِ النبيل. يتم حفظ بياناتكِ أولاً بحالة «قيد المراجعة» لحين التحقق والاعتماد من قبل الإدارة.
              </p>
            </div>

            {regSuccessMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{regSuccessMessage}</div>
              </div>
            )}

            {regError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    الاسم واللقب المهني <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="مثال: د. مريم أحمد - استشارية..."
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    البريد الإلكتروني <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="dr.name@example.com"
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    رقم التواصل / واتساب <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    كلمة المرور للحساب <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="اختر كلمة مرور آمنة"
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Location & Online */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    المحافظة <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={regGov}
                    onChange={(e) => setRegGov(e.target.value as Governorate)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white"
                  >
                    {GOVERNORATES.filter((g) => g !== 'أونلاين').map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    الحد الأقصى للحالات المتزامنة <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={regMaxCases}
                    onChange={(e) => setRegMaxCases(Number(e.target.value))}
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    لن يسند إليكِ النظام أكثر من هذا العدد في نفس الوقت.
                  </p>
                </div>
              </div>

              {/* Online support checkbox */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={regOffersOnline}
                    onChange={(e) => setRegOffersOnline(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-400 border-stone-300"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-stone-800">
                    أستطيع تقديم جلسات دعم واستشارات عبر الإنترنت (أونلاين / مكالمة)
                  </span>
                </label>
              </div>

              {/* Support Types (Multi-select from fixed list) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-800">
                  أنواع الدعم التي تقدمينها (اختيار متعدد من القائمة المعتمدة) <span className="text-rose-600">*</span>:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUPPORT_TYPES.map((type) => {
                    const checked = regTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleSupportType(type)}
                        className={`p-2.5 rounded-xl border text-xs text-right transition-colors flex items-center justify-between gap-1.5 ${
                          checked
                            ? 'border-rose-500 bg-rose-50/80 text-rose-950 font-semibold'
                            : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <span className="truncate">{type}</span>
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                            checked ? 'bg-rose-600 text-white' : 'border border-stone-300'
                          }`}
                        >
                          {checked && '✓'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bio / Experience */}
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  نبذة تعريفية مختصرة وسنوات الخبرة
                </label>
                <textarea
                  rows={2}
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  placeholder="مثال: استشارية متطوعة مع خبرة 8 سنوات في الدعم النفسي..."
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white"
                />
              </div>

              {/* Available Slots Builder */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-rose-600" />
                    <span>مواعيدكِ المتاحة لحجز المحاربات (أضيفي موعداً على الأقل)</span>
                  </h4>
                  <span className="text-xs text-stone-500">
                    {regSlots.length} موعد مضاف
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] text-stone-600 block mb-0.5">اليوم</label>
                    <select
                      value={newSlotDay}
                      onChange={(e) => setNewSlotDay(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs"
                    >
                      {['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-600 block mb-0.5">التاريخ</label>
                    <input
                      type="date"
                      value={newSlotDate}
                      onChange={(e) => setNewSlotDate(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-600 block mb-0.5">الساعة</label>
                    <input
                      type="text"
                      value={newSlotTime}
                      onChange={(e) => setNewSlotTime(e.target.value)}
                      placeholder="06:00 م"
                      className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddSlotToReg}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>إضافة للمواعيد</span>
                    </button>
                  </div>
                </div>

                {/* Slots List Preview */}
                {regSlots.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-stone-200">
                    {regSlots.map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-stone-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-800">{slot.dayName}</span>
                          <span className="text-stone-400">·</span>
                          <span className="text-stone-600">{slot.date}</span>
                          <span className="text-stone-400">·</span>
                          <span className="text-rose-700 font-mono">{slot.time}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlotFromReg(idx)}
                          className="text-stone-400 hover:text-rose-600 px-2 text-xs"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmittingReg}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isSubmittingReg ? (
                  <span>جاري تسجيل بياناتكِ...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>إرسال طلب الانضمام (حفظ بحالة قيد المراجعة)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* VIEW 3: VOLUNTEER PERSONAL DASHBOARD */}
        {viewMode === 'dashboard' && currentVolunteer && (
          <div className="space-y-6 text-right">
            {/* Header info */}
            <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
                      مرحباً، {currentVolunteer.name}
                    </h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
                        currentVolunteer.isVerified
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {currentVolunteer.isVerified ? 'تم التحقق ✓' : 'قيد المراجعة'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    {currentVolunteer.governorate} · {currentVolunteer.email} ·{' '}
                    {currentVolunteer.offersOnline ? 'متاحة أونلاين' : 'حضوري فقط'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>تسجيل خروج</span>
                  </button>
                </div>
              </div>

              {/* Status & Capacity Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="text-xs text-stone-500 block mb-1">الحالات الحالية النشطة</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono text-rose-700">
                    {currentVolunteer.currentCases}
                  </span>
                  <span className="text-xs text-stone-400 mr-1">/ {currentVolunteer.maxCases} كحد أقصى</span>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="text-xs text-stone-500 block mb-1">المواعيد المتاحة للحجز</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono text-stone-800">
                    {currentVolunteer.availableSlots.length}
                  </span>
                  <span className="text-xs text-stone-400 mr-1">موعد شاغر</span>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="text-xs text-stone-500 block mb-1">حالات تم إتمامها</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">
                    {myBookings.filter((b) => b.status === 'completed').length}
                  </span>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
                  <span className="text-xs text-stone-500 block mb-1">حالة الحساب</span>
                  <span
                    className={`text-sm font-bold ${
                      currentVolunteer.isVerified ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {currentVolunteer.isVerified ? 'مفعل وجاهز' : 'ينتظر موافقة الإدارة'}
                  </span>
                </div>
              </div>

              {/* Action feedback */}
              {actionFeedback && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-950 rounded-xl text-xs sm:text-sm flex items-center justify-between">
                  <span>{actionFeedback}</span>
                  <button
                    onClick={() => setActionFeedback(null)}
                    className="text-xs font-bold text-rose-700 hover:text-rose-900"
                  >
                    إغلاق
                  </button>
                </div>
              )}
            </div>

            {/* ASSIGNED CASES SECTION (Strict Privacy: Only shows cases booked with her) */}
            <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900">
                    حالات المحاربات المجدولة معكِ
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    حفظ تام للخصوصية: تظهر بيانات المحاربة فقط للمتطوعة التي حجزت معها
                  </p>
                </div>
                <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg">
                  {myBookings.filter((b) => b.status === 'active').length} نشطة
                </span>
              </div>

              {myBookings.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-sm bg-stone-50 rounded-2xl">
                  لا توجد حالات مسندة إليكِ حالياً. ستظهر هنا فور حجز أي محاربة لموعد معكِ تلقائياً.
                </div>
              ) : (
                <div className="space-y-3">
                  {myBookings.map((b) => {
                    const isActive = b.status === 'active';
                    return (
                      <div
                        key={b.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isActive
                            ? 'bg-white border-stone-200 shadow-xs'
                            : 'bg-stone-50/70 border-stone-200/50 opacity-75'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm sm:text-base">
                              المحاربة: {b.fighterFirstName}
                            </span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                                isActive
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isActive ? 'متابعة جارية' : 'تم إنهاء المتابعة ✓'}
                            </span>
                            <span className="text-xs font-mono text-stone-400">({b.id})</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                            <span className="font-medium text-stone-800">
                              نوع الدعم: {b.supportType}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-stone-400" />
                              {b.slot.dayName} {b.slot.date} ({b.slot.time})
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1 font-mono" dir="ltr">
                              <Phone className="w-3.5 h-3.5 text-stone-400" />
                              {b.fighterContact}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>المحافظة: {b.governorate}</span>
                          </div>
                        </div>

                        {/* "أنهيت المتابعة" Button (Rule: decreases current cases by 1) */}
                        {isActive && (
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCompleteCase(b.id)}
                              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>أنهيت المتابعة</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ADD MORE AVAILABLE SLOTS SECTION */}
            <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-stone-900">
                إضافة مواعيد شاغرة جديدة لجدولكِ
              </h3>
              <p className="text-xs text-stone-500">
                المواعيد التي تضيفينها تظهر فوراً للمحاربات أو تُخصّص تلقائياً للمسجلات في قائمة الانتظار.
              </p>

              <form onSubmit={handleDashboardAddSlot} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                <div>
                  <label className="text-[11px] text-stone-600 block mb-1">اليوم</label>
                  <select
                    value={dashDay}
                    onChange={(e) => setDashDay(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  >
                    {['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-stone-600 block mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={dashDate}
                    onChange={(e) => setDashDate(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-600 block mb-1">الساعة</label>
                  <input
                    type="text"
                    value={dashTime}
                    onChange={(e) => setDashTime(e.target.value)}
                    placeholder="06:00 م"
                    required
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-left"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isAddingSlot}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>إضافة الموعد</span>
                  </button>
                </div>
              </form>

              {/* Current Slots Preview */}
              <div className="pt-3 border-t border-stone-100">
                <span className="text-xs font-medium text-stone-600 block mb-2">
                  مواعيدكِ المتبقية الشاغرة حالياً ({currentVolunteer.availableSlots.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentVolunteer.availableSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-700 flex items-center gap-1.5"
                    >
                      <Clock className="w-3 h-3 text-rose-600" />
                      <span>{slot.dayName}</span>
                      <span>({slot.date})</span>
                      <span className="font-mono text-stone-900">{slot.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
