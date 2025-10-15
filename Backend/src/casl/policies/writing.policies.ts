// src/casl/policies/writing.policies.ts
import { AppAbility, PolicyHandlerCallback } from 'src/types/ability.types';
import { Exercise, UserSubmission } from '../entities';
import { Action } from '../enums/action.enum';

/**
 * Check if user can create writing exercise
 */
export const canCreateWritingExercise: PolicyHandlerCallback = (
  ability: AppAbility,
): boolean => {
  return ability.can(Action.Create, Exercise);
};

/**
 * Check if user can update writing exercise
 */
export const canUpdateWritingExercise: PolicyHandlerCallback = (
  ability: AppAbility,
): boolean => {
  return ability.can(Action.Update, Exercise);
};

/**
 * Check if user can submit writing exercise
 */
export const canSubmitWritingExercise: PolicyHandlerCallback = (
  ability: AppAbility,
): boolean => {
  return ability.can(Action.Create, UserSubmission);
};

/**
 * Check if user can grade writing submission
 */
export const canGradeWritingSubmission: PolicyHandlerCallback = (
  ability: AppAbility,
): boolean => {
  return ability.can(Action.Update, UserSubmission);
};

/**
 * Check if user can view writing submissions
 */
export const canViewWritingSubmissions: PolicyHandlerCallback = (
  ability: AppAbility,
): boolean => {
  return ability.can(Action.Read, UserSubmission);
};
