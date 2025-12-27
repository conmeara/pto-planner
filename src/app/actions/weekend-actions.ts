'use server';

import { revalidatePath } from 'next/cache';
import { WeekendConfigSchema, type ActionResult, type WeekendConfig } from '@/types';
import { getCurrentUser } from '@/utils/firebase/auth';
import {
  getWeekendConfigCollection,
  convertWeekendConfig,
} from '@/utils/firebase/firestore-admin';

/**
 * Update weekend configuration for the current user
 */
export async function updateWeekendConfig(
  dayOfWeek: number,
  isWeekend: boolean
): Promise<ActionResult> {
  try {
    // Validate input
    WeekendConfigSchema.parse({ day_of_week: dayOfWeek, is_weekend: isWeekend });

    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date().toISOString();
    const weekendCollection = getWeekendConfigCollection();

    // Find the existing config for this day
    const existingConfig = await weekendCollection
      .where('user_id', '==', authUser.uid)
      .where('day_of_week', '==', dayOfWeek)
      .limit(1)
      .get();

    if (existingConfig.empty) {
      // Create new config
      const docRef = weekendCollection.doc();
      await docRef.set({
        user_id: authUser.uid,
        day_of_week: dayOfWeek,
        is_weekend: isWeekend,
        created_at: now,
        updated_at: now,
      });
    } else {
      // Update existing config
      await existingConfig.docs[0].ref.update({
        is_weekend: isWeekend,
        updated_at: now,
      });
    }

    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updateWeekendConfig:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update weekend configuration' };
  }
}

/**
 * Get weekend configuration for the current user
 */
export async function getWeekendConfig(): Promise<ActionResult<WeekendConfig[]>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const weekendCollection = getWeekendConfigCollection();
    const snapshot = await weekendCollection
      .where('user_id', '==', authUser.uid)
      .orderBy('day_of_week', 'asc')
      .get();

    const config = snapshot.docs
      .map(doc => convertWeekendConfig(doc))
      .filter((c): c is NonNullable<typeof c> => c !== null);

    return { success: true, data: config };
  } catch (error) {
    console.error('Error in getWeekendConfig:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch weekend configuration' };
  }
}

/**
 * Get weekend days as an array of day numbers (0-6)
 */
export async function getWeekendDays(): Promise<ActionResult<number[]>> {
  try {
    const result = await getWeekendConfig();

    if (!result.success) {
      return result;
    }

    const weekendDays = result.data
      .filter((config) => config.is_weekend)
      .map((config) => config.day_of_week);

    return { success: true, data: weekendDays };
  } catch (error) {
    console.error('Error in getWeekendDays:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch weekend days' };
  }
}

/**
 * Batch update weekend configuration
 */
export async function batchUpdateWeekendConfig(
  weekendDays: number[]
): Promise<ActionResult> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date().toISOString();
    const weekendCollection = getWeekendConfigCollection();

    // Get all existing configs
    const existingConfigs = await weekendCollection
      .where('user_id', '==', authUser.uid)
      .get();

    // Create a map of day_of_week to document reference
    const configMap = new Map<number, FirebaseFirestore.DocumentReference>();
    for (const doc of existingConfigs.docs) {
      const data = doc.data();
      configMap.set(data.day_of_week, doc.ref);
    }

    // Update all days (0-6)
    for (let day = 0; day <= 6; day++) {
      const isWeekend = weekendDays.includes(day);
      const existingRef = configMap.get(day);

      if (existingRef) {
        await existingRef.update({
          is_weekend: isWeekend,
          updated_at: now,
        });
      } else {
        const docRef = weekendCollection.doc();
        await docRef.set({
          user_id: authUser.uid,
          day_of_week: day,
          is_weekend: isWeekend,
          created_at: now,
          updated_at: now,
        });
      }
    }

    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in batchUpdateWeekendConfig:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to batch update weekend configuration' };
  }
}
