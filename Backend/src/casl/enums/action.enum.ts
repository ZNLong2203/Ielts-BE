// src/casl/enums/action.enum.ts
export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',

  // Specific actions
  UpdateProfile = 'update_profile',
  UpdateStatus = 'update_status',
  UpdateAvailability = 'update_availability',
  AssignCourse = 'assign_course',
  SubmitReview = 'submit_review',
  ProcessPayment = 'process_payment',

  // Specific for course
  Feature = 'feature',
  Publish = 'publish',
}
