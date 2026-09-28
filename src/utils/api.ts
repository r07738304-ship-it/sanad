import {
  SupportType,
  Governorate,
  Volunteer,
  Booking,
  WaitingListEntry,
  AppointmentSlot,
} from '../types';
import { INITIAL_VOLUNTEERS, INITIAL_BOOKINGS, INITIAL_WAITING_LIST } from '../data/initialData';
import { matchVolunteer } from './matching';

const STORAGE_KEYS = {
  VOLUNTEERS: 'sanad_volunteers_v1',
  BOOKINGS: 'sanad_bookings_v1',
  WAITING_LIST: 'sanad_waiting_v1',
};

// Local storage fallback helpers
function getLocalVolunteers(): Volunteer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOLUNTEERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.VOLUNTEERS, JSON.stringify(INITIAL_VOLUNTEERS));
  return INITIAL_VOLUNTEERS;
}

function saveLocalVolunteers(data: Volunteer[]) {
  localStorage.setItem(STORAGE_KEYS.VOLUNTEERS, JSON.stringify(data));
}

function getLocalBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
  return INITIAL_BOOKINGS;
}

function saveLocalBookings(data: Booking[]) {
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(data));
}

function getLocalWaitingList(): WaitingListEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WAITING_LIST);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_WAITING_LIST;
}

function saveLocalWaitingList(data: WaitingListEntry[]) {
  localStorage.setItem(STORAGE_KEYS.WAITING_LIST, JSON.stringify(data));
}

/**
 * Local fallback waiting list auto-processing
 */
function localProcessWaitingList(): number {
  const volunteers = getLocalVolunteers();
  const bookings = getLocalBookings();
  const waitingList = getLocalWaitingList();
  let matched = 0;

  for (const entry of waitingList) {
    if (entry.status !== 'waiting') continue;
    const match = matchVolunteer(volunteers, entry.supportType, entry.governorate);
    if (match.matched && match.volunteer && match.volunteer.availableSlots.length > 0) {
      const vol = volunteers.find((v) => v.id === match.volunteer!.id);
      if (vol && vol.availableSlots.length > 0 && vol.currentCases < vol.maxCases) {
        const slot = vol.availableSlots[0];
        vol.availableSlots = vol.availableSlots.filter((s) => s.id !== slot.id);
        vol.currentCases += 1;

        const bookingId = `SND-${Math.floor(1000 + Math.random() * 9000)}`;
        const newBooking: Booking = {
          id: bookingId,
          fighterFirstName: entry.fighterFirstName,
          fighterContact: entry.fighterContact,
          supportType: entry.supportType,
          governorate: entry.governorate,
          volunteerId: vol.id,
          volunteerName: vol.name,
          slot,
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        bookings.unshift(newBooking);
        entry.status = 'assigned';
        entry.assignedVolunteerId = vol.id;
        entry.assignedBookingId = bookingId;
        matched++;
      }
    }
  }

  if (matched > 0) {
    saveLocalVolunteers(volunteers);
    saveLocalBookings(bookings);
    saveLocalWaitingList(waitingList);
  }
  return matched;
}

export const api = {
  // Find matching volunteer
  async findMatch(supportType: SupportType, governorate: Governorate) {
    try {
      const res = await fetch('/api/match/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supportType, governorate }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Local fallback
    }

    const vols = getLocalVolunteers();
    const result = matchVolunteer(vols, supportType, governorate);
    if (!result.matched || !result.volunteer) {
      return { matched: false, reason: result.reason || 'لا توجد متطوعة متفرغة حالياً' };
    }
    return {
      matched: true,
      volunteer: {
        id: result.volunteer.id,
        name: result.volunteer.name,
        supportTypes: result.volunteer.supportTypes,
        governorate: result.volunteer.governorate,
        offersOnline: result.volunteer.offersOnline,
        availableSlots: result.volunteer.availableSlots,
        bio: result.volunteer.bio,
      },
    };
  },

  // Confirm booking or enroll in waiting list
  async confirmBooking(params: {
    fighterFirstName: string;
    fighterContact: string;
    supportType: SupportType;
    governorate: Governorate;
    volunteerId?: string;
    slotId?: string;
    consentGiven: boolean;
  }) {
    try {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const { fighterFirstName, fighterContact, supportType, governorate, volunteerId, slotId } = params;
    const vols = getLocalVolunteers();
    const bookings = getLocalBookings();
    const waiting = getLocalWaitingList();

    if (volunteerId && slotId) {
      const vol = vols.find((v) => v.id === volunteerId);
      if (!vol) throw new Error('المتطوعة غير موجودة');
      const slotIndex = vol.availableSlots.findIndex((s) => s.id === slotId);
      if (slotIndex === -1) throw new Error('هذا الموعد لم يعد متاحاً');

      const bookedSlot = vol.availableSlots[slotIndex];
      vol.currentCases += 1;
      vol.availableSlots.splice(slotIndex, 1);

      const bookingId = `SND-${Math.floor(1000 + Math.random() * 9000)}`;
      const booking: Booking = {
        id: bookingId,
        fighterFirstName: fighterFirstName.trim(),
        fighterContact: fighterContact.trim(),
        supportType,
        governorate,
        volunteerId: vol.id,
        volunteerName: vol.name,
        slot: bookedSlot,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      bookings.unshift(booking);
      saveLocalVolunteers(vols);
      saveLocalBookings(bookings);

      return { success: true, type: 'booked', booking };
    }

    // Waiting list fallback
    const waitingId = `WAIT-${Math.floor(1000 + Math.random() * 9000)}`;
    const waitingEntry: WaitingListEntry = {
      id: waitingId,
      fighterFirstName: fighterFirstName.trim(),
      fighterContact: fighterContact.trim(),
      supportType,
      governorate,
      requestedAt: new Date().toISOString(),
      status: 'waiting',
    };
    waiting.unshift(waitingEntry);
    saveLocalWaitingList(waiting);

    return { success: true, type: 'waiting_list', waitingEntry };
  },

  // "امسحي بياناتي" (Erase my data)
  async eraseData(identifier: string) {
    try {
      const res = await fetch('/api/fighter/erase-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const clean = identifier.trim().toLowerCase();
    const bookings = getLocalBookings();
    const vols = getLocalVolunteers();
    const waiting = getLocalWaitingList();

    let removedBookings = 0;
    const remainingBookings = bookings.filter((b) => {
      if (b.id.toLowerCase() === clean || b.fighterContact.toLowerCase() === clean) {
        removedBookings++;
        if (b.status === 'active') {
          const v = vols.find((vol) => vol.id === b.volunteerId);
          if (v && v.currentCases > 0) {
            v.currentCases -= 1;
            v.availableSlots.push({ ...b.slot, id: `restored-${Date.now()}` });
          }
        }
        return false;
      }
      return true;
    });

    let removedWaiting = 0;
    const remainingWaiting = waiting.filter((w) => {
      if (w.id.toLowerCase() === clean || w.fighterContact.toLowerCase() === clean) {
        removedWaiting++;
        return false;
      }
      return true;
    });

    if (removedBookings === 0 && removedWaiting === 0) {
      throw new Error('لم يتم العثور على أي بيانات مسجلة مطابقة');
    }

    saveLocalBookings(remainingBookings);
    saveLocalVolunteers(vols);
    saveLocalWaitingList(remainingWaiting);
    localProcessWaitingList();

    return {
      success: true,
      message: 'تم مسح وحذف كافة بياناتكِ تماماً من النظام بنجاح وبسرية تامة.',
      removedBookingsCount: removedBookings,
      removedWaitingCount: removedWaiting,
    };
  },

  // Lookup booking
  async lookupBooking(query: string) {
    try {
      const res = await fetch(`/api/fighter/lookup?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const clean = query.trim().toLowerCase();
    const bookings = getLocalBookings();
    const waiting = getLocalWaitingList();

    const booking = bookings.find(
      (b) => b.id.toLowerCase() === clean || b.fighterContact.toLowerCase() === clean
    );
    if (booking) {
      return { found: true, type: 'booking', data: booking };
    }

    const wait = waiting.find(
      (w) => w.id.toLowerCase() === clean || w.fighterContact.toLowerCase() === clean
    );
    if (wait) {
      return { found: true, type: 'waiting', data: wait };
    }

    throw new Error('لم يتم العثور على حجز أو تسجيل مطابق');
  },

  // Volunteer registration
  async registerVolunteer(data: Partial<Volunteer>) {
    try {
      const res = await fetch('/api/volunteers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const vols = getLocalVolunteers();
    const newVol: Volunteer = {
      id: `vol-${Date.now()}`,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      password: data.password || 'password123',
      supportTypes: data.supportTypes || [],
      governorate: data.governorate || 'القاهرة',
      offersOnline: Boolean(data.offersOnline),
      maxCases: data.maxCases || 4,
      currentCases: 0,
      isVerified: false,
      availableSlots: data.availableSlots || [],
      bio: data.bio,
      createdAt: new Date().toISOString(),
    };

    vols.push(newVol);
    saveLocalVolunteers(vols);

    return {
      success: true,
      message: 'تم تسجيل بياناتكِ بنجاح وهي الآن قيد المراجعة من قبل الإدارة.',
      volunteerId: newVol.id,
    };
  },

  // Volunteer login
  async volunteerLogin(email: string, password: string) {
    try {
      const res = await fetch('/api/volunteers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const vols = getLocalVolunteers();
    const volunteer = vols.find((v) => v.email.toLowerCase() === email.trim().toLowerCase());
    if (!volunteer) throw new Error('البريد الإلكتروني غير مسجل');
    if (volunteer.password && volunteer.password !== password.trim()) {
      throw new Error('كلمة المرور غير صحيحة');
    }

    const bookings = getLocalBookings();
    // Only return cases of THIS volunteer!
    const myBookings = bookings.filter((b) => b.volunteerId === volunteer.id);

    return {
      success: true,
      volunteer,
      bookings: myBookings,
    };
  },

  // Volunteer complete case
  async volunteerCompleteCase(volunteerId: string, bookingId: string) {
    try {
      const res = await fetch(`/api/volunteers/${volunteerId}/complete-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const vols = getLocalVolunteers();
    const bookings = getLocalBookings();

    const vol = vols.find((v) => v.id === volunteerId);
    if (!vol) throw new Error('المتطوعة غير موجودة');

    const booking = bookings.find((b) => b.id === bookingId && b.volunteerId === volunteerId);
    if (!booking) throw new Error('الحجز غير موجود');

    booking.status = 'completed';
    booking.completedAt = new Date().toISOString();
    if (vol.currentCases > 0) vol.currentCases -= 1;

    saveLocalVolunteers(vols);
    saveLocalBookings(bookings);

    const autoMatched = localProcessWaitingList();
    const updatedBookings = getLocalBookings().filter((b) => b.volunteerId === volunteerId);

    return {
      success: true,
      currentCases: vol.currentCases,
      autoAllocatedCount: autoMatched,
      bookings: updatedBookings,
    };
  },

  // Volunteer add slot
  async volunteerAddSlot(volunteerId: string, slot: Omit<AppointmentSlot, 'id'>) {
    try {
      const res = await fetch(`/api/volunteers/${volunteerId}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slot),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const vols = getLocalVolunteers();
    const vol = vols.find((v) => v.id === volunteerId);
    if (!vol) throw new Error('المتطوعة غير موجودة');

    const newSlot: AppointmentSlot = {
      ...slot,
      id: `slot-${Date.now()}`,
    };
    vol.availableSlots.push(newSlot);
    saveLocalVolunteers(vols);
    localProcessWaitingList();

    return { success: true, slots: vol.availableSlots };
  },

  // Admin overview
  async adminGetOverview(adminPassword: string) {
    try {
      const res = await fetch('/api/admin/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword }),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 403) {
        throw new Error('كلمة مرور الإدارة غير صحيحة');
      }
    } catch (e: any) {
      if (e.message?.includes('غير صحيحة')) throw e;
    }

    if (adminPassword !== 'SanadAdmin2026!') {
      throw new Error('كلمة مرور الإدارة غير صحيحة');
    }

    const volunteers = getLocalVolunteers();
    const bookings = getLocalBookings();
    const waitingList = getLocalWaitingList();

    return {
      volunteers,
      bookings,
      waitingList,
      stats: {
        totalVolunteers: volunteers.length,
        verifiedVolunteers: volunteers.filter((v) => v.isVerified).length,
        pendingVolunteers: volunteers.filter((v) => !v.isVerified).length,
        totalBookings: bookings.length,
        activeBookings: bookings.filter((b) => b.status === 'active').length,
        completedBookings: bookings.filter((b) => b.status === 'completed').length,
        waitingCount: waitingList.filter((w) => w.status === 'waiting').length,
      },
    };
  },

  // Admin verify volunteer
  async adminVerifyVolunteer(adminPassword: string, volunteerId: string, isVerified: boolean) {
    try {
      const res = await fetch('/api/admin/verify-volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, volunteerId, isVerified }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const vols = getLocalVolunteers();
    const vol = vols.find((v) => v.id === volunteerId);
    if (!vol) throw new Error('المتطوعة غير موجودة');
    vol.isVerified = isVerified;
    saveLocalVolunteers(vols);

    let autoMatched = 0;
    if (isVerified) {
      autoMatched = localProcessWaitingList();
    }

    return { success: true, volunteer: vol, autoAllocatedCount: autoMatched };
  },

  // Admin process waiting list manually
  async adminProcessWaitingList(adminPassword: string) {
    try {
      const res = await fetch('/api/admin/process-waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const matched = localProcessWaitingList();
    return {
      success: true,
      matchedCount: matched,
      waitingList: getLocalWaitingList(),
      bookings: getLocalBookings(),
    };
  },

  // Admin import CSV
  async adminImportCsv(adminPassword: string, volunteersData: any[]) {
    try {
      const res = await fetch('/api/admin/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, volunteersData }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const vols = getLocalVolunteers();
    for (const item of volunteersData) {
      if (!item.name || !item.email) continue;
      const index = vols.findIndex((v) => v.email.toLowerCase() === item.email.toLowerCase());
      const newVol: Volunteer = {
        id: item.id || `vol-csv-${Date.now()}-${Math.random()}`,
        name: item.name,
        email: item.email,
        phone: item.phone || '01000000000',
        password: item.password || 'password123',
        supportTypes: Array.isArray(item.supportTypes) ? item.supportTypes : [item.supportTypes],
        governorate: item.governorate || 'القاهرة',
        offersOnline: Boolean(item.offersOnline),
        maxCases: Number(item.maxCases) || 4,
        currentCases: 0,
        isVerified: Boolean(item.isVerified),
        availableSlots: item.availableSlots || [],
        bio: item.bio || 'تم استيرادها عبر CSV',
        createdAt: new Date().toISOString(),
      };
      if (index >= 0) {
        vols[index] = { ...vols[index], ...newVol };
      } else {
        vols.push(newVol);
      }
    }
    saveLocalVolunteers(vols);
    localProcessWaitingList();

    return {
      success: true,
      importedCount: volunteersData.length,
      totalVolunteers: vols.length,
    };
  },
};
