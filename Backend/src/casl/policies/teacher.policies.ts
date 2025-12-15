// src/casl/policies/teacher.policies.ts
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

  // If no ID, check generic permission
  if (!teacherId) {
    return ability.can(Action.UpdateProfile, Teacher);
  }

  // Create teacher subject with ID from params
  const teacherSubject = new Teacher({
    id: teacherId,
    userId: teacherId,
  });

  // Check if user can update this teacher's profile
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

  // If no ID, check generic permission
  if (!teacherId) {
    return ability.can(Action.UpdateCertification, Teacher);
  }

  // Create teacher subject with ID from params
  const teacherSubject = new Teacher({
    id: teacherId,
    userId: teacherId,
  });

  // Check if user can update certification
  return ability.can(Action.UpdateCertification, teacherSubject);
};
