CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role   VARCHAR(20) NOT NULL, -- admin, teacher, student
    full_name VARCHAR(255),
    avatar VARCHAR(500),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    country VARCHAR(100),
    city VARCHAR(100),
    auth_provider VARCHAR(50) DEFAULT 'local', -- local, google
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, banned
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    target_ielts_score DECIMAL(2,1), -- target IELTS band score
    current_level DECIMAL(2,1), -- current IELTS band score
    learning_goals TEXT[],
    language_preference VARCHAR(10) DEFAULT 'vi',
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    qualification TEXT,
    experience_years INTEGER,
    specializations TEXT[], -- reading, writing, listening, speaking
    ielts_band_score DECIMAL(2,1),
    certificate_urls TEXT[],
    teaching_style TEXT,
    hourly_rate DECIMAL(10,2),
    availability JSONB, -- schedule availability
    rating DECIMAL(2,1) DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, inactive
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE course_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    ordering INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id),
    category_id UUID REFERENCES course_categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500),
    skill_focus VARCHAR(20), -- reading, writing, listening, speaking, general
    difficulty_level VARCHAR(20), -- beginner, intermediate, advanced
    estimated_duration INTEGER, -- in hours
    price DECIMAL(10,2) DEFAULT 0,
    discount_price DECIMAL(10,2),
    is_featured BOOLEAN DEFAULT FALSE,
    enrollment_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    requirements TEXT[],
    what_you_learn TEXT[],
    course_outline JSONB,
    tags TEXT[],
    published_at TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    certificate_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE combo_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL, --band range: 3.5 - 5.0, 4.0 - 5.0, 5.0 - 6.0, ... 
    description TEXT,
    thumbnail VARCHAR(500),
    original_price DECIMAL(10,2) NOT NULL,
    combo_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2),
    course_ids UUID[] NOT NULL, -- array of course IDs included in combo
    enrollment_count INTEGER DEFAULT 0,
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE combo_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    combo_id UUID REFERENCES combo_courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    overall_progress_percentage DECIMAL(5,2) DEFAULT 0,
    certificate_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    ordering INTEGER DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    lesson_type VARCHAR(20) DEFAULT 'video', -- video, document, quiz, assignment
    video_url VARCHAR(500),
    video_duration INTEGER, -- in seconds
    document_url VARCHAR(500), -- for PDF, slides, etc.
    ordering INTEGER DEFAULT 0,
    is_preview BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lesson_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    completion_date TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE section_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    completed_lessons INTEGER DEFAULT 0,
    total_lessons INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, section_id)
);

CREATE TABLE mock_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(20), -- reading, writing, listening, speaking, full_test
    duration INTEGER, -- in minutes
    total_questions INTEGER,
    difficulty_level VARCHAR(20), -- beginner, intermediate, advanced
    target_band_score DECIMAL(2,1), -- target IELTS band score
    instructions TEXT, -- general instructions for the test
    created_by UUID REFERENCES users(id),
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mock_test_id UUID REFERENCES mock_tests(id) ON DELETE CASCADE,
    section_name VARCHAR(100) NOT NULL, -- "Listening Section 1", "Reading Passage 1", etc.
    section_type VARCHAR(20) NOT NULL, -- listening, reading, writing, speaking
    description TEXT,
    duration INTEGER, -- in minutes
    ordering INTEGER DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mock_test_id UUID REFERENCES mock_tests(id) ON DELETE CASCADE,
    band_score DECIMAL(2,1),
    reading_score DECIMAL(5,2),
    writing_score DECIMAL(5,2),
    listening_score DECIMAL(5,2),
    speaking_score DECIMAL(5,2),
    time_taken INTEGER,
    detailed_results JSONB,
    recommendations TEXT,
    strengths TEXT[],
    weaknesses TEXT[],
    status VARCHAR(20) DEFAULT 'completed', -- completed, in_progress, abandoned
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE section_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_result_id UUID REFERENCES test_results(id) ON DELETE CASCADE,
    test_section_id UUID REFERENCES test_sections(id) ON DELETE CASCADE,
    band_score DECIMAL(2,1),
    time_taken INTEGER, -- in seconds
    correct_answers INTEGER,
    total_questions INTEGER,
    detailed_answers JSONB, -- detailed answers for each question
    ai_feedback TEXT,
    ai_score DECIMAL(5,2),
    teacher_feedback TEXT,
    teacher_score DECIMAL(5,2),
    grading_method VARCHAR(20) DEFAULT 'ai', -- ai, teacher, hybrid
    graded_by UUID REFERENCES users(id), -- User ID of the teacher who graded
    graded_at TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE, -- nullable for standalone exercises
    test_section_id UUID REFERENCES test_sections(id) ON DELETE CASCADE, -- nullable for lesson exercises
    title VARCHAR(255) NOT NULL,
    instruction TEXT,
    audio_url VARCHAR(500),
    content JSONB, -- flexible structure for different exercise types
    exercise_type VARCHAR(20) DEFAULT 'lesson', -- lesson, mock_test, practice
    skill_type VARCHAR(20), -- reading, writing, listening, speaking, general
    time_limit INTEGER, -- in minutes
    max_attempts INTEGER DEFAULT 1,
    passing_score DECIMAL(5,2),
    ordering INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_exercise_context CHECK (
        (lesson_id IS NOT NULL AND test_section_id IS NULL) OR 
        (lesson_id IS NULL AND test_section_id IS NOT NULL) OR
        (lesson_id IS NULL AND test_section_id IS NULL)
    )
);

CREATE TABLE question_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    image_url VARCHAR(500),
    group_title VARCHAR(255), -- "Questions 1-4", "Questions 5-10"
    group_instruction TEXT NOT NULL, -- "Which paragraph contains each of the following pieces of information?"
    passage_reference TEXT, -- "The text has 5 paragraphs (A - E)"
    question_type VARCHAR(20) NOT NULL, -- multiple_choice, essay, speaking, true_false, fill_blank, matching
    ordering INTEGER DEFAULT 0,
    question_range VARCHAR(20), -- "1-4", "5-10" for display
    correct_answer_count INTEGER DEFAULT 1,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE matching_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID REFERENCES question_groups(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    ordering INTEGER DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    question_group_id UUID REFERENCES question_groups(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL, -- multiple_choice, essay, speaking, true_false, fill_blank, matching, summary_completion
    image_url VARCHAR(500), -- for images, videos, etc.
    audio_url VARCHAR(500), -- specifically for listening questions
    audio_duration INTEGER, -- in seconds for listening questions
    reading_passage TEXT, -- for reading questions
    explanation TEXT,
    points DECIMAL(5,2) DEFAULT 1,
    ordering INTEGER DEFAULT 0,
    question_group VARCHAR(50), -- for grouping related questions (e.g., "Passage 1", "Task 1")
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    matching_option_id UUID REFERENCES matching_options(id) ON DELETE SET NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    ordering INTEGER DEFAULT 0,
    point DECIMAL(5,2) DEFAULT 1,
    explanation TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE user_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    attempt_number INTEGER DEFAULT 1,
    answers JSONB, -- store user answers
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    time_taken INTEGER, -- in seconds
    feedback TEXT,
    teacher_feedback TEXT,
    teacher_score DECIMAL(5,2),
    ai_feedback TEXT,
    ai_score DECIMAL(5,2),
    grading_method VARCHAR(20) DEFAULT 'ai', -- ai, teacher, hybrid
    graded_by UUID REFERENCES users(id), -- User ID of the teacher who graded
    graded_at TIMESTAMP,
    ai_graded_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'submitted', -- submitted, graded, needs_review, ai_graded
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE writing_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL, -- nullable for free-form practice
    task_type VARCHAR(10) NOT NULL, -- 'task_1' or 'task_2'
    question TEXT NOT NULL,
    student_answer TEXT NOT NULL,
    word_limit VARCHAR(50),
    additional_instructions TEXT,
    -- Overall scores
    overall_score DECIMAL(3,1), -- 0.0 to 9.0
    task_achievement_score DECIMAL(3,1),
    coherence_cohesion_score DECIMAL(3,1),
    lexical_resource_score DECIMAL(3,1),
    grammatical_range_accuracy_score DECIMAL(3,1),
    -- Detailed AI feedback
    detailed_feedback TEXT,
    suggestions JSONB, -- array of suggestion strings
    strengths JSONB, -- array of strength strings
    weaknesses JSONB, -- array of weakness strings
    -- Detailed metrics (Task 1 & Task 2 specific)
    detailed_metrics JSONB, -- full detailed metrics structure
    -- Sample answers
    upgraded_essay TEXT,
    sample_answer TEXT,
    -- Metadata
    ai_model VARCHAR(50), -- e.g., 'gemini-2.5-flash'
    grading_method VARCHAR(20) DEFAULT 'ai',
    status VARCHAR(20) DEFAULT 'completed', -- completed, failed, processing
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE question_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES user_submissions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    selected_options UUID[],
    media_url VARCHAR(500), -- for speaking/audio answers
    is_correct BOOLEAN,
    points_earned DECIMAL(5,2),
    ai_feedback TEXT,
    ai_points DECIMAL(5,2),
    teacher_feedback TEXT,
    teacher_points DECIMAL(5,2),
    grading_method VARCHAR(20) DEFAULT 'ai', -- ai, teacher, hybrid
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    ordering INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id),
    category_id UUID REFERENCES blog_categories(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image VARCHAR(500),
    tags TEXT[],
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    is_featured BOOLEAN DEFAULT FALSE,
    like_count INTEGER DEFAULT 0,
    published_at TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    parent_comment_id UUID REFERENCES blog_comments(id),
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    like_count INTEGER DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, comment_id)
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id),
    course_title VARCHAR(255),
    combo_id UUID REFERENCES combo_courses(id),
    combo_name VARCHAR(255),
    item_type VARCHAR(20) DEFAULT 'course', -- course, combo
    price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    payment_method VARCHAR(50) NOT NULL, -- zalopay, stripe
    transaction_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded, cancelled
    gateway_response JSONB,
    processed_at TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    coupon_type VARCHAR(20) DEFAULT 'course', -- course, combo
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_amount DECIMAL(10,2),
    maximum_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    applicable_combos UUID[], -- specific combo IDs or null for all (when coupon_type = 'combo')
    created_by UUID REFERENCES users(id),
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES coupons(id),
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    combo_id UUID REFERENCES combo_courses(id), -- for combo coupons
    discount_amount DECIMAL(10,2),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(coupon_id, user_id, order_id)
);

CREATE TABLE study_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Link to combo or individual course
    combo_id UUID REFERENCES combo_courses(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    
    -- When to study
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER, -- in minutes (auto-calculated)
    
    -- Study plan
    study_goal TEXT,
    notes TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, missed, cancelled
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    actual_duration INTEGER,
    
    -- Performance
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    productivity_rating INTEGER, -- 1-5
    session_notes TEXT,
    
    -- Reminder
    reminder_enabled BOOLEAN DEFAULT TRUE,
    reminder_minutes_before INTEGER DEFAULT 30,
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE study_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES study_schedules(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    scheduled_time TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_sections_course ON sections(course_id);
CREATE INDEX idx_lessons_section ON lessons(section_id);
CREATE INDEX idx_user_progress_user_course ON user_progress(user_id, course_id);
CREATE INDEX idx_user_progress_user_lesson ON user_progress(user_id, lesson_id);
CREATE INDEX idx_section_progress_user_section ON section_progress(user_id, section_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_blogs_status_published ON blogs(status, published_at);
CREATE INDEX idx_combo_enrollments_user ON combo_enrollments(user_id);
CREATE INDEX idx_combo_enrollments_combo ON combo_enrollments(combo_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_type_active ON coupons(coupon_type, is_active);
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);


