'use server';

import { revalidatePath } from 'next/cache';
import { CustomHolidaySchema, type ActionResult, type CustomHoliday } from '@/types';
import { getCurrentUser } from '@/utils/firebase/auth';
import { getAdminDb } from '@/utils/firebase/admin';
import {
  getCustomHolidaysCollection,
  convertCustomHoliday,
} from '@/utils/firebase/firestore-admin';

/**
 * Add a custom holiday for the current user
 */
export async function addCustomHoliday(
  name: string,
  date: string,
  repeatsYearly: boolean = false,
  isPaidHoliday: boolean = true
): Promise<ActionResult<CustomHoliday>> {
  try {
    // Validate input
    CustomHolidaySchema.parse({
      name,
      date,
      repeats_yearly: repeatsYearly,
      is_paid_holiday: isPaidHoliday,
    });

    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date().toISOString();
    const holidaysCollection = getCustomHolidaysCollection();

    const docRef = holidaysCollection.doc();
    await docRef.set({
      user_id: authUser.uid,
      name,
      date,
      repeats_yearly: repeatsYearly,
      is_paid_holiday: isPaidHoliday,
      created_at: now,
      updated_at: now,
    });

    const newDoc = await docRef.get();
    const holiday = convertCustomHoliday(newDoc);

    if (!holiday) {
      return { success: false, error: 'Failed to create holiday' };
    }

    revalidatePath('/dashboard');

    return { success: true, data: holiday };
  } catch (error) {
    console.error('Error in addCustomHoliday:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to add custom holiday' };
  }
}

/**
 * Delete a custom holiday
 */
export async function deleteCustomHoliday(holidayId: string): Promise<ActionResult> {
  try {
    if (!holidayId || typeof holidayId !== 'string' || holidayId.trim() === '') {
      return { success: false, error: 'Holiday ID is required' };
    }

    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const holidaysCollection = getCustomHolidaysCollection();
    const holidayRef = holidaysCollection.doc(holidayId.trim());
    const holidayDoc = await holidayRef.get();

    if (!holidayDoc.exists) {
      return { success: false, error: 'Holiday not found' };
    }

    // Verify ownership
    const holidayData = holidayDoc.data();
    if (holidayData?.user_id !== authUser.uid) {
      return { success: false, error: 'Unauthorized' };
    }

    await holidayRef.delete();

    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deleteCustomHoliday:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete custom holiday' };
  }
}

/**
 * Get all custom holidays for the current user
 */
export async function getCustomHolidays(year?: number): Promise<ActionResult<CustomHoliday[]>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const holidaysCollection = getCustomHolidaysCollection();
    let query = holidaysCollection
      .where('user_id', '==', authUser.uid)
      .orderBy('date', 'asc');

    const snapshot = await query.get();

    let holidays = snapshot.docs
      .map(doc => convertCustomHoliday(doc))
      .filter((h): h is NonNullable<typeof h> => h !== null);

    // Filter by year if provided
    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      holidays = holidays.filter(h => h.date >= startDate && h.date <= endDate);
    }

    return { success: true, data: holidays };
  } catch (error) {
    console.error('Error in getCustomHolidays:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch custom holidays' };
  }
}

/**
 * Batch add holidays from external API
 */
export async function batchAddHolidays(
  holidays: Array<{ name: string; date: string; repeatsYearly?: boolean; isPaidHoliday?: boolean }>
): Promise<ActionResult<CustomHoliday[]>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    if (holidays.length === 0) {
      return { success: true, data: [] };
    }

    const now = new Date().toISOString();
    const db = getAdminDb();
    const holidaysCollection = getCustomHolidaysCollection();

    const batch = db.batch();
    const docRefs: FirebaseFirestore.DocumentReference[] = [];

    for (const holiday of holidays) {
      const docRef = holidaysCollection.doc();
      docRefs.push(docRef);
      batch.set(docRef, {
        user_id: authUser.uid,
        name: holiday.name,
        date: holiday.date,
        repeats_yearly: holiday.repeatsYearly ?? false,
        is_paid_holiday: holiday.isPaidHoliday ?? true,
        created_at: now,
        updated_at: now,
      });
    }

    await batch.commit();

    // Fetch the created documents
    const results: CustomHoliday[] = [];
    for (const docRef of docRefs) {
      const doc = await docRef.get();
      const holiday = convertCustomHoliday(doc);
      if (holiday) {
        results.push(holiday);
      }
    }

    revalidatePath('/dashboard');

    return { success: true, data: results };
  } catch (error) {
    console.error('Error in batchAddHolidays:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to batch add holidays' };
  }
}

/**
 * Clear all holidays for a specific year
 */
export async function clearHolidaysForYear(year: number, includeRepeating: boolean = true): Promise<ActionResult> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const holidaysCollection = getCustomHolidaysCollection();
    const snapshot = await holidaysCollection
      .where('user_id', '==', authUser.uid)
      .get();

    const db = getAdminDb();
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const holidayDate = data.date;

      // Check if holiday is in the specified year range
      if (holidayDate >= startDate && holidayDate <= endDate) {
        // Check if we should skip repeating holidays
        if (!includeRepeating && data.repeats_yearly) {
          continue;
        }
        batch.delete(doc.ref);
      }
    }

    await batch.commit();

    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in clearHolidaysForYear:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to clear holidays' };
  }
}

/**
 * Update a custom holiday
 */
export async function updateCustomHoliday(
  holidayId: string,
  updates: Partial<Pick<CustomHoliday, 'name' | 'date' | 'repeats_yearly' | 'is_paid_holiday'>>
): Promise<ActionResult<CustomHoliday>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!holidayId) {
      return { success: false, error: 'Holiday ID is required' };
    }

    const holidaysCollection = getCustomHolidaysCollection();
    const holidayRef = holidaysCollection.doc(holidayId);
    const holidayDoc = await holidayRef.get();

    if (!holidayDoc.exists) {
      return { success: false, error: 'Holiday not found' };
    }

    // Verify ownership
    const holidayData = holidayDoc.data();
    if (holidayData?.user_id !== authUser.uid) {
      return { success: false, error: 'Unauthorized' };
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.repeats_yearly !== undefined) payload.repeats_yearly = updates.repeats_yearly;
    if (updates.is_paid_holiday !== undefined) payload.is_paid_holiday = updates.is_paid_holiday;

    if (Object.keys(payload).length === 1) {
      // Only updated_at, no actual updates
      return { success: false, error: 'No updates provided' };
    }

    await holidayRef.update(payload);

    const updatedDoc = await holidayRef.get();
    const holiday = convertCustomHoliday(updatedDoc);

    if (!holiday) {
      return { success: false, error: 'Failed to fetch updated holiday' };
    }

    revalidatePath('/dashboard');

    return { success: true, data: holiday };
  } catch (error) {
    console.error('Error in updateCustomHoliday:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update holiday' };
  }
}
