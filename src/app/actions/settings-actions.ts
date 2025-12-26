'use server';

import { revalidatePath } from 'next/cache';
import {
  PTOSettingsSchema,
  PTOAccrualRuleSchema,
  type ActionResult,
  type PTOSettings,
  type PTOAccrualRule,
  type PTOSettingsInput,
  type PTOAccrualRuleInput,
} from '@/types';
import { getCurrentUser } from '@/utils/firebase/auth';
import {
  getPtoSettingsCollection,
  getPtoAccrualRulesCollection,
  convertPtoSettings,
  convertPtoAccrualRule,
} from '@/utils/firebase/firestore-admin';

/**
 * Create or update PTO settings for the current user
 */
export async function savePTOSettings(
  settings: PTOSettingsInput
): Promise<ActionResult<PTOSettings>> {
  try {
    // Validate input
    const validatedSettings = PTOSettingsSchema.parse(settings);

    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date().toISOString();
    const settingsCollection = getPtoSettingsCollection();

    // Check if settings already exist
    const existing = await settingsCollection
      .where('user_id', '==', authUser.uid)
      .limit(1)
      .get();

    let settingsDoc: FirebaseFirestore.DocumentSnapshot;

    if (!existing.empty) {
      // Update existing settings
      const settingsRef = existing.docs[0].ref;
      await settingsRef.update({
        ...validatedSettings,
        updated_at: now,
      });
      settingsDoc = await settingsRef.get();
    } else {
      // Insert new settings
      const newRef = settingsCollection.doc();
      await newRef.set({
        user_id: authUser.uid,
        ...validatedSettings,
        created_at: now,
        updated_at: now,
      });
      settingsDoc = await newRef.get();
    }

    const data = convertPtoSettings(settingsDoc);
    if (!data) {
      return { success: false, error: 'Failed to save PTO settings' };
    }

    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error) {
    console.error('Error in savePTOSettings:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to save PTO settings' };
  }
}

/**
 * Get PTO settings for the current user
 */
export async function getPTOSettings(): Promise<ActionResult<PTOSettings | null>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const settingsCollection = getPtoSettingsCollection();
    const snapshot = await settingsCollection
      .where('user_id', '==', authUser.uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: true, data: null };
    }

    const data = convertPtoSettings(snapshot.docs[0]);
    return { success: true, data };
  } catch (error) {
    console.error('Error in getPTOSettings:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch PTO settings' };
  }
}

/**
 * Add an accrual rule for the current user
 */
export async function addAccrualRule(
  rule: PTOAccrualRuleInput
): Promise<ActionResult<PTOAccrualRule>> {
  try {
    // Validate input
    const validatedRule = PTOAccrualRuleSchema.parse(rule);

    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date().toISOString();
    const rulesCollection = getPtoAccrualRulesCollection();

    const docRef = rulesCollection.doc();
    await docRef.set({
      user_id: authUser.uid,
      name: validatedRule.name,
      accrual_amount: validatedRule.accrual_amount,
      accrual_frequency: validatedRule.accrual_frequency,
      accrual_day: validatedRule.accrual_day || null,
      effective_date: validatedRule.effective_date,
      end_date: validatedRule.end_date || null,
      is_active: validatedRule.is_active ?? true,
      created_at: now,
      updated_at: now,
    });

    const newDoc = await docRef.get();
    const data = convertPtoAccrualRule(newDoc);

    if (!data) {
      return { success: false, error: 'Failed to create accrual rule' };
    }

    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error) {
    console.error('Error in addAccrualRule:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to add accrual rule' };
  }
}

/**
 * Get all accrual rules for the current user
 */
export async function getAccrualRules(): Promise<ActionResult<PTOAccrualRule[]>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const rulesCollection = getPtoAccrualRulesCollection();
    const snapshot = await rulesCollection
      .where('user_id', '==', authUser.uid)
      .where('is_active', '==', true)
      .orderBy('effective_date', 'desc')
      .get();

    const rules = snapshot.docs
      .map(doc => convertPtoAccrualRule(doc))
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return { success: true, data: rules };
  } catch (error) {
    console.error('Error in getAccrualRules:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch accrual rules' };
  }
}

/**
 * Deactivate an accrual rule
 */
export async function deactivateAccrualRule(ruleId: string): Promise<ActionResult> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const rulesCollection = getPtoAccrualRulesCollection();
    const ruleRef = rulesCollection.doc(ruleId);
    const ruleDoc = await ruleRef.get();

    if (!ruleDoc.exists) {
      return { success: false, error: 'Accrual rule not found' };
    }

    // Verify ownership
    const ruleData = ruleDoc.data();
    if (ruleData?.user_id !== authUser.uid) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date().toISOString();
    await ruleRef.update({
      is_active: false,
      updated_at: now,
    });

    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deactivateAccrualRule:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to deactivate accrual rule' };
  }
}

/**
 * Process PTO accruals for the current user
 * Note: In Firestore, we don't have stored procedures, so this logic runs in the app
 */
export async function processPTOAccruals(): Promise<ActionResult<number>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // In the Firestore version, accrual processing is handled client-side
    // based on the accrual rules and current date. This is a placeholder
    // that returns 0 processed accruals.
    // The actual balance calculation happens in getUserDashboardData.

    revalidatePath('/dashboard');

    return { success: true, data: 0 };
  } catch (error) {
    console.error('Error in processPTOAccruals:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to process PTO accruals' };
  }
}
