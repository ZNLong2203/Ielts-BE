export const SCHEDULE_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  MISSED: 'missed',
  CANCELLED: 'cancelled',
};

export const REMINDER_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
};

export type ScheduleStatusType =
  (typeof SCHEDULE_STATUS)[keyof typeof SCHEDULE_STATUS];

export type ReminderStatusType =
  (typeof REMINDER_STATUS)[keyof typeof REMINDER_STATUS];

export interface StudyScheduleDetails {
  id: string;
  user_id: string | null;
  combo_id?: string | null;
  course_id: string | null;
  lesson_id?: string | null;
  scheduled_date: Date;
  start_time: Date | string;
  end_time: Date | string;
  duration: number | null;
  study_goal?: string | null;
  notes?: string | null;
  status: string | null;
  actual_start_time?: Date | null;
  actual_end_time?: Date | null;
  actual_duration?: number | null;
  completion_percentage: number;
  productivity_rating?: number | null;
  session_notes?: string | null;
  reminder_enabled: boolean | null;
  reminder_minutes_before: number | null;
  reminder_sent?: boolean | null;
  combo?: {
    id: string;
    name: string;
  };
  course?: {
    id: string;
    title: string;
    thumbnail: string | null;
    skill_focus: string | null;
  };
  lesson?: {
    id: string;
    title: string;
    lesson_type: string | null;
  };
  reminders?: Array<{
    id: string;
    title: string;
    message: string;
    scheduled_time: Date;
    status: string | null;
    is_read: boolean | null;
  }>;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface WeeklyScheduleSummary {
  week_start: Date;
  week_end: Date;
  total_sessions: number;
  completed_sessions: number;
  missed_sessions: number;
  total_planned_hours: number;
  total_actual_hours: number;
  completion_rate: number;
  schedules: StudyScheduleDetails[];
}

export interface StudyAnalytics {
  period: 'week' | 'month';
  total_sessions: number;
  completed_sessions: number;
  missed_sessions: number;
  cancelled_sessions: number;
  total_study_hours: string;
  avg_completion_percentage: string;
  avg_productivity_rating: string | null;
  most_productive_day?: string;
  most_studied_skill?: string;
  combo_progress?: ComboProgress[];
}

export interface ComboProgress {
  combo_id: string;
  combo_name: string;
  completed_courses: number;
  total_courses: number;
  progress_percentage: number;
}

export interface ComboProgressData {
  combo_id: string;
  combo_name: string;
  completed: number;
  total: number;
}

export interface ScheduleFilters {
  date?: string;
  week?: string;
  month?: string;
  status?: ScheduleStatusType;
  combo_id?: string;
  course_id?: string;
}

export interface ReminderFilters {
  status?: ReminderStatusType;
  unread?: boolean;
}

export interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
}

export interface BulkScheduleResult {
  created_count: number;
  schedules: StudyScheduleDetails[];
}

export interface ComboScheduleProgress {
  combo_id: string;
  total_sessions: number;
  completed_sessions: number;
  progress_percentage: string;
  total_study_hours: string;
  upcoming_sessions: StudyScheduleDetails[];
}

// Skill focus types
export type SkillFocus =
  | 'general'
  | 'reading'
  | 'writing'
  | 'listening'
  | 'speaking';

// Target band ranges
export type TargetBandRange = '3.5-5.0' | '5.0-6.5' | '6.5-8.0' | '8.0+';

// Day of week
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';
