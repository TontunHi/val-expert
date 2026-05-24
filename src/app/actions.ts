'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseRankingsText } from '@/lib/parser';
import { addUserWithData, deleteUser, updateUsername, updateUserWithData } from '@/lib/db-queries';

export interface ActionResponse {
  success: boolean;
  error?: string;
  userId?: number;
}

export async function createUserAction(formData: FormData): Promise<ActionResponse> {
  const name = formData.get('name') as string;
  const rawText = formData.get('rankingsText') as string;

  if (!name || name.trim().length === 0) {
    return { success: false, error: 'กรุณากรอกชื่อผู้ใช้งาน (Please enter username)' };
  }

  if (!rawText || rawText.trim().length === 0) {
    return { success: false, error: 'กรุณากรอกข้อมูลลำดับความชำนาญ (Please enter ranking data)' };
  }

  // Parse text
  const parsed = parseRankingsText(rawText);
  if (parsed.errors.length > 0 && parsed.roles.length === 0 && parsed.agents.length === 0) {
    return { 
      success: false, 
      error: `ไม่สามารถนำเข้าข้อมูลได้: \n${parsed.errors.slice(0, 3).join('\n')}` 
    };
  }

  if (parsed.roles.length === 0) {
    return { success: false, error: 'ไม่พบข้อมูล Role ในข้อความที่กรอก กรุณาตรวจสอบรูปแบบข้อมูล' };
  }

  if (parsed.agents.length === 0) {
    return { success: false, error: 'ไม่พบข้อมูล Agent ในข้อความที่กรอก กรุณาตรวจสอบรูปแบบข้อมูล' };
  }

  // Save to DB
  const result = await addUserWithData(name.trim(), parsed.roles, parsed.agents);
  
  if (result.success) {
    revalidatePath('/');
    revalidatePath(`/users/${result.userId}`);
  }

  return result;
}

export async function deleteUserAction(userId: number) {
  const success = await deleteUser(userId);
  if (success) {
    revalidatePath('/');
    redirect('/');
  }
  return success;
}

export async function updateUsernameAction(userId: number, newName: string): Promise<ActionResponse> {
  if (!newName || newName.trim().length === 0) {
    return { success: false, error: 'กรุณากรอกชื่อผู้ใช้งาน' };
  }

  try {
    await updateUsername(userId, newName.trim());
    revalidatePath('/');
    revalidatePath(`/users/${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating username:', error);
    if (error.message && error.message.includes('unique constraint')) {
      return { success: false, error: 'มีผู้ใช้งานชื่อนี้อยู่ในระบบแล้ว' };
    }
    return { success: false, error: String(error) };
  }
}

export async function updateUserAction(userId: number, formData: FormData): Promise<ActionResponse> {
  const name = formData.get('name') as string;
  const rawText = formData.get('rankingsText') as string;

  if (!name || name.trim().length === 0) {
    return { success: false, error: 'กรุณากรอกชื่อผู้ใช้งาน (Please enter username)' };
  }

  if (!rawText || rawText.trim().length === 0) {
    return { success: false, error: 'กรุณากรอกข้อมูลลำดับความชำนาญ (Please enter ranking data)' };
  }

  // Parse text
  const parsed = parseRankingsText(rawText);
  if (parsed.errors.length > 0 && parsed.roles.length === 0 && parsed.agents.length === 0) {
    return { 
      success: false, 
      error: `ไม่สามารถนำเข้าข้อมูลได้: \n${parsed.errors.slice(0, 3).join('\n')}` 
    };
  }

  if (parsed.roles.length === 0) {
    return { success: false, error: 'ไม่พบข้อมูล Role ในข้อความที่กรอก กรุณาตรวจสอบรูปแบบข้อมูล' };
  }

  if (parsed.agents.length === 0) {
    return { success: false, error: 'ไม่พบข้อมูล Agent ในข้อความที่กรอก กรุณาตรวจสอบรูปแบบข้อมูล' };
  }

  // Update DB
  const result = await updateUserWithData(userId, name.trim(), parsed.roles, parsed.agents);
  
  if (result.success) {
    revalidatePath('/');
    revalidatePath(`/users/${userId}`);
  }

  return result;
}
