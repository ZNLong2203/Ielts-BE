CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role   VARCHAR(20) NOT NULL, -- admin, teacher, student
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, banned
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    avatar VARCHAR(500),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    bio TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    target_ielts_score DECIMAL(2,1), -- target IELTS band score
    current_level VARCHAR(20), -- beginner, intermediate, advanced
    learning_goals TEXT[],
    timezone VARCHAR(50),
    language_preference VARCHAR(10) DEFAULT 'vi',
    privacy_settings JSONB,
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
    total_students INTEGER DEFAULT 0,
    total_courses INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
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
    is_free BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    enrollment_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    requirements TEXT[],
    what_you_learn TEXT[],
    course_outline JSONB,
    meta_title VARCHAR(255),
    meta_description TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    video_url VARCHAR(500),
    video_duration INTEGER, -- in seconds
    audio_url VARCHAR(500),
    materials_urls TEXT[],
    ordering INTEGER DEFAULT 0,
    is_preview BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    transcript TEXT,
    subtitles JSONB, -- multi-language subtitles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lesson_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp_in_video INTEGER, -- position in video where note was taken
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent INTEGER DEFAULT 0, -- in seconds
    last_watched_position INTEGER DEFAULT 0, -- for video lessons
    completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
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
    UNIQUE(user_id, course_id)
);

CREATE TABLE exercise_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL, -- quiz, essay, speaking, listening
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    exercise_type_id UUID REFERENCES exercise_types(id),
    title VARCHAR(255) NOT NULL,
    instruction TEXT,
    content JSONB, -- flexible structure for different exercise types
    time_limit INTEGER, -- in minutes
    max_attempts INTEGER DEFAULT 1,
    passing_score DECIMAL(5,2),
    ordering INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL, -- multiple_choice, essay, speaking, true_false
    media_url VARCHAR(500), -- for listening/speaking questions
    explanation TEXT,
    points DECIMAL(5,2) DEFAULT 1,
    ordering INTEGER DEFAULT 0,
    difficulty_level VARCHAR(20), -- easy, medium, hard
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    ordering INTEGER DEFAULT 0,
    explanation TEXT,
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
    graded_by UUID REFERENCES teachers(id),
    graded_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'submitted', -- submitted, graded, needs_review
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mock_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(20), -- full_test, reading, writing, listening, speaking
    duration INTEGER, -- in minutes
    total_questions INTEGER,
    max_score DECIMAL(5,2),
    difficulty_level VARCHAR(20),
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES teachers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mock_test_id UUID REFERENCES mock_tests(id) ON DELETE CASCADE,
    overall_score DECIMAL(5,2),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    ordering INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id),
    category_id UUID REFERENCES blog_categories(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image VARCHAR(500),
    tags TEXT[],
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    reading_time INTEGER, -- estimated reading time in minutes
    meta_title VARCHAR(255),
    meta_description TEXT,
    published_at TIMESTAMP,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, course_id)
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id),
    course_title VARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    payment_method VARCHAR(50) NOT NULL, -- vnpay, momo, paypal, stripe
    transaction_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    gateway_response JSONB,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_amount DECIMAL(10,2),
    maximum_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    applicable_courses UUID[], -- specific courses or null for all
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES coupons(id),
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    discount_amount DECIMAL(10,2),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(coupon_id, user_id, order_id)
);

CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_band_score DECIMAL(2,1),
    skill_focus VARCHAR(20), -- general, reading, writing, listening, speaking
    difficulty_level VARCHAR(20),
    estimated_duration INTEGER, -- in weeks
    course_sequence UUID[], -- ordered list of course IDs
    prerequisites TEXT[],
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES teachers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    learning_path_id UUID REFERENCES learning_paths(id),
    current_course_index INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_completion DATE,
    actual_completion TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_user_progress_user_course ON user_progress(user_id, course_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_questions_exercise ON questions(exercise_id);
CREATE INDEX idx_blogs_status_published ON blogs(status, published_at);


