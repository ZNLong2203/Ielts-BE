// src/casl/enums/action.enum.ts
export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  ReadAll = 'read_all',

  // Specific actions
  UpdateProfile = 'update_profile',
  UpdateStatus = 'update_status',
  UpdateAvailability = 'update_availability',
  AssignCourse = 'assign_course',
  SubmitReview = 'submit_review',
  ProcessPayment = 'process_payment',

  // Specificc for teacher
  UpdateCertification = 'update_certification',

  // Specific for course
  Feature = 'feature',
  Publish = 'publish',

  // Specific for coupon
  ApplyCoupon = 'apply_coupon',
}
