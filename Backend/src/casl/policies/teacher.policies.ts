import { Request } from 'express';
import { AppAbility, PolicyHandlerCallback } from 'src/types/ability.types';
import { Teacher } from '../entities';
import { Action } from '../enums/action.enum';

/**
 * Check if user can update teacher profile
 * No database access - relies on user ID in token matching params
 */
export const canUpdateTeacherProfile: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  const teacherId = request.params.id;

  // Nếu không có ID, kiểm tra quyền chung
  if (!teacherId) {
    return ability.can(Action.UpdateProfile, Teacher);
  }

  // Tạo teacher subject với ID từ params
  const teacherSubject = new Teacher({
    id: teacherId,
    userId: teacherId,
  });

  // Kiểm tra xem người dùng có thể cập nhật hồ sơ giáo viên này không
  return ability.can(Action.UpdateProfile, teacherSubject);
};

/**
 * Check if user can update teacher status (admin only)
 */
export const canUpdateTeacherStatus: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  return ability.can(Action.UpdateStatus, Teacher);
};

/**
 * Check if user can update teacher certification
 */
export const canUpdateTeacherCertification: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  const teacherId = request.params.id;

  // Nếu không có ID, kiểm tra quyền chung
  if (!teacherId) {
    return ability.can(Action.UpdateCertification, Teacher);
  }

  // Tạo teacher subject với ID từ params
  const teacherSubject = new Teacher({
    id: teacherId,
    userId: teacherId,
  });

  // Kiểm tra xem người dùng có thể cập nhật chứng chỉ không
  return ability.can(Action.UpdateCertification, teacherSubject);
};
