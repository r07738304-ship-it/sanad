import React, { useState, useEffect } from 'react';
import {
  Volunteer,
  Booking,
  WaitingListEntry,
  SupportType,
  Governorate,
  SUPPORT_TYPES,
} from '../types';
import { api } from '../utils/api';
import {
  Lock,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Upload,
  Download,
  RefreshCw,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  Key,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Data
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Tabs inside Admin
  const [adminTab, setAdminTab] = useState<'volunteers' | 'bookings' | 'waiting' | 'csv'>('volunteers');

  // CSV Import State
  const [csvContent, setCsvContent] = useState('');
  const [parsedCsvRows, setParsedCsvRows] = useState<any[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Authenticate
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password) {
      setAuthError('يرجى كتابة كلمة مرور الإدارة');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const data = await api.adminGetOverview(password);
      setVolunteers(data.volunteers || []);
      setBookings(data.bookings || []);
      setWaitingList(data.waitingList || []);
      setStats(data.stats || {});
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || 'فشل تسجيل دخول الإدارة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      const data = await api.adminGetOverview(password);
      setVolunteers(data.volunteers || []);
      setBookings(data.bookings || []);
      setWaitingList(data.waitingList || []);
      setStats(data.stats || {});
    } catch (err: any) {
      setActionNotice(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle volunteer verification ("تم التحقق")
  const handleToggleVerification = async (volId: string, currentStatus: boolean) => {
    try {
      const res = await api.adminVerifyVolunteer(password, volId, !currentStatus);
      if (res.success) {
        setVolunteers((prev) =>
          prev.map((v) => (v.id === volId ? { ...v, isVerified: !currentStatus } : v))
        );
        setActionNotice(
          !currentStatus
            ? `تم اعتماد المتطوعة وتفعيلها بنجاح (تم التحقق = نعم)${
                res.autoAllocatedCount > 0
                  ? ` وتم تحويل ${res.autoAllocatedCount} حالة من قائمة الانتظار تلقائياً.`
                  : '.'
              }`
            : 'تم تحويل حالة المتطوعة إلى قيد المراجعة/غير معتمدة.'
        );
        handleRefresh();
      }
    } catch (err: any) {
      setActionNotice(err.message || 'حدث خطأ في تحديث حالة المتطوعة');
    }
  };

  // Process Waiting List manually
  const handleProcessWaitingList = async () => {
    try {
      setIsLoading(true);
      const res = await api.adminProcessWaitingList(password);
      if (res.success) {
        setActionNotice(
          res.matchedCount > 0
            ? `تم فحص قائمة الانتظار وتوزيع ${res.matchedCount} حالة بنجاح على المتطوعات الشاغرات!`
            : 'تم فحص قائمة الانتظار، ولا توجد حالياً متطوعات شاغرات مطابقة للشروط.'
        );
        handleRefresh();
      }
    } catch (err: any) {
      setActionNotice(err.message || 'تعذر فحص قائمة الانتظار');
    } finally {
      setIsLoading(false);
    }
  };

  // CSV Parsing
  const handleParseCsv = (content: string) => {
    setCsvContent(content);
    setImportMessage(null);

    try {
      const lines = content.trim().split('\n').filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setParsedCsvRows([]);
        return;
      }

      // Expected columns: name, supportTypes, governorate, offersOnline, email, phone, maxCases
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Split with care for quotes or commas
        const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
        if (cols.length >= 4) {
          const rawTypes = cols[1] ? cols[1].split(';').map((t) => t.trim()) : ['طبيبة أورام'];
          rows.push({
            name: cols[0],
            supportTypes: rawTypes,
            governorate: cols[2] || 'القاهرة',
            offersOnline: cols[3] === 'نعم' || cols[3] === 'true' || cols[3] === '1',
            email: cols[4] || `vol${i}@sanad.org`,
            phone: cols[5] || '01000000000',
            maxCases: parseInt(cols[6], 10) || 4,
            isVerified: true, // Imported volunteers default to verified
            availableSlots: [
              {
                id: `slot-csv-${Date.now()}-${i}`,
                dayName: 'الأحد',
                date: '2026-10-11',
                time: '06:00 م',
                notes: 'موعد تم إنشاؤه عبر الاستيراد',
              },
            ],
          });
        }
      }
      setParsedCsvRows(rows);
    } catch (err: any) {
      setImportMessage('خطأ في قراءة ملف CSV: ' + err.message);
    }
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleParseCsv(text);
    };
    reader.readAsText(file);
  };

  // Submit parsed CSV import
  const handleExecuteImport = async () => {
    if (parsedCsvRows.length === 0) return;
    setIsLoading(true);
    try {
      const res = await api.adminImportCsv(password, parsedCsvRows);
      if (res.success) {
        setImportMessage(`تم بنجاح استيراد وتحديث ${res.importedCount} متطوعة.`);
        setParsedCsvRows([]);
        setCsvContent('');
        handleRefresh();
      }
    } catch (err: any) {
      setImportMessage(err.message || 'حدث خطأ أثناء الاستيراد');
    } finally {
      setIsLoading(false);
    }
  };

  // Download Sample Template CSV
  const handleDownloadSampleCsv = () => {
    const sampleHeader = 'الاسم,أنواع الدعم (مفصولة بفاصلة منقوطة),المحافظة,أونلاين (نعم/لا),الإيميل,الهاتف,الحد الأقصى للحالات\n';
    const sampleRows = [
      'د. هالة فهمي,طبيبة أورام;معلومات أو توعية صحية,القاهرة,نعم,dr.hala@sanad.org,01011223344,4',
      'أ. ريم الشاذلي,أخصائية نفسية;لايف كوتش,الإسكندرية,نعم,reem.psy@sanad.org,01233445566,3',
      'د. جيهان منصور,أخصائية علاج طبيعي,الجيزة,لا,dr.gihan@sanad.org,01555667788,5',
    ].join('\n');

    const blob = new Blob(['\uFEFF' + sampleHeader + sampleRows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'نموذج_استيراد_متطوعات_سند.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current volunteers to CSV
  const handleExportVolunteersCsv = () => {
    const header = 'المعرف,الاسم,البريد,الهاتف,المحافظة,أونلاين,تم التحقق,الحالات الحالية,الحد الأقصى,أنواع الدعم\n';
    const rows = volunteers
      .map((v) =>
        [
          v.id,
          `"${v.name}"`,
          v.email,
          v.phone,
          v.governorate,
          v.offersOnline ? 'نعم' : 'لا',
          v.isVerified ? 'نعم' : 'قيد المراجعة',
          v.currentCases,
          v.maxCases,
          `"${v.supportTypes.join(';')}"`,
        ].join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `متطوعات_سند_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Not authenticated screen
  if (!isAuthenticated) {
    return (
      <div className="w-full py-8 px-4 sm:px-6">
        <div className="max-w-md mx-auto bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs text-right space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-800 mb-2">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <span className="text-xs font-semibold text-rose-700 block mb-1">
              منطقة محمية بكلمة سر قوية
            </span>
            <h2 className="text-xl font-bold text-stone-900">
              لوحة الإدارة والإشراف على منصة سند
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              مخصصة لفريق الإشراف لمراجعة المتطوعات وتأكيد اعتمادهن وإدارة التوزيع وقوائم الانتظار.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                كلمة مرور الإدارة
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ادخلي كلمة المرور"
                  required
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white text-left"
                  dir="ltr"
                />
                <Key className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              {isLoading ? <span>جاري التحقق...</span> : <span>دخول لوحة الإدارة</span>}
            </button>
          </form>

          {/* Quick Demo Autofill */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>كلمة مرور التجربة الافتراضية:</span>
            <button
              type="button"
              onClick={() => {
                setPassword('SanadAdmin2026!');
              }}
              className="text-rose-700 hover:text-rose-900 font-mono font-semibold underline"
            >
              SanadAdmin2026! (تعبئة سريعة)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6 text-right">
        {/* Header & Stats Bar */}
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
                  لوحة التحكم الإدارية
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold bg-stone-100 text-stone-800">
                  مشرف معتمد
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                متابعة التوزيع التلقائي، اعتماد المتطوعات، واستيراد البيانات
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>تحديث</span>
              </button>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                قفل اللوحة
              </button>
            </div>
          </div>

          {/* Metric Cards (Tabular Figures) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="text-xs text-stone-500 block mb-1">إجمالي المتطوعات</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-stone-900 tabular-nums">
                {stats?.totalVolunteers || volunteers.length}
              </span>
              <div className="text-[11px] text-stone-500 mt-0.5">
                <span className="text-emerald-700 font-medium">{stats?.verifiedVolunteers || 0} تم التحقق</span>
                {' · '}
                <span className="text-amber-700">{stats?.pendingVolunteers || 0} قيد المراجعة</span>
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="text-xs text-stone-500 block mb-1">الحجوزات النشطة</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-rose-700 tabular-nums">
                {stats?.activeBookings || 0}
              </span>
              <div className="text-[11px] text-stone-500 mt-0.5">
                {stats?.completedBookings || 0} حالة مكتملة
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="text-xs text-stone-500 block mb-1">قائمة الانتظار</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-amber-700 tabular-nums">
                {stats?.waitingCount || waitingList.filter((w) => w.status === 'waiting').length}
              </span>
              <div className="text-[11px] text-stone-500 mt-0.5">في انتظار شاغر</div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 flex flex-col justify-between">
              <span className="text-xs text-stone-500 block mb-1">فحص التوزيع التلقائي</span>
              <button
                onClick={handleProcessWaitingList}
                disabled={isLoading}
                className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                فحص قائمة الانتظار
              </button>
            </div>
          </div>

          {/* Action Feedback */}
          {actionNotice && (
            <div className="p-3 bg-stone-100 text-stone-900 rounded-xl text-xs flex items-center justify-between">
              <span>{actionNotice}</span>
              <button
                onClick={() => setActionNotice(null)}
                className="text-stone-500 hover:text-stone-900 font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-2xl max-w-lg">
          <button
            onClick={() => setAdminTab('volunteers')}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              adminTab === 'volunteers' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
            }`}
          >
            المتطوعات ({volunteers.length})
          </button>
          <button
            onClick={() => setAdminTab('bookings')}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              adminTab === 'bookings' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
            }`}
          >
            الحجوزات ({bookings.length})
          </button>
          <button
            onClick={() => setAdminTab('waiting')}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              adminTab === 'waiting' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
            }`}
          >
            قائمة الانتظار ({waitingList.filter((w) => w.status === 'waiting').length})
          </button>
          <button
            onClick={() => setAdminTab('csv')}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              adminTab === 'csv' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
            }`}
          >
            استيراد CSV
          </button>
        </div>

        {/* TAB 1: VOLUNTEERS MANAGEMENT */}
        {adminTab === 'volunteers' && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  إدارة واعتماد المتطوعات (تم التحقق)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  المتطوعات المعتمدة فقط هي التي يُسند إليها النظام طلبات المحاربات تلقائياً
                </p>
              </div>
              <button
                onClick={handleExportVolunteersCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير CSV</span>
              </button>
            </div>

            <div className="space-y-3">
              {volunteers.map((vol) => (
                <div
                  key={vol.id}
                  className="p-4 rounded-2xl border border-stone-200/80 bg-stone-50/40 hover:bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm sm:text-base">
                        {vol.name}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
                          vol.isVerified
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {vol.isVerified ? 'تم التحقق ✓' : 'قيد المراجعة'}
                      </span>
                      <span className="text-xs font-mono text-stone-400">({vol.id})</span>
                    </div>

                    <div className="text-xs text-stone-600 flex flex-wrap items-center gap-2">
                      <span>{vol.governorate}</span>
                      <span aria-hidden="true">·</span>
                      <span>{vol.offersOnline ? 'أونلاين: نعم' : 'حضوري فقط'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono" dir="ltr">{vol.email}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono" dir="ltr">{vol.phone}</span>
                    </div>

                    <div className="text-xs text-stone-700 flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-stone-400">أنواع الدعم:</span>
                      {vol.supportTypes.map((t, idx) => (
                        <span key={idx} className="bg-stone-200/70 text-stone-800 px-2 py-0.5 rounded-md text-[11px]">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-stone-500 pt-1 flex items-center gap-3">
                      <span>
                        الحالات: <strong className="font-mono font-bold text-stone-800">{vol.currentCases}</strong> / {vol.maxCases}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        المواعيد الشاغرة: <strong className="font-mono">{vol.availableSlots?.length || 0}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Verification Toggle Action */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleToggleVerification(vol.id, vol.isVerified)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        vol.isVerified
                          ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      }`}
                    >
                      {vol.isVerified ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-stone-500" />
                          <span>إلغاء الاعتماد</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>اعتماد (تم التحقق)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: BOOKINGS LIST */}
        {adminTab === 'bookings' && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  سجل الحجوزات والمواعيد
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  جميع المواعيد التي تم توزيعها تلقائياً للمحاربات
                </p>
              </div>
              <span className="text-xs text-stone-600 font-mono">
                {bookings.length} حجز مسجل
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm bg-stone-50 rounded-2xl">
                لا توجد حجوزات حتى الآن.
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">
                          {b.fighterFirstName}
                        </span>
                        <span className="font-mono text-rose-800 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                          {b.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                            b.status === 'active'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {b.status === 'active' ? 'نشط' : 'مكتمل'}
                        </span>
                      </div>

                      <div className="text-stone-600 flex flex-wrap items-center gap-2">
                        <span>نوع الدعم: <strong className="text-stone-800">{b.supportType}</strong></span>
                        <span aria-hidden="true">·</span>
                        <span>المتطوعة: <strong className="text-stone-800">{b.volunteerName}</strong></span>
                        <span aria-hidden="true">·</span>
                        <span>المحافظة: {b.governorate}</span>
                      </div>

                      <div className="text-stone-500 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          {b.slot.dayName} {b.slot.date} ({b.slot.time})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono" dir="ltr">{b.fighterContact}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WAITING LIST */}
        {adminTab === 'waiting' && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  قائمة الانتظار (تحويل تلقائي عند توفر مكان)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  يتم تحويلهن تلقائياً فور إنهاء أي متطوعة لحالة أو اعتماد متطوعة جديدة
                </p>
              </div>

              <button
                onClick={handleProcessWaitingList}
                disabled={isLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة فحص وتوزيع القائمة الآن</span>
              </button>
            </div>

            {waitingList.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm bg-stone-50 rounded-2xl">
                قائمة الانتظار فارغة حالياً. جميع المحاربات تم التوزيع لهن مباشرة.
              </div>
            ) : (
              <div className="space-y-3">
                {waitingList.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">
                          {entry.fighterFirstName}
                        </span>
                        <span className="font-mono text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                          {entry.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                            entry.status === 'waiting'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {entry.status === 'waiting' ? 'في الانتظار' : 'تم التحويل ✓'}
                        </span>
                      </div>

                      <div className="text-stone-600 flex flex-wrap items-center gap-2">
                        <span>نوع الدعم المطلوب: <strong className="text-stone-800">{entry.supportType}</strong></span>
                        <span aria-hidden="true">·</span>
                        <span>المحافظة: {entry.governorate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono" dir="ltr">{entry.fighterContact}</span>
                      </div>

                      <div className="text-[11px] text-stone-400">
                        وقت التسجيل: {new Date(entry.requestedAt).toLocaleString('ar-EG')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CSV IMPORT */}
        {adminTab === 'csv' && (
          <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  استيراد المتطوعات من ملف CSV
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  إمكانية استيراد قائمة متطوعات دفعة واحدة مع تخصصاتهن ومواعيدهن
                </p>
              </div>

              <button
                onClick={handleDownloadSampleCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل نموذج CSV جاهز</span>
              </button>
            </div>

            {importMessage && (
              <div className="p-3.5 bg-stone-100 rounded-xl text-xs font-semibold text-stone-800 flex items-center justify-between">
                <span>{importMessage}</span>
                <button onClick={() => setImportMessage(null)} className="text-stone-500 px-1">
                  ✕
                </button>
              </div>
            )}

            {/* Upload or Paste */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-rose-300 transition-colors">
                <Upload className="w-8 h-8 text-stone-400" />
                <span className="text-xs font-semibold text-stone-800">
                  ارفعي ملف CSV من جهازكِ
                </span>
                <span className="text-[11px] text-stone-400">ملف .csv بترميز UTF-8</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-2 text-xs text-stone-500 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-stone-100 file:text-stone-700 file:cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-800">
                  أو الصقي نص CSV هنا مباشرة:
                </label>
                <textarea
                  rows={4}
                  value={csvContent}
                  onChange={(e) => handleParseCsv(e.target.value)}
                  placeholder={`الاسم,أنواع الدعم,المحافظة,أونلاين,الإيميل,الهاتف,الحد الأقصى\nد. سميرة,طبيبة أورام,القاهرة,نعم,samira@sanad.org,01099887766,4`}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-left focus:outline-hidden focus:border-rose-400"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Parsed Rows Preview */}
            {parsedCsvRows.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900">
                    معاينة السجلات الجاهزة للاستيراد ({parsedCsvRows.length}):
                  </h4>
                  <button
                    onClick={handleExecuteImport}
                    disabled={isLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    تأكيد وحفظ الاستيراد في قاعدة البيانات
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-stone-200 rounded-xl divide-y divide-stone-100">
                  {parsedCsvRows.map((row, idx) => (
                    <div key={idx} className="p-2.5 text-xs flex items-center justify-between bg-white hover:bg-stone-50">
                      <div>
                        <strong className="text-stone-900">{row.name}</strong>
                        <span className="text-stone-400 mx-1.5">·</span>
                        <span className="text-stone-600">{row.governorate}</span>
                        <span className="text-stone-400 mx-1.5">·</span>
                        <span className="text-stone-500 font-mono" dir="ltr">{row.email}</span>
                      </div>
                      <span className="text-stone-700 text-[11px]">
                        {row.supportTypes.join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
