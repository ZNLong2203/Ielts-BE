import { Request } from 'express';
import { ServiceTypeMap } from 'src/types/ability.types';

/**
 * Helper function to get service from request context with proper typing
 * @param request Express request object
 * @param serviceName Name of the service to retrieve
 * @returns The requested service with proper typing
 * @throws Error if service is not available in context
 */
export function getService<K extends keyof ServiceTypeMap>(
  request: Request,
  serviceName: K,
): ServiceTypeMap[K] {
  if (!request.serviceContext || !request.serviceContext[serviceName]) {
    throw new Error(`Service ${serviceName} not available in request context`);
  }

  return request.serviceContext[serviceName] as ServiceTypeMap[K];
}

/**
 * Helper function for getting services not in the predefined map
 * @param request Express request object
 * @param serviceName Name of the custom service
 * @returns The requested service with specified type
 */
export function getCustomService<T>(request: Request, serviceName: string): T {
  if (!request.serviceContext || !request.serviceContext[serviceName]) {
    throw new Error(
      `Custom service ${serviceName} not available in request context`,
    );
  }

  return request.serviceContext[serviceName] as T;
}
