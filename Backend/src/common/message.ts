export const MESSAGE = {
  AUTH: {
    REGISTER_SUCCESS:
      'Register successfully. Please check your email to verify your account.',
    EMAIL_VERIFICATION_SUCCESS:
      'Email verification successful. You can now log in.',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'User has been logged out successfully!',
    TOKEN_REFRESH_SUCCESS: 'Token has been refreshed successfully!',
    PASSWORD_RESET_SUCCESS:
      'Password has been reset successfully. Please log in again.',
    GET_PROFILE_SUCCESS: 'User profile retrieved successfully.',
    FORGOT_PASSWORD_SUCCESS: 'Password reset link has been sent to your email.',
  },

  USER: {
    PROFILE_UPDATE: 'User profile updated successfully',
    STATUS_UPDATE: 'User status updated successfully',
    USER_NOT_FOUND: 'User not found',
    USER_ALREADY_EXISTS: 'User with this email already exists',
    USER_EMAIL_VERIFICATION_SENT: 'Email verification link sent successfully',
  },

  STUDENT: {
    STUDENT_LIST: 'All students retrieved successfully',
    STUDENT_INFO: 'Student information retrieved successfully',
    STUDENT_UPDATE: 'Student information updated successfully',
  },

  BLOG: {
    BLOG_CATEGORY_CREATED: 'Blog category created successfully',
    BLOG_CATEGORY_UPDATED: 'Blog category updated successfully',
    BLOG_CATEGORY_DELETED: 'Blog category deleted successfully',
    BLOG_CATEGORY_NOT_FOUND: 'Blog category not found',
    BLOG_CATEGORIES_FETCHED: 'Blog categories fetched successfully',
    BLOGS_FETCHED: 'Blogs fetched successfully',
    BLOG_FETCHED: 'Blog fetched successfully',
    BLOG_NOT_FOUND: 'Blog not found',
    BLOG_CREATED: 'Blog created successfully',
    BLOG_UPDATED: 'Blog updated successfully',
    BLOG_DELETED: 'Blog deleted successfully',
    COMMENT_ADDED: 'Comment added successfully',
    COMMENT_DELETED: 'Comment deleted successfully',
  },

  FILES: {
    FILE_USER_AVATAR_UPLOADED: 'User avatar uploaded successfully',
    FILE_CERTIFICATE_UPLOADED: 'Certificate uploaded successfully',
    FILE_BLOG_IMAGE_UPLOADED: 'Blog image uploaded successfully',
    FILE_EXERCISE_IMAGE_UPLOADED: 'Exercise image uploaded successfully',
    FILE_COURSE_THUMBNAIL_UPLOADED: 'Course thumbnail uploaded successfully',
    FILE_LESSON_MATERIAL_UPLOADED: 'Lesson material uploaded successfully',
    FILE_AUDIO_UPLOADED: 'Audio file uploaded successfully',
  },

  GENERAL: {
    OPERATION_SUCCESS: 'Operation completed successfully',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    INTERNAL_ERROR: 'Internal server error',
  },

  ERROR: {
    INVALID_TOKEN: 'Invalid or expired token',
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_ALREADY_EXISTS: 'User already exists',
    USER_NOT_FOUND: 'User not found',
    EMAIL_NOT_VERIFIED: 'Email not verified',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
    VALIDATION_ERROR: 'Validation error',
    UNEXPECTED_ERROR: 'An unexpected error occurred',
    DATABASE_ERROR: 'Database operation failed',
    REDIS_ERROR: 'Redis operation failed',
    FILE_UPLOAD_ERROR: 'File upload failed',
    FILE_NOT_FOUND: 'File not found',
  },
};
