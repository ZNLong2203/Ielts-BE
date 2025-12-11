// src/casl/policies/teacher.policies.ts
import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { AppAbility, PolicyHandlerCallback } from 'src/types/ability.types';
import { Teacher } from '../entities';
import { Action } from '../enums/action.enum';
import { getService } from './base.policies';

/**
 * Check if user can update teacher profile
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

  // Get teacher from database
  const teachersService = getService(request, 'teachersService');
  const teacher = await teachersService.findOne(teacherId);

  if (!teacher) {
    throw new NotFoundException('Teacher not found');
  }

  // Create teacher subject for permission check
  const teacherSubject = new Teacher({
    id: teacher.id,
    userId: teacher.id,
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
  const teacherId = request.params.id;

  // If no specific ID, check generic permission
  if (!teacherId) {
    return ability.can(Action.UpdateStatus, Teacher);
  }

  // Get teacher from database
  const teachersService = getService(request, 'teachersService');
  const teacher = await teachersService.findOne(teacherId);

  if (!teacher) {
    throw new NotFoundException('Teacher not found');
  }

  // Create teacher subject for permission check
  const teacherSubject = new Teacher({
    id: teacher.id,
    userId: teacher.id,
  });

  // Check if user can update status (typically only admins)
  return ability.can(Action.UpdateStatus, teacherSubject);
};

export const canUpdateTeacherCertification: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  const teacherId = request.params.id ?? null;

  // If no specific ID, check generic permission
  if (!teacherId) {
    console.log('No teacher ID in request params');
    return ability.can(Action.UpdateCertification, Teacher);
  }

  // Get teacher from database
  const teachersService = getService(request, 'teachersService');
  const teacher = await teachersService.findOne(teacherId);

  if (!teacher) {
    throw new NotFoundException('Teacher not found');
  }

  // Create teacher subject for permission check
  const teacherSubject = new Teacher({
    id: teacher.id,
    userId: teacher.id,
  });

  // Check if user can update certification (typically only admins)
  return ability.can(Action.UpdateCertification, teacherSubject);
};
