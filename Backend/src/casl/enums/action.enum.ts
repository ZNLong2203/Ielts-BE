export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  ReadAll = 'read_all',

  // Các hành động cụ thể
  UpdateProfile = 'update_profile',
  UpdateStatus = 'update_status',
  UpdateAvailability = 'update_availability',
  AssignCourse = 'assign_course',
  SubmitReview = 'submit_review',
  ProcessPayment = 'process_payment',

  // Cụ thể cho giáo viên
  UpdateCertification = 'update_certification',

  // Cụ thể cho khóa học
  Feature = 'feature',
  Publish = 'publish',

  // Cụ thể cho coupon
  ApplyCoupon = 'apply_coupon',
}
