// src/casl/policies/course.policies.ts
import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { AppAbility, PolicyHandlerCallback } from 'src/types/ability.types';
import { Course, CourseCategory } from '../entities';
import { Action } from '../enums/action.enum';
import { getService } from './base.policies';

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

  // Get course from database
  const coursesService = getService(request, 'coursesService');
  const course = await coursesService.findById(courseId);

  if (!course) {
    throw new NotFoundException('Course not found');
  }

  // Create course subject for permission check
  const courseSubject = new Course({
    id: course.id,
    teacherId: course.teacher?.id,
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

  const coursesService = getService(request, 'coursesService');
  const course = await coursesService.findById(courseId);

  if (!course) {
    throw new NotFoundException('Course not found');
  }

  const courseSubject = new Course({
    id: course.id,
    teacherId: course.teacher?.id,
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
