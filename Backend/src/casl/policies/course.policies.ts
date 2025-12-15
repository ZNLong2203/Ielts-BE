// src/casl/policies/course.policies.ts
import { Request } from 'express';
import { AppAbility, PolicyHandlerCallback } from 'src/types/ability.types';
import { Course, CourseCategory } from '../entities';
import { Action } from '../enums/action.enum';

/**
 * Check if user can create course
 */
export const canCreateCourse: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  return ability.can(Action.Create, Course);
};

/**
 * Check if user can update course
 * No database access - uses body.teacher_id or user role to determine permission
 */
export const canUpdateCourse: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  const courseId = request.params.id;

  // If no ID provided, check generic permission
  if (!courseId) {
    return ability.can(Action.Update, Course);
  }

  // Get teacher ID from request body if provided
  const teacherId = request.body?.teacher_id;

  // Create course subject for permission check
  const courseSubject = new Course({
    id: courseId,
    teacherId: teacherId,
  });

  // Check if user can update this course
  return ability.can(Action.Update, courseSubject);
};

/**
 * Check if user can publish course
 */
export const canPublishCourse: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  const courseId = request.params.id;

  if (!courseId) {
    return ability.can(Action.Publish, Course);
  }

  const teacherId = request.body?.teacher_id;

  const courseSubject = new Course({
    id: courseId,
    teacherId: teacherId,
  });

  return ability.can(Action.Publish, courseSubject);
};

/**
 * Check if user can feature course (admin only)
 */
export const canFeatureCourse: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  return ability.can(Action.Feature, Course);
};

/**
 * Check if user can create course category (admin only)
 */
export const canManageCourseCategories: PolicyHandlerCallback = async (
  ability: AppAbility,
): Promise<boolean> => {
  return ability.can(Action.Manage, CourseCategory);
};
