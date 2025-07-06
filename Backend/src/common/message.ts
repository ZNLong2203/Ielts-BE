export const MESSAGE = {
  // Auth messages
  AUTH: {
    REGISTER_SUCCESS:
      'Register successfully. Please check your email to verify your account.',
    EMAIL_VERIFICATION_SUCCESS:
      'Email verification successful. You can now log in.',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'User has been logged out successfully!',
    TOKEN_REFRESH_SUCCESS: 'Token has been refreshed successfully!',
  },

  // User messages
  USER: {
    PROFILE_UPDATED: 'Profile updated (permission required)',
    ACCOUNT_DELETED: 'Account deleted (permission required)',
    PUBLIC_INFO: 'Anyone can access this public info',
    USER_INFO: 'User info (auth required, no permission check)',
    PROFILE_INFO: 'User profile (permission required)',
    STATUS_OK: 'Service status is ok',
  },

  // General messages
  GENERAL: {
    OPERATION_SUCCESS: 'Operation completed successfully',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    INTERNAL_ERROR: 'Internal server error',
  },

  // Error messages
  ERROR: {
    INVALID_TOKEN: 'Invalid or expired token',
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_ALREADY_EXISTS: 'User already exists',
    USER_NOT_FOUND: 'User not found',
    EMAIL_NOT_VERIFIED: 'Email not verified',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
    VALIDATION_ERROR: 'Validation error',
  },
};
