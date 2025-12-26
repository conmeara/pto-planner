'use server';

import { revalidatePath } from 'next/cache';
import { PTODaySchema, type ActionResult, type PTODay } from '@/types';
import { getCurrentUser } from '@/utils/firebase/auth';
import { getAdminDb } from '@/utils/firebase/admin';
import {
  getPtoDaysCollection,
  convertPtoDay,
} from '@/utils/firebase/firestore-admin';

/**
 * Add a new PTO day for the current user
 */
export async function addPTODay(
  date: string,
  amount: number,
  description?: string
): Promise<ActionResult<PTODay>> {
  try {
    // Validate input
    const validatedInput = PTODaySchema.parse({
      date,
      amount,
      status: 'planned',
      description,
    });

    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date().toISOString();
    const ptoDaysCollection = getPtoDaysCollection();

    // Check if PTO day already exists for this date
    const existingDay = await ptoDaysCollection
      .where('user_id', '==', authUser.uid)
      .where('date', '==', validatedInput.date)
      .limit(1)
      .get();

    if (!existingDay.empty) {
      return { success: false, error: 'PTO day already exists for this date' };
    }

    // Add new PTO day
    const docRef = ptoDaysCollection.doc();
    await docRef.set({
      user_id: authUser.uid,
      date: validatedInput.date,
      amount: validatedInput.amount,
      status: validatedInput.status,
      description: validatedInput.description || null,
      created_at: now,
      updated_at: now,
    });

    const newDoc = await docRef.get();
    const ptoDay = convertPtoDay(newDoc);

    if (!ptoDay) {
      return { success: false, error: 'Failed to create PTO day' };
    }

    revalidatePath('/dashboard');

    return { success: true, data: ptoDay };
  } catch (error) {
    console.error('Error in addPTODay:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to add PTO day' };
  }
}

/**
 * Delete a PTO day
 */
export async function deletePTODay(ptoDate: string): Promise<ActionResult> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const ptoDaysCollection = getPtoDaysCollection();
    const existingDay = await ptoDaysCollection
      .where('user_id', '==', authUser.uid)
      .where('date', '==', ptoDate)
      .limit(1)
      .get();

    if (existingDay.empty) {
      return { success: false, error: 'PTO day not found' };
    }

    await existingDay.docs[0].ref.delete();

    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deletePTODay:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete PTO day' };
  }
}

/**
 * Update PTO day status
 */
export async function updatePTODayStatus(
  ptoDate: string,
  newStatus: 'planned' | 'approved' | 'taken' | 'cancelled'
): Promise<ActionResult> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date().toISOString();
    const ptoDaysCollection = getPtoDaysCollection();
    const existingDay = await ptoDaysCollection
      .where('user_id', '==', authUser.uid)
      .where('date', '==', ptoDate)
      .limit(1)
      .get();

    if (existingDay.empty) {
      return { success: false, error: 'PTO day not found' };
    }

    await existingDay.docs[0].ref.update({
      status: newStatus,
      updated_at: now,
    });

    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updatePTODayStatus:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update PTO day status' };
  }
}

/**
 * Get all PTO days for the current user
 */
export async function getPTODays(
  startDate?: string,
  endDate?: string
): Promise<ActionResult<PTODay[]>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    let query = getPtoDaysCollection()
      .where('user_id', '==', authUser.uid)
      .orderBy('date', 'asc');

    // Note: Firestore doesn't support multiple inequality filters on different fields
    // So we filter in code after fetching
    const snapshot = await query.get();

    let ptoDays = snapshot.docs
      .map(doc => convertPtoDay(doc))
      .filter((day): day is NonNullable<typeof day> => day !== null);

    // Apply date filters in code
    if (startDate) {
      ptoDays = ptoDays.filter(d => d.date >= startDate);
    }
    if (endDate) {
      ptoDays = ptoDays.filter(d => d.date <= endDate);
    }

    return { success: true, data: ptoDays };
  } catch (error) {
    console.error('Error in getPTODays:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch PTO days' };
  }
}

/**
 * Batch add PTO days
 */
export async function batchAddPTODays(
  days: Array<{ date: string; amount: number; description?: string }>
): Promise<ActionResult<PTODay[]>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!days || days.length === 0) {
      return { success: true, data: [] };
    }

    const now = new Date().toISOString();
    const db = getAdminDb();
    const ptoDaysCollection = getPtoDaysCollection();

    // Get existing dates to avoid duplicates
    const existingDays = await ptoDaysCollection
      .where('user_id', '==', authUser.uid)
      .get();
    const existingDates = new Set(existingDays.docs.map(doc => doc.data().date));

    // Filter out duplicates
    const newDays = days.filter(d => !existingDates.has(d.date));

    if (newDays.length === 0) {
      return { success: true, data: [] };
    }

    // Add new days in batch
    const batch = db.batch();
    const docRefs: FirebaseFirestore.DocumentReference[] = [];

    for (const day of newDays) {
      const docRef = ptoDaysCollection.doc();
      docRefs.push(docRef);
      batch.set(docRef, {
        user_id: authUser.uid,
        date: day.date,
        amount: day.amount,
        status: 'planned',
        description: day.description || 'Suggested PTO',
        created_at: now,
        updated_at: now,
      });
    }

    await batch.commit();

    // Fetch the created documents
    const results: PTODay[] = [];
    for (const docRef of docRefs) {
      const doc = await docRef.get();
      const ptoDay = convertPtoDay(doc);
      if (ptoDay) {
        results.push(ptoDay);
      }
    }

    revalidatePath('/dashboard');

    return { success: true, data: results };
  } catch (error) {
    console.error('Error in batchAddPTODays:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to batch add PTO days' };
  }
}
