import React, { useState } from 'react';
import {
  SUPPORT_TYPES,
  GOVERNORATES,
  SupportType,
  Governorate,
  AppointmentSlot,
  Booking,
  WaitingListEntry,
} from '../types';
import { api } from '../utils/api';
import {
  Heart,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  Info,
} from 'lucide-react';

interface FighterJourneyProps {
  onDataErased?: () => void;
}

export const FighterJourney: React.FC<FighterJourneyProps> = ({ onDataErased }) => {
  // Step state: 1: Consent & Welcome, 2: Choose Support Type, 3: Contact & Location, 4: Slot Selection & Confirmation
  const [step, setStep] = useState<number>(1);

  // Form State
  const [consentGiven, setConsentGiven] = useState<boolean>(false);
  const [selectedSupportType, setSelectedSupportType] = useState<SupportType | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [contactInfo, setContactInfo] = useState<string>('');
  const [governorate, setGovernorate] = useState<Governorate>('أونلاين');

  // Matching & Booking State
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchedVolunteer, setMatchedVolunteer] = useState<any | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [waitingEntry, setWaitingEntry] = useState<WaitingListEntry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [eraseSuccessMessage, setEraseSuccessMessage] = useState<string | null>(null);

  // Handler: Move from Step 1 (Welcome & Consent) to Step 2
  const handleProceedFromConsent = () => {
    if (!consentGiven) {
      setErrorMessage('يُرجى الموافقة على حفظ بيانات التواصل للمتابعة وحجز الموعد.');
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  // Handler: Move from Step 2 (Support Type) to Step 3
  const handleProceedFromSupportType = (type: SupportType) => {
    setSelectedSupportType(type);
    setErrorMessage(null);
    setStep(3);
  };

  // Handler: Perform rule-based automated matching
  const handlePerformMatching = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setErrorMessage('من فضلكِ اكتبي اسمكِ الأول فقط.');
      return;
    }
    if (!contactInfo.trim()) {
      setErrorMessage('من فضلكِ اكتبي رقم هاتفكِ أو بريدكِ الإلكتروني للتواصل معكِ.');
      return;
    }
    if (!selectedSupportType) {
      setErrorMessage('من فضلكِ اختاري نوع الدعم أولاً.');
      return;
    }

    setErrorMessage(null);
    setIsMatching(true);

    try {
      // Automatic rule-based matching (NO AI)
      const res = await api.findMatch(selectedSupportType, governorate);

      if (res.matched && res.volunteer) {
        setMatchedVolunteer(res.volunteer);
        if (res.volunteer.availableSlots && res.volunteer.availableSlots.length > 0) {
          setSelectedSlot(res.volunteer.availableSlots[0]);
        }
        setStep(4);
      } else {
        // No volunteer available -> Enroll in waiting list (Rule 7)
        const waitRes = await api.confirmBooking({
          fighterFirstName: firstName.trim(),
          fighterContact: contactInfo.trim(),
          supportType: selectedSupportType,
          governorate,
          consentGiven: true,
        });

        if (waitRes.type === 'waiting_list') {
          setWaitingEntry(waitRes.waitingEntry);
          setStep(4);
        } else {
          setErrorMessage('حدث خطأ أثناء فحص التوفر، يُرجى المحاولة ثانية.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر استكمال التوزيع، يُرجى المحاولة.');
    } finally {
      setIsMatching(false);
    }
  };

  // Handler: Finalize Booking with selected slot
  const handleConfirmSlotBooking = async () => {
    if (!matchedVolunteer || !selectedSlot || !selectedSupportType) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.confirmBooking({
        fighterFirstName: firstName.trim(),
        fighterContact: contactInfo.trim(),
        supportType: selectedSupportType,
        governorate,
        volunteerId: matchedVolunteer.id,
        slotId: selectedSlot.id,
        consentGiven: true,
      });

      if (res.success && res.booking) {
        setConfirmedBooking(res.booking);
      } else {
        setErrorMessage(res.error || 'تعذر إتمام الحجز، قد يكون الموعد قد حُجز للتو.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء الحجز.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: "امسحي بياناتي" (Erase my data immediately)
  const handleEraseMyData = async () => {
    const idToErase = confirmedBooking?.id || waitingEntry?.id || contactInfo;
    if (!idToErase) return;

    const confirmed = window.confirm(
      'هل تودين بالتأكيد مسح كافة بياناتكِ ورقم التواصل وإلغاء أي حجز أو تسجيل في قائمة الانتظار نهائياً؟'
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const res = await api.eraseData(idToErase);
      setEraseSuccessMessage(res.message);
      setConfirmedBooking(null);
      setWaitingEntry(null);
      setMatchedVolunteer(null);
      setFirstName('');
      setContactInfo('');
      setConsentGiven(false);
      setSelectedSupportType(null);
      setStep(1);
      if (onDataErased) onDataErased();
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء مسح البيانات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFlow = () => {
    setStep(1);
    setConfirmedBooking(null);
    setWaitingEntry(null);
    setMatchedVolunteer(null);
    setSelectedSlot(null);
    setErrorMessage(null);
    setEraseSuccessMessage(null);
  };

  return (
    <div className="w-full py-6 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Success toast if data was erased */}
        {eraseSuccessMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{eraseSuccessMessage}</span>
            </div>
            <button
              onClick={() => setEraseSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-1"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-start gap-2.5 text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* STEP 1: Welcome & Explicit Consent */}
        {step === 1 && !confirmedBooking && !waitingEntry && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            {/* Hero Visual Banner */}
            <div className="relative rounded-2xl overflow-hidden bg-rose-50 border border-rose-100 max-h-56">
              <img
                src="/src/assets/images/sanad_hero_empathy_1790619139563.jpg"
                alt="سند - دعم ومساندة محاربات السرطان"
                referrerPolicy="no-referrer"
                className="w-full h-48 sm:h-56 object-cover object-center"
                onError={(e) => {
                  // Fallback container
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/20 to-transparent flex items-end p-5">
                <div className="text-white text-right">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    أهلاً بكِ في «سند» يا بطلة
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-200 mt-1">
                    أنتِ لستِ وحدكِ في هذه الرحلة.. متطوعاتنا هنا لدعمكِ والاستماع إليكِ بكل حب
                  </p>
                </div>
              </div>
            </div>

            {/* Warm Welcome Prose */}
            <div className="space-y-4 text-stone-700 leading-relaxed text-sm sm:text-base text-right">
              <p>
                «سند» هي منصة غير ربحية تطوعية تهدف إلى وصل محاربات ومتعافيات السرطان بمتطوعات متخصصات
                (طبيبات، أخصائيات نفسيات، لايف كوتشز، معالجات بالفن ومدربات) لجلسات استشارية ودعم إنساني ونفسي وتوجيهي
                مجاني بالكامل.
              </p>

              {/* Safety & Non-medical Role Note */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
                  <Info className="w-4 h-4 text-rose-600" />
                  <span>طبيعة خدمة سند وحدودها:</span>
                </div>
                <ul className="text-xs sm:text-sm text-stone-600 space-y-1.5 list-disc list-inside">
                  <li>التطبيق لا يقدم أي معلومات أو تشخيصات طبية بنفسه، ودوره هو التوجيه وحجز الموعد فقط.</li>
                  <li>لا نسألكِ أبداً عن تفاصيل مرضكِ أو تقاريركِ أو سجلكِ العلاجي؛ خصوصيتكِ مقدسة.</li>
                  <li>يتم التوزيع التلقائي العادل للمتطوعة فورياً وفق المعايير الإنسانية وبدون تدخل بشري.</li>
                </ul>
              </div>

              {/* Explicit Mandatory Consent (Rule 2) */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all bg-stone-50/60 hover:bg-stone-50 border-rose-200">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded text-rose-600 focus:ring-rose-400 border-stone-300 cursor-pointer"
                  />
                  <div className="text-xs sm:text-sm text-stone-800 leading-relaxed select-none">
                    <strong className="text-stone-900 block mb-1">
                      الموافقة الصريحة على حفظ البيانات (شرط إلزامي):
                    </strong>
                    أوافق صراحة على حفظ اسمي الأول ورقم التواصل فقط لغرض تنظيم الموعد مع المتطوعة
                    المختصة، وأدرك تماماً أن هذه الخدمة مخصصة للدعم التوجيهي والنفسي وليست بديلاً عن الطوارئ الطبية
                    (123)، وأن بإمكاني مسح بياناتي نهائياً في أي وقت بضغطة زر واحدة.
                  </div>
                </label>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-stone-500">
                الخطوة 1 من 4 · البدء والموافقة
              </span>
              <button
                onClick={handleProceedFromConsent}
                disabled={!consentGiven}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-xs ${
                  consentGiven
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-[0.99]'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <span>المتابعة لاختيار نوع الدعم</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Support Type Selection (Buttons from fixed list) */}
        {step === 2 && !confirmedBooking && !waitingEntry && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="text-right">
                <span className="text-xs font-semibold text-rose-700 block mb-1">
                  الخطوة 2 من 4 · نوع المساندة
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                  ما نوع الدعم الذي تشعرين أنكِ بحاجة إليه الآن؟
                </h2>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-stone-500 hover:text-stone-800 underline p-1"
              >
                رجوع
              </button>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 text-right">
              اختاري المجال الأقرب لاحتياجكِ وسيقوم نظام «سند» فوراً بربطكِ بأقل المتطوعات ضغطاً في هذا التخصص:
            </p>

            {/* Buttons Grid for Fixed Support Types */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {SUPPORT_TYPES.map((type) => {
                const isSelected = selectedSupportType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleProceedFromSupportType(type)}
                    className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 text-sm font-medium ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/80 text-rose-950 shadow-xs'
                        : 'border-stone-200 hover:border-rose-300 hover:bg-stone-50/60 text-stone-800'
                    }`}
                  >
                    <span className="leading-snug">{type}</span>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs transition-colors ${
                        isSelected
                          ? 'bg-rose-600 text-white'
                          : 'bg-stone-100 text-stone-400 group-hover:bg-rose-100'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Simple Contact Info & Location (NO MEDICAL QUESTIONS) */}
        {step === 3 && !confirmedBooking && !waitingEntry && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="text-right">
                <span className="text-xs font-semibold text-rose-700 block mb-1">
                  الخطوة 3 من 4 · بيانات التواصل
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                  كيف نصل إليكِ لتأكيد الموعد؟
                </h2>
              </div>
              <button
                onClick={() => setStep(2)}
                className="text-xs text-stone-500 hover:text-stone-800 underline p-1"
              >
                تغيير نوع الدعم
              </button>
            </div>

            {/* Support Type reminder */}
            <div className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-stone-700">
              <span>نوع الدعم المختار:</span>
              <strong className="text-rose-800">{selectedSupportType}</strong>
            </div>

            <form onSubmit={handlePerformMatching} className="space-y-5 text-right">
              {/* First Name Only */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-800 mb-1.5">
                  الاسم الأول فقط <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="مثال: مريم أو سارة"
                    required
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white transition-colors"
                  />
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  لا داعي لكتابة الاسم كاملاً؛ الاسم الأول يكفي لحفظ خصوصيتكِ التامة.
                </p>
              </div>

              {/* Mobile Phone or Email Only */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-800 mb-1.5">
                  رقم الموبايل (واتساب) أو البريد الإلكتروني <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="01xxxxxxxxx أو yourname@example.com"
                    required
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white transition-colors text-left"
                    dir="ltr"
                  />
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  لن يظهر رقمكِ إلا للمتطوعة التي ستتولى موعدكِ حصراً.
                </p>
              </div>

              {/* Governorate or Online */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-800 mb-1.5">
                  المحافظة أو الرغبة في الدعم أونلاين <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <select
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value as Governorate)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white transition-colors appearance-none cursor-pointer"
                  >
                    {GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>
                        {gov === 'أونلاين' ? '🌐 جلسة أونلاين (عبر الإنترنت أو مكالمة)' : gov}
                      </option>
                    ))}
                  </select>
                  <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  إذا اخترتِ محافظتكِ ولم تكن هناك متطوعة محلية متفرغة، فسيقوم النظام باقتراح متطوعة تقدم دعماً أونلاين.
                </p>
              </div>

              {/* Strict Privacy Reassurance */}
              <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 border border-stone-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>لا يُطلب منكِ أي تقرير طبي أو تشخيص مرضي حفاظاً على أمانكِ وراحتكِ.</span>
              </div>

              {/* Submit Button (Triggers Automatic Matching Engine) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isMatching}
                  className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  {isMatching ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>جاري البحث التلقائي عن المتطوعة الأنسب...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>ابحثي عن موعد تلقائياً</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4A: Available Slots of Matched Volunteer */}
        {step === 4 && matchedVolunteer && !confirmedBooking && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-right">
            <div className="border-b border-stone-100 pb-4">
              <span className="text-xs font-semibold text-emerald-700 block mb-1">
                الخطوة 4 من 4 · تم التوزيع التلقائي بنجاح
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                المتطوعة المتخصصة المتاحة لكِ
              </h2>
            </div>

            {/* Volunteer Bio Card */}
            <div className="p-5 rounded-2xl bg-stone-50/80 border border-stone-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {matchedVolunteer.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                    <span>{matchedVolunteer.governorate}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {matchedVolunteer.offersOnline ? 'متاحة أونلاين' : 'حضوري فقط'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 font-medium">تم التحقق منها</span>
                  </div>
                </div>

                <div className="text-xs text-stone-600 bg-white px-3 py-1.5 rounded-lg border border-stone-200 shrink-0 self-start sm:self-center">
                  تخصص: {selectedSupportType}
                </div>
              </div>

              {matchedVolunteer.bio && (
                <p className="text-xs text-stone-600 leading-relaxed pt-1 border-t border-stone-200/60">
                  {matchedVolunteer.bio}
                </p>
              )}
            </div>

            {/* Available Slots Selector (Rule 6) */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-stone-900">
                اختاري الموعد الذي يناسبكِ من مواعيدها المتاحة:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matchedVolunteer.availableSlots.map((slot: AppointmentSlot) => {
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-rose-600 bg-rose-50/80 text-rose-950 shadow-xs'
                          : 'border-stone-200 hover:border-rose-300 hover:bg-stone-50 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <Calendar className="w-4 h-4 text-rose-600" />
                          <span>{slot.dayName}</span>
                          <span className="text-stone-500 font-normal text-xs">({slot.date})</span>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            isSelected ? 'bg-rose-600 text-white' : 'border border-stone-300'
                          }`}
                        >
                          {isSelected && '✓'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>الساعة: {slot.time}</span>
                      </div>

                      {slot.notes && (
                        <p className="text-[11px] text-stone-500 mt-1 pt-1 border-t border-stone-200/50">
                          {slot.notes}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirmation Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmSlotBooking}
                disabled={!selectedSlot || isSubmitting}
                className="w-full sm:flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري تأكيد الموعد...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد حجز هذا الموعد الآن</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium"
              >
                تعديل البيانات
              </button>
            </div>
          </div>
        )}

        {/* STEP 4B: No Volunteer Available -> Waiting List (Rule 7) */}
        {step === 4 && waitingEntry && !confirmedBooking && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2">
              <Heart className="w-6 h-6 fill-amber-600 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-stone-900">
                نحن معكِ ولا نترككِ وحدكِ أبداً
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                عزيزتي <strong className="text-stone-900">{waitingEntry.fighterFirstName}</strong>، جميع متطوعاتنا
                المتخصصات في مجال <strong className="text-stone-900">{waitingEntry.supportType}</strong> قد استوفين
                الحد الأقصى من الحالات حالياً أو لا توجد مواعيد فورية شاغرة.
              </p>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 text-xs sm:text-sm text-amber-950">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-amber-700" />
                <span>تم تسجيلكِ تلقائياً في قائمة الانتظار ذات الأولوية</span>
              </div>
              <p className="leading-relaxed">
                رقم تسجيلكِ في قائمة الانتظار: <code className="font-mono font-bold">{waitingEntry.id}</code>.
                بمجرد أن تُنهي أي متطوعة متابعة حالة سابقة أو تُفتح مواعيد جديدة، سيقوم النظام تلقائياً بربطكِ
                والتواصل معكِ فوراً عبر <strong dir="ltr">{waitingEntry.fighterContact}</strong>.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleEraseMyData}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>امسحي بياناتي من قائمة الانتظار</span>
              </button>

              <button
                type="button"
                onClick={handleResetFlow}
                className="w-full sm:flex-1 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>حجز موعد في تخصص آخر</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4C: Confirmed Booking Screen (Rule 6 + Erase Data button) */}
        {confirmedBooking && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-right">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-700">تم تأكيد حجز الموعد بنجاح</span>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
                موعدكِ مع {confirmedBooking.volunteerName}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">
                احتفظي برمز الحجز هذا لمتابعة أو إلغاء الموعد في أي وقت:
              </p>
            </div>

            {/* Booking Details Ticket */}
            <div className="p-5 rounded-2xl bg-[#FAF7F5] border border-stone-200 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                <span className="text-xs text-stone-500 font-medium">رمز الحجز الخاص بكِ:</span>
                <span className="font-mono text-base font-bold text-rose-800 bg-white px-3 py-1 rounded-lg border border-rose-200">
                  {confirmedBooking.id}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-stone-700">
                <div>
                  <span className="text-stone-400 block text-xs">الاسم:</span>
                  <span className="font-semibold text-stone-900">{confirmedBooking.fighterFirstName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-xs">نوع الدعم:</span>
                  <span className="font-semibold text-stone-900">{confirmedBooking.supportType}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-xs">اليوم والتاريخ:</span>
                  <span className="font-semibold text-stone-900">
                    {confirmedBooking.slot.dayName} · {confirmedBooking.slot.date}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-xs">الساعة:</span>
                  <span className="font-semibold text-stone-900">{confirmedBooking.slot.time}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-xs">طريقة التواصل:</span>
                  <span className="font-semibold text-stone-900" dir="ltr">{confirmedBooking.fighterContact}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-xs">المحافظة:</span>
                  <span className="font-semibold text-stone-900">{confirmedBooking.governorate}</span>
                </div>
              </div>

              {confirmedBooking.slot.notes && (
                <div className="pt-2 border-t border-stone-200/60 text-xs text-stone-500">
                  ملاحظات الموعد: {confirmedBooking.slot.notes}
                </div>
              )}
            </div>

            {/* Privacy & Erase Data Guarantee */}
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-3">
              <div className="text-xs text-rose-950 leading-relaxed">
                <strong>حق الخصوصية التام: </strong>
                بياناتكِ لا تظهر لأي شخص باستثناء المتطوعة {confirmedBooking.volunteerName} التي تم الحجز معها.
                إذا غيرتِ رأيكِ أو رغبتِ في حذف كافة بياناتكِ ورقمكِ من قاعدة البيانات فوراً، يمكنكِ الضغط على الزر أدناه:
              </div>

              {/* Erase My Data Button (زر "امسحي بياناتي" للمحاربة) */}
              <button
                type="button"
                onClick={handleEraseMyData}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-rose-300 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>امسحي بياناتي تماماً من النظام</span>
              </button>
            </div>

            {/* Back or Reset button */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleResetFlow}
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline"
              >
                حجز موعد جديد
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
