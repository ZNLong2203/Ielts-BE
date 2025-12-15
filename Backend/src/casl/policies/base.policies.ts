/**
 * Base policies file
 *
 * This file previously contained database service access helpers.
 * Since we no longer need database access in policies, this file is kept
 * for future base policy utilities if needed.
 */

// Example: Helper to extract ID from params
export function getIdFromParams(
  request: any,
  paramName = 'id',
): string | undefined {
  return request.params?.[paramName];
}

// Example: Helper to get user ID from request
export function getCurrentUserId(request: any): string | undefined {
  return request.user?.id;
}
