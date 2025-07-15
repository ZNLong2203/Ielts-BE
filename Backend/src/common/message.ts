export const MESSAGE = {
  AUTH: {
    REGISTER_SUCCESS:
      'Register successfully. Please check your email to verify your account.',
    EMAIL_VERIFICATION_SUCCESS:
      'Email verification successful. You can now log in.',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'User has been logged out successfully!',
    TOKEN_REFRESH_SUCCESS: 'Token has been refreshed successfully!',
  },

  USER: {
    PROFILE_UPDATED: 'Profile updated (permission required)',
    ACCOUNT_DELETED: 'Account deleted (permission required)',
    PUBLIC_INFO: 'Anyone can access this public info',
    USER_INFO: 'User info (auth required, no permission check)',
    PROFILE_INFO: 'User profile (permission required)',
    STATUS_OK: 'Service status is ok',
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
