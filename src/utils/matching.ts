import { Volunteer, SupportType, Governorate, MatchingResult } from '../types';

/**
 * Pure rule-based matching algorithm (strictly no AI):
 * 1. Support type offered by volunteer includes requested type
 * 2. Volunteer status "تم التحقق" = true
 * 3. Current cases < max cases (currentCases < maxCases)
 * 4. Governorate matches requested governorate OR volunteer offers online
 * 5. Pick volunteer with lowest current active cases count (currentCases)
 * 6. Must have at least one available slot
 */
export function matchVolunteer(
  volunteers: Volunteer[],
  requestedType: SupportType,
  requestedGov: Governorate
): MatchingResult {
  // Step 1 to 4: Filter candidates
  const eligibleVolunteers = volunteers.filter((vol) => {
    // Rule 1: Offers requested support type
    if (!vol.supportTypes.includes(requestedType)) {
      return false;
    }

    // Rule 2: Verified = true
    if (!vol.isVerified) {
      return false;
    }

    // Rule 3: Current cases < max cases
    if (vol.currentCases >= vol.maxCases) {
      return false;
    }

    // Rule 4: Governorate matches OR offers online
    if (requestedGov === 'أونلاين') {
      if (!vol.offersOnline) return false;
    } else {
      const matchGov = vol.governorate === requestedGov;
      const offersOnline = vol.offersOnline;
      if (!matchGov && !offersOnline) return false;
    }

    // Must have at least one available slot to book immediately
    if (!vol.availableSlots || vol.availableSlots.length === 0) {
      return false;
    }

    return true;
  });

  if (eligibleVolunteers.length === 0) {
    return {
      matched: false,
      reason: 'لا توجد متطوعة متفرغة حالياً مطابقة للشروط والمواعيد',
    };
  }

  // Rule 5: Sort by lowest currentCases ascending.
  // If tied, prioritize local governorate match over online fallback, then most available slots
  eligibleVolunteers.sort((a, b) => {
    if (a.currentCases !== b.currentCases) {
      return a.currentCases - b.currentCases;
    }
    // Location tie-break if not online request
    if (requestedGov !== 'أونلاين') {
      const aLocal = a.governorate === requestedGov ? 1 : 0;
      const bLocal = b.governorate === requestedGov ? 1 : 0;
      if (aLocal !== bLocal) return bLocal - aLocal;
    }
    // Slot availability tie-break
    return b.availableSlots.length - a.availableSlots.length;
  });

  return {
    matched: true,
    volunteer: eligibleVolunteers[0],
  };
}
