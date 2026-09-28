import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_VOLUNTEERS, INITIAL_BOOKINGS, INITIAL_WAITING_LIST } from './src/data/initialData';
import { Volunteer, Booking, WaitingListEntry, SupportType, Governorate } from './src/types';
import { matchVolunteer } from './src/utils/matching';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SanadAdmin2026!';

interface DatabaseSchema {
  volunteers: Volunteer[];
  bookings: Booking[];
  waitingList: WaitingListEntry[];
  lastUpdated: string;
}

// Ensure database file exists
function initDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DatabaseSchema = {
      volunteers: INITIAL_VOLUNTEERS,
      bookings: INITIAL_BOOKINGS,
      waitingList: INITIAL_WAITING_LIST,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json, re-initializing', err);
    const initialDb: DatabaseSchema = {
      volunteers: INITIAL_VOLUNTEERS,
      bookings: INITIAL_BOOKINGS,
      waitingList: INITIAL_WAITING_LIST,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }
}

function saveDb(db: DatabaseSchema) {
  db.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

/**
 * Automatically tries to match waiting list candidates if volunteers have free capacity & slots
 */
function processWaitingListAuto(db: DatabaseSchema): { matchedCount: number } {
  let matchedCount = 0;
  const waitingEntries = db.waitingList.filter((e) => e.status === 'waiting');

  for (const entry of waitingEntries) {
    const match = matchVolunteer(db.volunteers, entry.supportType, entry.governorate);
    if (match.matched && match.volunteer && match.volunteer.availableSlots.length > 0) {
      const vol = db.volunteers.find((v) => v.id === match.volunteer!.id);
      if (vol && vol.availableSlots.length > 0 && vol.currentCases < vol.maxCases) {
        // Take the earliest slot
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

        db.bookings.unshift(newBooking);
        entry.status = 'assigned';
        entry.assignedVolunteerId = vol.id;
        entry.assignedBookingId = bookingId;
        matchedCount++;
      }
    }
  }

  if (matchedCount > 0) {
    saveDb(db);
  }
  return { matchedCount };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Get matching candidate for fighter flow preview
  app.post('/api/match/find', (req: Request, res: Response) => {
    const { supportType, governorate } = req.body;
    if (!supportType || !governorate) {
      return res.status(400).json({ error: 'Missing supportType or governorate' });
    }
    const db = initDb();
    const result = matchVolunteer(db.volunteers, supportType as SupportType, governorate as Governorate);
    if (!result.matched || !result.volunteer) {
      return res.json({ matched: false, reason: result.reason || 'لا توجد متطوعة متفرغة حالياً' });
    }

    // Return volunteer details (safe public view) and her available slots
    return res.json({
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
    });
  });

  // Confirm booking or register in waiting list
  app.post('/api/bookings/confirm', (req: Request, res: Response) => {
    const {
      fighterFirstName,
      fighterContact,
      supportType,
      governorate,
      volunteerId,
      slotId,
      consentGiven,
    } = req.body;

    if (!consentGiven) {
      return res.status(400).json({ error: 'يجب الموافقة الصريحة على حفظ البيانات للمتابعة' });
    }
    if (!fighterFirstName || !fighterContact || !supportType || !governorate) {
      return res.status(400).json({ error: 'جميع الحقول الأساسية مطلوبة' });
    }

    const db = initDb();

    // If volunteerId and slotId are provided, book with that volunteer
    if (volunteerId && slotId) {
      const vol = db.volunteers.find((v) => v.id === volunteerId);
      if (!vol) {
        return res.status(404).json({ error: 'المتطوعة غير موجودة' });
      }

      if (vol.currentCases >= vol.maxCases) {
        return res.status(409).json({ error: 'المتطوعة وصلت للحد الأقصى من الحالات، سيتم تحويلك لقائمة الانتظار' });
      }

      const slotIndex = vol.availableSlots.findIndex((s) => s.id === slotId);
      if (slotIndex === -1) {
        return res.status(409).json({ error: 'هذا الموعد لم يعد متاحاً، يُرجى اختيار موعد آخر' });
      }

      const bookedSlot = vol.availableSlots[slotIndex];
      // Rule 6: Increase current cases by 1 and remove slot from available
      vol.currentCases += 1;
      vol.availableSlots.splice(slotIndex, 1);

      const bookingId = `SND-${Math.floor(1000 + Math.random() * 9000)}`;
      const booking: Booking = {
        id: bookingId,
        fighterFirstName: fighterFirstName.trim(),
        fighterContact: fighterContact.trim(),
        supportType: supportType as SupportType,
        governorate: governorate as Governorate,
        volunteerId: vol.id,
        volunteerName: vol.name,
        slot: bookedSlot,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      db.bookings.unshift(booking);
      saveDb(db);

      return res.json({
        success: true,
        type: 'booked',
        booking,
      });
    }

    // Otherwise, enroll in waiting list (Rule 7)
    const waitingId = `WAIT-${Math.floor(1000 + Math.random() * 9000)}`;
    const waitingEntry: WaitingListEntry = {
      id: waitingId,
      fighterFirstName: fighterFirstName.trim(),
      fighterContact: fighterContact.trim(),
      supportType: supportType as SupportType,
      governorate: governorate as Governorate,
      requestedAt: new Date().toISOString(),
      status: 'waiting',
    };

    db.waitingList.unshift(waitingEntry);
    saveDb(db);

    return res.json({
      success: true,
      type: 'waiting_list',
      waitingEntry,
    });
  });

  // "امسحي بياناتي" (Erase my data)
  app.post('/api/fighter/erase-data', (req: Request, res: Response) => {
    const { identifier } = req.body; // booking ID or phone/email
    if (!identifier) {
      return res.status(400).json({ error: 'يرجى تقديم كود الحجز أو رقم التواصل/الإيميل' });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const db = initDb();

    let removedBookingsCount = 0;
    let removedWaitingCount = 0;

    // Check bookings
    const remainingBookings: Booking[] = [];
    for (const b of db.bookings) {
      const matchId = b.id.toLowerCase() === cleanId;
      const matchContact = b.fighterContact.toLowerCase() === cleanId;
      if (matchId || matchContact) {
        removedBookingsCount++;
        // If active, decrement volunteer currentCases
        if (b.status === 'active') {
          const vol = db.volunteers.find((v) => v.id === b.volunteerId);
          if (vol && vol.currentCases > 0) {
            vol.currentCases -= 1;
            // Optionally restore slot
            vol.availableSlots.push({
              ...b.slot,
              id: `slot-restored-${Date.now()}`,
              notes: 'موعد أعيد فتحه بعد إلغاء الحجز',
            });
          }
        }
      } else {
        remainingBookings.push(b);
      }
    }
    db.bookings = remainingBookings;

    // Check waiting list
    const remainingWaiting: WaitingListEntry[] = [];
    for (const w of db.waitingList) {
      const matchId = w.id.toLowerCase() === cleanId;
      const matchContact = w.fighterContact.toLowerCase() === cleanId;
      if (matchId || matchContact) {
        removedWaitingCount++;
      } else {
        remainingWaiting.push(w);
      }
    }
    db.waitingList = remainingWaiting;

    if (removedBookingsCount === 0 && removedWaitingCount === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على أي بيانات مسجلة مطابقة لهذا الرمز أو الرقم' });
    }

    saveDb(db);

    // Auto-check waiting list in case a slot/capacity opened
    processWaitingListAuto(db);

    return res.json({
      success: true,
      message: 'تم مسح وحذف كافة بياناتكِ تماماً من النظام بنجاح وبسرية تامة.',
      removedBookingsCount,
      removedWaitingCount,
    });
  });

  // Fighter lookup booking status
  app.get('/api/fighter/lookup', (req: Request, res: Response) => {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'يرجى إدخال رمز الحجز أو الهاتف' });
    }
    const clean = String(query).trim().toLowerCase();
    const db = initDb();

    const booking = db.bookings.find(
      (b) => b.id.toLowerCase() === clean || b.fighterContact.toLowerCase() === clean
    );

    if (booking) {
      return res.json({
        found: true,
        type: 'booking',
        data: {
          id: booking.id,
          fighterFirstName: booking.fighterFirstName,
          supportType: booking.supportType,
          volunteerName: booking.volunteerName,
          slot: booking.slot,
          status: booking.status,
          createdAt: booking.createdAt,
        },
      });
    }

    const waiting = db.waitingList.find(
      (w) => w.id.toLowerCase() === clean || w.fighterContact.toLowerCase() === clean
    );

    if (waiting) {
      return res.json({
        found: true,
        type: 'waiting',
        data: {
          id: waiting.id,
          fighterFirstName: waiting.fighterFirstName,
          supportType: waiting.supportType,
          status: waiting.status,
          requestedAt: waiting.requestedAt,
        },
      });
    }

    return res.status(404).json({ found: false, error: 'لم يتم العثور على حجز أو تسجيل مطابق' });
  });

  // Volunteer registration
  app.post('/api/volunteers/register', (req: Request, res: Response) => {
    const {
      name,
      email,
      phone,
      password,
      supportTypes,
      governorate,
      offersOnline,
      maxCases,
      availableSlots,
      bio,
    } = req.body;

    if (!name || !email || !phone || !supportTypes || !governorate || !maxCases) {
      return res.status(400).json({ error: 'جميع البيانات المطلوبة يجب ملؤها' });
    }

    const db = initDb();

    // Check email uniqueness
    const exists = db.volunteers.find((v) => v.email.toLowerCase() === String(email).trim().toLowerCase());
    if (exists) {
      return res.status(409).json({ error: 'البريد الإلكتروني مسجل بالفعل لدى متطوعة أخرى' });
    }

    const newVolunteer: Volunteer = {
      id: `vol-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: password || '123456',
      supportTypes: Array.isArray(supportTypes) ? supportTypes : [supportTypes],
      governorate: governorate as Governorate,
      offersOnline: Boolean(offersOnline),
      maxCases: Math.max(1, Number(maxCases) || 3),
      currentCases: 0,
      isVerified: false, // Saved as "قيد المراجعة"
      availableSlots: Array.isArray(availableSlots) ? availableSlots : [],
      bio: bio ? bio.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    db.volunteers.push(newVolunteer);
    saveDb(db);

    return res.json({
      success: true,
      message: 'تم تسجيل بياناتكِ بنجاح وهي الآن قيد المراجعة والاعتماد من قبل الإدارة.',
      volunteerId: newVolunteer.id,
    });
  });

  // Volunteer Login
  app.post('/api/volunteers/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
    }

    const db = initDb();
    const volunteer = db.volunteers.find(
      (v) => v.email.toLowerCase() === String(email).trim().toLowerCase()
    );

    if (!volunteer) {
      return res.status(401).json({ error: 'البريد الإلكتروني غير مسجل' });
    }

    if (volunteer.password && volunteer.password !== password.trim()) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }

    // PRIVACY ENFORCEMENT: ONLY return bookings belonging to this volunteer!
    const myBookings = db.bookings.filter((b) => b.volunteerId === volunteer.id);

    const safeVolunteer = { ...volunteer };
    delete safeVolunteer.password;

    return res.json({
      success: true,
      volunteer: safeVolunteer,
      bookings: myBookings,
    });
  });

  // Volunteer "أنهيت المتابعة" (Complete Case)
  app.post('/api/volunteers/:id/complete-case', (req: Request, res: Response) => {
    const volunteerId = req.params.id;
    const { bookingId } = req.body;

    const db = initDb();
    const vol = db.volunteers.find((v) => v.id === volunteerId);
    if (!vol) {
      return res.status(404).json({ error: 'المتطوعة غير موجودة' });
    }

    const booking = db.bookings.find((b) => b.id === bookingId && b.volunteerId === volunteerId);
    if (!booking) {
      return res.status(404).json({ error: 'الحجز غير موجود' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ error: 'تم إنهاء هذه المتابعة مسبقاً' });
    }

    booking.status = 'completed';
    booking.completedAt = new Date().toISOString();

    // Decrease volunteer current cases by 1
    if (vol.currentCases > 0) {
      vol.currentCases -= 1;
    }

    saveDb(db);

    // Auto-allocate waiting list candidate if possible!
    const autoResult = processWaitingListAuto(db);

    // Return updated bookings for this volunteer only
    const myBookings = db.bookings.filter((b) => b.volunteerId === volunteerId);

    return res.json({
      success: true,
      message: 'تم إنهاء المتابعة بنجاح وتحديث سعة الاستيعاب.',
      currentCases: vol.currentCases,
      autoAllocatedCount: autoResult.matchedCount,
      bookings: myBookings,
    });
  });

  // Volunteer adds available slot
  app.post('/api/volunteers/:id/slots', (req: Request, res: Response) => {
    const volunteerId = req.params.id;
    const { dayName, date, time, notes } = req.body;

    if (!dayName || !date || !time) {
      return res.status(400).json({ error: 'بيانات الموعد غير مكتملة' });
    }

    const db = initDb();
    const vol = db.volunteers.find((v) => v.id === volunteerId);
    if (!vol) {
      return res.status(404).json({ error: 'المتطوعة غير موجودة' });
    }

    const newSlot = {
      id: `slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dayName,
      date,
      time,
      notes,
    };

    vol.availableSlots.push(newSlot);
    saveDb(db);

    // Auto check waiting list
    processWaitingListAuto(db);

    return res.json({
      success: true,
      slots: vol.availableSlots,
    });
  });

  // Admin authentication check helper
  const checkAdminAuth = (req: Request, res: Response): boolean => {
    const authHeader = req.headers.authorization;
    const password = req.body?.adminPassword || authHeader?.replace('Bearer ', '');
    if (password !== ADMIN_PASSWORD) {
      res.status(403).json({ error: 'كلمة مرور الإدارة غير صحيحة' });
      return false;
    }
    return true;
  };

  // Admin overview (all volunteers, all bookings, waiting list)
  app.post('/api/admin/overview', (req: Request, res: Response) => {
    if (!checkAdminAuth(req, res)) return;
    const db = initDb();

    return res.json({
      volunteers: db.volunteers,
      bookings: db.bookings,
      waitingList: db.waitingList,
      stats: {
        totalVolunteers: db.volunteers.length,
        verifiedVolunteers: db.volunteers.filter((v) => v.isVerified).length,
        pendingVolunteers: db.volunteers.filter((v) => !v.isVerified).length,
        totalBookings: db.bookings.length,
        activeBookings: db.bookings.filter((b) => b.status === 'active').length,
        completedBookings: db.bookings.filter((b) => b.status === 'completed').length,
        waitingCount: db.waitingList.filter((w) => w.status === 'waiting').length,
      },
    });
  });

  // Admin verify / approve volunteer
  app.post('/api/admin/verify-volunteer', (req: Request, res: Response) => {
    if (!checkAdminAuth(req, res)) return;
    const { volunteerId, isVerified } = req.body;

    const db = initDb();
    const vol = db.volunteers.find((v) => v.id === volunteerId);
    if (!vol) {
      return res.status(404).json({ error: 'المتطوعة غير موجودة' });
    }

    vol.isVerified = Boolean(isVerified);
    saveDb(db);

    // If verified, attempt to process waiting list
    let autoResult = { matchedCount: 0 };
    if (vol.isVerified) {
      autoResult = processWaitingListAuto(db);
    }

    return res.json({
      success: true,
      volunteer: vol,
      autoAllocatedCount: autoResult.matchedCount,
    });
  });

  // Admin process waiting list manually
  app.post('/api/admin/process-waiting-list', (req: Request, res: Response) => {
    if (!checkAdminAuth(req, res)) return;
    const db = initDb();
    const result = processWaitingListAuto(db);
    return res.json({
      success: true,
      matchedCount: result.matchedCount,
      waitingList: db.waitingList,
      bookings: db.bookings,
    });
  });

  // Admin import volunteers from CSV data
  app.post('/api/admin/import-csv', (req: Request, res: Response) => {
    if (!checkAdminAuth(req, res)) return;
    const { volunteersData } = req.body; // array of parsed volunteer records

    if (!Array.isArray(volunteersData) || volunteersData.length === 0) {
      return res.status(400).json({ error: 'لا توجد بيانات صالحة للاستيراد' });
    }

    const db = initDb();
    let importedCount = 0;

    for (const item of volunteersData) {
      if (!item.name || !item.email) continue;

      const existingIndex = db.volunteers.findIndex(
        (v) => v.email.toLowerCase() === String(item.email).trim().toLowerCase()
      );

      const parsedVolunteer: Volunteer = {
        id: item.id || `vol-csv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: String(item.name).trim(),
        email: String(item.email).trim().toLowerCase(),
        phone: String(item.phone || '01000000000').trim(),
        password: item.password || 'password123',
        supportTypes: Array.isArray(item.supportTypes)
          ? item.supportTypes
          : (String(item.supportTypes || 'طبيبة أورام').split(/[;,]/).map((s: string) => s.trim()) as SupportType[]),
        governorate: (item.governorate || 'القاهرة') as Governorate,
        offersOnline: item.offersOnline === true || item.offersOnline === 'نعم' || item.offersOnline === 'true',
        maxCases: Number(item.maxCases) || 4,
        currentCases: Number(item.currentCases) || 0,
        isVerified: item.isVerified === true || item.isVerified === 'نعم' || item.isVerified === 'true',
        availableSlots: Array.isArray(item.availableSlots) ? item.availableSlots : [],
        bio: item.bio || 'متطوعة متخصصة تم استيرادها عبر ملف CSV',
        createdAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        db.volunteers[existingIndex] = { ...db.volunteers[existingIndex], ...parsedVolunteer };
      } else {
        db.volunteers.push(parsedVolunteer);
      }
      importedCount++;
    }

    saveDb(db);
    processWaitingListAuto(db);

    return res.json({
      success: true,
      importedCount,
      totalVolunteers: db.volunteers.length,
    });
  });

  // Mount Vite or static serving
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Sanad] Server is running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
