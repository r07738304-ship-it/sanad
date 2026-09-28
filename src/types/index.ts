export const SUPPORT_TYPES = [
  'طبيبة أورام',
  'طبيبة نفسية',
  'أخصائية نفسية',
  'لايف كوتش',
  'معالجة بالفن',
  'معلومات أو توعية صحية',
  'أخصائية علاج طبيعي',
  'أخصائية اجتماعية',
  'متخصصة في دعم وتمكين المرأة',
  'مدربة مهارات',
] as const;

export type SupportType = typeof SUPPORT_TYPES[number];

export const GOVERNORATES = [
  'أونلاين',
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الدقهلية',
  'الغربية',
  'الشرقية',
  'القليوبية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح',
  'شمال سيناء',
  'جنوب سيناء',
  'أخرى / خارج مصر',
] as const;

export type Governorate = typeof GOVERNORATES[number];

export interface AppointmentSlot {
  id: string;
  dayName: string; // e.g. "الأحد"
  date: string;    // e.g. "2026-10-05"
  time: string;    // e.g. "05:00 م"
  notes?: string;  // e.g. "مكالمة هاتفية أو عبر زووم"
}

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  supportTypes: SupportType[];
  governorate: Governorate;
  offersOnline: boolean;
  maxCases: number;
  currentCases: number;
  isVerified: boolean; // تم التحقق
  availableSlots: AppointmentSlot[];
  bio?: string;
  createdAt: string;
}

export interface Booking {
  id: string; // reference code, e.g. "SND-7482"
  fighterFirstName: string;
  fighterContact: string; // phone or email
  supportType: SupportType;
  governorate: Governorate;
  volunteerId: string;
  volunteerName: string;
  slot: AppointmentSlot;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

export interface WaitingListEntry {
  id: string;
  fighterFirstName: string;
  fighterContact: string;
  supportType: SupportType;
  governorate: Governorate;
  requestedAt: string;
  status: 'waiting' | 'assigned' | 'cancelled';
  assignedVolunteerId?: string;
  assignedBookingId?: string;
}

export interface MatchingResult {
  matched: boolean;
  volunteer?: Volunteer;
  reason?: string;
}
