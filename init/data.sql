-- Insert sample users (password: Password123#)
INSERT INTO users (id, email, password, role, full_name, avatar, phone, date_of_birth, gender, country, city, status, email_verified) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@ielts.com', '$2b$10$VYYuSuvbfSmy6q31szEedOBdiMNdfj1SScLikL3jE4kGTnWt3Z8CO', 'admin', 'Admin User', 'https://example.com/avatar1.jpg', '+84123456789', '1985-01-15', 'male', 'Vietnam', 'Ho Chi Minh City', 'active', TRUE),
('550e8400-e29b-41d4-a716-446655440002', 'teacher1@ielts.com', '$2b$10$VYYuSuvbfSmy6q31szEedOBdiMNdfj1SScLikL3jE4kGTnWt3Z8CO', 'teacher', 'John Smith', 'https://example.com/avatar2.jpg', '+84987654321', '1980-05-20', 'male', 'Vietnam', 'Hanoi', 'active', TRUE),
('550e8400-e29b-41d4-a716-446655440003', 'teacher2@ielts.com', '$2b$10$VYYuSuvbfSmy6q31szEedOBdiMNdfj1SScLikL3jE4kGTnWt3Z8CO', 'teacher', 'Sarah Johnson', 'https://example.com/avatar3.jpg', '+84901234567', '1988-08-12', 'female', 'Vietnam', 'Da Nang', 'active', TRUE),
('550e8400-e29b-41d4-a716-446655440004', 'student1@ielts.com', '$2b$10$VYYuSuvbfSmy6q31szEedOBdiMNdfj1SScLikL3jE4kGTnWt3Z8CO', 'student', 'Nguyen Van A', 'https://example.com/avatar4.jpg', '+84912345678', '1995-03-10', 'male', 'Vietnam', 'Ho Chi Minh City', 'active', TRUE),
('550e8400-e29b-41d4-a716-446655440005', 'student2@ielts.com', '$2b$10$VYYuSuvbfSmy6q31szEedOBdiMNdfj1SScLikL3jE4kGTnWt3Z8CO', 'student', 'Tran Thi B', 'https://example.com/avatar5.jpg', '+84923456789', '1997-07-25', 'female', 'Vietnam', 'Hanoi', 'active', TRUE),
('550e8400-e29b-41d4-a716-446655440006', 'student3@ielts.com', '$2b$10$VYYuSuvbfSmy6q31szEedOBdiMNdfj1SScLikL3jE4kGTnWt3Z8CO', 'student', 'Le Van C', 'https://example.com/avatar6.jpg', '+84934567890', '1996-11-30', 'male', 'Vietnam', 'Da Nang', 'active', TRUE);

-- Insert sample students
INSERT INTO students (id, user_id, bio, target_ielts_score, current_level, learning_goals, timezone, language_preference) VALUES
('450e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'Aspiring to study abroad in Australia', 7.5, 5.5, ARRAY['Academic IELTS', 'University Application', 'Writing Improvement'], 'Asia/Ho_Chi_Minh', 'vi'),
('450e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'Working professional seeking IELTS certification', 7.0, 6.0, ARRAY['General Training', 'Immigration', 'Speaking Confidence'], 'Asia/Ho_Chi_Minh', 'vi'),
('450e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 'Fresh graduate planning to work overseas', 8.0, 6.5, ARRAY['Academic IELTS', 'Band 8 Achievement', 'All Skills'], 'Asia/Ho_Chi_Minh', 'vi');

-- Insert sample teachers
INSERT INTO teachers (id, user_id, qualification, experience_years, specializations, ielts_band_score, certificate_urls, teaching_style, hourly_rate, rating, total_students, total_courses, status) VALUES
('350e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'TESOL Certified, Masters in Applied Linguistics', 8, ARRAY['reading', 'writing', 'general'], 8.5, ARRAY['https://example.com/cert1.pdf', 'https://example.com/cert2.pdf'], 'Interactive and practical approach with real-world examples', 500000, 4.8, 120, 6, 'approved'),
('350e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'CELTA Certified, 10+ years teaching experience', 12, ARRAY['speaking', 'listening', 'general'], 9.0, ARRAY['https://example.com/cert3.pdf'], 'Conversation-focused methodology with confidence building', 600000, 4.9, 95, 4, 'approved');

-- Insert sample course categories
INSERT INTO course_categories (id, name, description, icon, ordering, is_active) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'IELTS Reading', 'Master IELTS Reading skills and strategies', 'book-open', 1, TRUE),
('650e8400-e29b-41d4-a716-446655440002', 'IELTS Writing', 'Improve your IELTS Writing Task 1 and Task 2', 'edit', 2, TRUE),
('650e8400-e29b-41d4-a716-446655440003', 'IELTS Listening', 'Enhance listening skills for IELTS success', 'headphones', 3, TRUE),
('650e8400-e29b-41d4-a716-446655440004', 'IELTS Speaking', 'Build confidence in IELTS Speaking test', 'mic', 4, TRUE),
('650e8400-e29b-41d4-a716-446655440005', 'Mock Tests', 'Full-length IELTS practice tests', 'clipboard-check', 5, TRUE),
('650e8400-e29b-41d4-a716-446655440006', 'General Training', 'IELTS General Training preparation', 'users', 6, TRUE);

-- Insert sample courses
INSERT INTO courses (id, teacher_id, category_id, title, description, thumbnail, skill_focus, difficulty_level, estimated_duration, price, discount_price, is_featured, enrollment_count, rating, rating_count, requirements, what_you_learn, tags, published_at) VALUES
('950e8400-e29b-41d4-a716-446655440001', '350e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'IELTS Reading Mastery', 'Complete guide to IELTS Reading with proven strategies and practice tests', 'https://example.com/thumb1.jpg', 'reading', 'intermediate', 40, 2500000, 1800000, TRUE, 145, 4.7, 89, ARRAY['Basic English proficiency', 'Target band 6.0+'], ARRAY['Reading strategies', 'Time management', 'Question types mastery', 'Academic vocabulary'], ARRAY['ielts', 'reading', 'academic'], NOW() - INTERVAL '30 days'),
('950e8400-e29b-41d4-a716-446655440002', '350e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440004', 'IELTS Speaking Confidence', 'Build confidence and fluency for IELTS Speaking test', 'https://example.com/thumb2.jpg', 'speaking', 'beginner', 25, 2200000, 1650000, TRUE, 98, 4.8, 67, ARRAY['Conversational English'], ARRAY['Pronunciation improvement', 'Fluency techniques', 'Speaking templates', 'Mock interviews'], ARRAY['ielts', 'speaking', 'confidence'], NOW() - INTERVAL '25 days'),
('950e8400-e29b-41d4-a716-446655440003', '350e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 'Academic Writing Mastery', 'Master IELTS Academic Writing Task 1 and Task 2', 'https://example.com/thumb3.jpg', 'writing', 'advanced', 35, 2800000, 2100000, FALSE, 76, 4.6, 54, ARRAY['Intermediate writing skills', 'Grammar knowledge'], ARRAY['Task 1 strategies', 'Task 2 essay structures', 'Band 7+ vocabulary', 'Error correction'], ARRAY['ielts', 'writing', 'academic'], NOW() - INTERVAL '20 days'),
('950e8400-e29b-41d4-a716-446655440004', '350e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440003', 'IELTS Listening Skills', 'Comprehensive listening preparation with all question types', 'https://example.com/thumb4.jpg', 'listening', 'intermediate', 30, 2000000, 1500000, FALSE, 112, 4.5, 78, ARRAY['Basic listening skills'], ARRAY['Note-taking strategies', 'Accent recognition', 'Question prediction', 'Answer techniques'], ARRAY['ielts', 'listening', 'skills'], NOW() - INTERVAL '15 days'),
('950e8400-e29b-41d4-a716-446655440005', '350e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440005', 'Complete IELTS Preparation', 'Full IELTS preparation covering all four skills', 'https://example.com/thumb5.jpg', 'general', 'intermediate', 60, 4500000, 3200000, TRUE, 203, 4.9, 156, ARRAY['Elementary English'], ARRAY['All IELTS skills', 'Test strategies', 'Time management', 'Band score improvement'], ARRAY['ielts', 'complete', 'preparation'], NOW() - INTERVAL '45 days'),
('950e8400-e29b-41d4-a716-446655440006', '350e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440005', 'IELTS Mock Test Series', 'Realistic IELTS mock tests with detailed feedback', 'https://example.com/thumb6.jpg', 'general', 'intermediate', 20, 1800000, 1350000, FALSE, 87, 4.4, 43, ARRAY['Completed IELTS preparation'], ARRAY['Test experience', 'Performance analysis', 'Weakness identification', 'Score prediction'], ARRAY['ielts', 'mock', 'practice'], NOW() - INTERVAL '10 days'),
('950e8400-e29b-41d4-a716-446655440007', '350e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'IELTS Grammar Foundation', 'Essential grammar for IELTS success', 'https://example.com/thumb7.jpg', 'grammar', 'beginner', 25, 1500000, 1200000, FALSE, 134, 4.3, 92, ARRAY['Basic English'], ARRAY['Core grammar rules', 'Sentence structures', 'Common mistakes', 'Practice exercises'], ARRAY['ielts', 'grammar', 'foundation'], NOW() - INTERVAL '35 days'),
('950e8400-e29b-41d4-a716-446655440008', '350e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'IELTS Vocabulary Builder', 'Advanced vocabulary for high band scores', 'https://example.com/thumb8.jpg', 'vocabulary', 'advanced', 30, 2200000, 1700000, FALSE, 89, 4.6, 67, ARRAY['Intermediate vocabulary'], ARRAY['Academic vocabulary', 'Collocations', 'Idioms', 'Word families'], ARRAY['ielts', 'vocabulary', 'advanced'], NOW() - INTERVAL '28 days'),
('950e8400-e29b-41d4-a716-446655440009', '350e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440003', 'IELTS Pronunciation Mastery', 'Perfect your pronunciation for IELTS Speaking', 'https://example.com/thumb9.jpg', 'speaking', 'intermediate', 20, 1800000, 1400000, FALSE, 76, 4.5, 58, ARRAY['Basic pronunciation'], ARRAY['Sound patterns', 'Intonation', 'Stress patterns', 'Connected speech'], ARRAY['ielts', 'pronunciation', 'speaking'], NOW() - INTERVAL '22 days'),
('950e8400-e29b-41d4-a716-446655440010', '350e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440004', 'IELTS Time Management', 'Master time management for all IELTS sections', 'https://example.com/thumb10.jpg', 'general', 'intermediate', 15, 1200000, 900000, FALSE, 95, 4.4, 71, ARRAY['Basic IELTS knowledge'], ARRAY['Time strategies', 'Section planning', 'Speed techniques', 'Practice drills'], ARRAY['ielts', 'time-management', 'strategy'], NOW() - INTERVAL '18 days'),
('950e8400-e29b-41d4-a716-446655440011', '350e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440005', 'IELTS Band 7+ Writing', 'Advanced writing techniques for Band 7+', 'https://example.com/thumb11.jpg', 'writing', 'advanced', 40, 3200000, 2400000, TRUE, 67, 4.8, 45, ARRAY['Band 6+ writing'], ARRAY['Complex structures', 'Advanced vocabulary', 'Coherence', 'Task achievement'], ARRAY['ielts', 'writing', 'band7'], NOW() - INTERVAL '40 days'),
('950e8400-e29b-41d4-a716-446655440012', '350e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', 'IELTS Band 8+ Reading', 'Expert reading strategies for Band 8+', 'https://example.com/thumb12.jpg', 'reading', 'advanced', 35, 2800000, 2100000, FALSE, 45, 4.9, 32, ARRAY['Band 7+ reading'], ARRAY['Speed reading', 'Complex texts', 'Inference skills', 'Critical analysis'], ARRAY['ielts', 'reading', 'band8'], NOW() - INTERVAL '25 days'),
('950e8400-e29b-41d4-a716-446655440013', '350e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440003', 'IELTS Band 8+ Speaking', 'Advanced speaking for Band 8+', 'https://example.com/thumb13.jpg', 'speaking', 'advanced', 30, 2500000, 1900000, FALSE, 38, 4.7, 28, ARRAY['Band 7+ speaking'], ARRAY['Fluency mastery', 'Lexical resource', 'Grammatical range', 'Pronunciation excellence'], ARRAY['ielts', 'speaking', 'band8'], NOW() - INTERVAL '30 days'),
('950e8400-e29b-41d4-a716-446655440014', '350e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440004', 'IELTS Band 8+ Listening', 'Expert listening for Band 8+', 'https://example.com/thumb14.jpg', 'listening', 'advanced', 25, 2200000, 1700000, FALSE, 42, 4.6, 35, ARRAY['Band 7+ listening'], ARRAY['Complex accents', 'Fast speech', 'Inference', 'Detail recognition'], ARRAY['ielts', 'listening', 'band8'], NOW() - INTERVAL '20 days'),
('950e8400-e29b-41d4-a716-446655440015', '350e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440005', 'IELTS General Training', 'Complete GT preparation', 'https://example.com/thumb15.jpg', 'general', 'intermediate', 50, 3800000, 2800000, FALSE, 78, 4.5, 56, ARRAY['Basic English'], ARRAY['GT reading', 'GT writing', 'Listening', 'Speaking'], ARRAY['ielts', 'general-training', 'complete'], NOW() - INTERVAL '35 days');

-- Insert sample combo courses
INSERT INTO combo_courses (id, name, description, thumbnail, original_price, combo_price, discount_percentage, course_ids, enrollment_count, tags, created_by) VALUES
('850e8400-e29b-41d4-a716-446655440001', '3.5 - 5.0', 'Foundation to intermediate level preparation', 'https://example.com/combo1.jpg', 9500000, 6500000, 31.58, ARRAY['950e8400-e29b-41d4-a716-446655440007', '950e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440010']::UUID[], 45, ARRAY['foundation', 'intermediate'], '550e8400-e29b-41d4-a716-446655440001'),
('850e8400-e29b-41d4-a716-446655440002', '5.0 - 6.0', 'Intermediate to upper-intermediate preparation', 'https://example.com/combo2.jpg', 7300000, 5200000, 28.77, ARRAY['950e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440003', '950e8400-e29b-41d4-a716-446655440008', '950e8400-e29b-41d4-a716-446655440006']::UUID[], 32, ARRAY['intermediate', 'upper-intermediate'], '550e8400-e29b-41d4-a716-446655440001'),
('850e8400-e29b-41d4-a716-446655440003', '6.0 - 7.0', 'Upper-intermediate to advanced preparation', 'https://example.com/combo3.jpg', 6800000, 4800000, 29.41, ARRAY['950e8400-e29b-41d4-a716-446655440011', '950e8400-e29b-41d4-a716-446655440009', '950e8400-e29b-41d4-a716-446655440006']::UUID[], 28, ARRAY['upper-intermediate', 'advanced'], '550e8400-e29b-41d4-a716-446655440001'),
('850e8400-e29b-41d4-a716-446655440004', '7.0 - 8.0', 'Advanced to expert level preparation', 'https://example.com/combo4.jpg', 5500000, 3800000, 30.91, ARRAY['950e8400-e29b-41d4-a716-446655440012', '950e8400-e29b-41d4-a716-446655440013', '950e8400-e29b-41d4-a716-446655440014']::UUID[], 18, ARRAY['advanced', 'expert'], '550e8400-e29b-41d4-a716-446655440002'),
('850e8400-e29b-41d4-a716-446655440005', '3.0 - 4.0', 'Beginner to elementary preparation', 'https://example.com/combo5.jpg', 8200000, 5800000, 29.27, ARRAY['950e8400-e29b-41d4-a716-446655440007', '950e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440010']::UUID[], 52, ARRAY['beginner', 'elementary'], '550e8400-e29b-41d4-a716-446655440001'),
('850e8400-e29b-41d4-a716-446655440006', '4.0 - 5.0', 'Elementary to intermediate preparation', 'https://example.com/combo6.jpg', 7800000, 5500000, 29.49, ARRAY['950e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440008']::UUID[], 38, ARRAY['elementary', 'intermediate'], '550e8400-e29b-41d4-a716-446655440001'),
('850e8400-e29b-41d4-a716-446655440007', '5.0 - 6.0', 'Intermediate preparation', 'https://example.com/combo7.jpg', 7200000, 5000000, 30.56, ARRAY['950e8400-e29b-41d4-a716-446655440003', '950e8400-e29b-41d4-a716-446655440009', '950e8400-e29b-41d4-a716-446655440006']::UUID[], 42, ARRAY['intermediate'], '550e8400-e29b-41d4-a716-446655440002'),
('850e8400-e29b-41d4-a716-446655440008', '6.0 - 7.0', 'Upper-intermediate preparation', 'https://example.com/combo8.jpg', 6500000, 4500000, 30.77, ARRAY['950e8400-e29b-41d4-a716-446655440011', '950e8400-e29b-41d4-a716-446655440012', '950e8400-e29b-41d4-a716-446655440006']::UUID[], 25, ARRAY['upper-intermediate'], '550e8400-e29b-41d4-a716-446655440002');

-- Insert sample sections
INSERT INTO sections (id, course_id, title, description, ordering) VALUES
('c50e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', 'Reading Fundamentals', 'Basic concepts and strategies for IELTS Reading', 1),
('c50e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440001', 'Advanced Reading Techniques', 'Advanced strategies and practice', 2),
('c50e8400-e29b-41d4-a716-446655440003', '950e8400-e29b-41d4-a716-446655440002', 'Speaking Basics', 'Introduction to IELTS Speaking test', 1),
('c50e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440002', 'Speaking Practice', 'Advanced speaking practice and fluency', 2),
('c50e8400-e29b-41d4-a716-446655440005', '950e8400-e29b-41d4-a716-446655440003', 'Writing Fundamentals', 'Basic writing skills for IELTS', 1),
('c50e8400-e29b-41d4-a716-446655440006', '950e8400-e29b-41d4-a716-446655440003', 'Advanced Writing', 'Advanced writing techniques', 2),
('c50e8400-e29b-41d4-a716-446655440007', '950e8400-e29b-41d4-a716-446655440004', 'Listening Skills', 'Essential listening strategies', 1),
('c50e8400-e29b-41d4-a716-446655440008', '950e8400-e29b-41d4-a716-446655440005', 'Complete Preparation', 'Comprehensive IELTS preparation', 1),
('c50e8400-e29b-41d4-a716-446655440009', '950e8400-e29b-41d4-a716-446655440006', 'Mock Test Preparation', 'Getting ready for mock tests', 1);

-- Insert sample lessons
INSERT INTO lessons (id, section_id, title, description, lesson_type, video_url, video_duration, document_url, ordering, is_preview) VALUES
('d50e8400-e29b-41d4-a716-446655440001', 'c50e8400-e29b-41d4-a716-446655440001', 'Introduction to IELTS Reading', 'Overview of IELTS Reading test format and scoring', 'video', 'https://example.com/video1.mp4', 1800, 'https://example.com/material1.pdf', 1, TRUE),
('d50e8400-e29b-41d4-a716-446655440002', 'c50e8400-e29b-41d4-a716-446655440002', 'Skimming and Scanning Techniques', 'Learn essential reading strategies', 'video', 'https://example.com/video2.mp4', 2700, 'https://example.com/material2.pdf', 1, FALSE),
('d50e8400-e29b-41d4-a716-446655440003', 'c50e8400-e29b-41d4-a716-446655440003', 'IELTS Speaking Part 1', 'Master the personal questions section', 'video', 'https://example.com/video3.mp4', 2100, 'https://example.com/speaking1.pdf', 1, TRUE),
('d50e8400-e29b-41d4-a716-446655440004', 'c50e8400-e29b-41d4-a716-446655440004', 'Cue Card Strategies', 'How to tackle Part 2 effectively', 'video', 'https://example.com/video4.mp4', 3000, 'https://example.com/cuecard.pdf', 1, FALSE),
('d50e8400-e29b-41d4-a716-446655440005', 'c50e8400-e29b-41d4-a716-446655440005', 'Academic Writing Task 1', 'Describing charts and graphs', 'video', 'https://example.com/video5.mp4', 3300, 'https://example.com/task1.pdf', 1, FALSE),
('d50e8400-e29b-41d4-a716-446655440006', 'c50e8400-e29b-41d4-a716-446655440007', 'Note-taking Strategies', 'Effective listening note-taking methods', 'video', 'https://example.com/video6.mp4', 2400, 'https://example.com/notes.pdf', 1, TRUE),
('d50e8400-e29b-41d4-a716-446655440007', 'c50e8400-e29b-41d4-a716-446655440008', 'Complete IELTS Overview', 'Comprehensive introduction to all IELTS skills', 'video', 'https://example.com/video7.mp4', 2700, 'https://example.com/overview.pdf', 1, TRUE),
('d50e8400-e29b-41d4-a716-446655440008', 'c50e8400-e29b-41d4-a716-446655440009', 'Mock Test Guidelines', 'How to approach IELTS mock tests', 'video', 'https://example.com/video8.mp4', 1500, 'https://example.com/guidelines.pdf', 1, FALSE);

-- Insert sample enrollments
INSERT INTO enrollments (id, user_id, course_id, enrollment_date, progress_percentage, is_active) VALUES
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '25 days', 75.50, TRUE),
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '20 days', 45.25, TRUE),
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', '950e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '30 days', 90.00, TRUE),
('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', '950e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '15 days', 60.75, TRUE),
('750e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006', '950e8400-e29b-41d4-a716-446655440005', NOW() - INTERVAL '40 days', 85.30, TRUE),
('750e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', '950e8400-e29b-41d4-a716-446655440006', NOW() - INTERVAL '10 days', 25.00, TRUE);

-- Insert sample combo enrollments
INSERT INTO combo_enrollments (id, user_id, combo_id, enrollment_date, overall_progress_percentage, is_active) VALUES
('760e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '35 days', 68.75, TRUE),
('760e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', '850e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '28 days', 82.50, TRUE),
('760e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', '850e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '22 days', 55.25, TRUE),
('760e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '18 days', 45.80, TRUE),
('760e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '850e8400-e29b-41d4-a716-446655440005', NOW() - INTERVAL '15 days', 72.30, TRUE),
('760e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', '850e8400-e29b-41d4-a716-446655440006', NOW() - INTERVAL '12 days', 38.90, TRUE),
('760e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440007', NOW() - INTERVAL '25 days', 91.20, TRUE),
('760e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440005', '850e8400-e29b-41d4-a716-446655440008', NOW() - INTERVAL '8 days', 15.60, TRUE);

-- Insert sample user progress
INSERT INTO user_progress (id, user_id, course_id, section_id, lesson_id, status, progress_percentage, completion_date) VALUES
('550e8400-e29b-41d4-a716-446655441001', '550e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440001', 'c50e8400-e29b-41d4-a716-446655440001', 'd50e8400-e29b-41d4-a716-446655440001', 'completed', 100.00, NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440001', 'c50e8400-e29b-41d4-a716-446655440002', 'd50e8400-e29b-41d4-a716-446655440002', 'in_progress', 65.50, NULL),
('550e8400-e29b-41d4-a716-446655441003', '550e8400-e29b-41d4-a716-446655440005', '950e8400-e29b-41d4-a716-446655440002', 'c50e8400-e29b-41d4-a716-446655440003', 'd50e8400-e29b-41d4-a716-446655440003', 'completed', 100.00, NOW() - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655441004', '550e8400-e29b-41d4-a716-446655440005', '950e8400-e29b-41d4-a716-446655440002', 'c50e8400-e29b-41d4-a716-446655440004', 'd50e8400-e29b-41d4-a716-446655440004', 'in_progress', 45.00, NULL),
('550e8400-e29b-41d4-a716-446655441005', '550e8400-e29b-41d4-a716-446655440006', '950e8400-e29b-41d4-a716-446655440003', 'c50e8400-e29b-41d4-a716-446655440005', 'd50e8400-e29b-41d4-a716-446655440005', 'completed', 100.00, NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655441006', '550e8400-e29b-41d4-a716-446655440006', '950e8400-e29b-41d4-a716-446655440004', 'c50e8400-e29b-41d4-a716-446655440007', 'd50e8400-e29b-41d4-a716-446655440006', 'not_started', 0.00, NULL);

-- Insert sample section progress
INSERT INTO section_progress (id, user_id, section_id, course_id, completed_lessons, total_lessons, progress_percentage, started_at, completed_at) VALUES
('560e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'c50e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', 1, 1, 100.00, NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days'),
('560e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'c50e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440001', 0, 1, 65.50, NOW() - INTERVAL '8 days', NULL),
('560e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'c50e8400-e29b-41d4-a716-446655440003', '950e8400-e29b-41d4-a716-446655440002', 1, 1, 100.00, NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days'),
('560e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'c50e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440002', 0, 1, 45.00, NOW() - INTERVAL '7 days', NULL),
('560e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006', 'c50e8400-e29b-41d4-a716-446655440005', '950e8400-e29b-41d4-a716-446655440003', 1, 1, 100.00, NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days'),
('560e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'c50e8400-e29b-41d4-a716-446655440007', '950e8400-e29b-41d4-a716-446655440004', 0, 1, 0.00, NOW() - INTERVAL '5 days', NULL);

-- Insert sample exercises
INSERT INTO exercises (id, lesson_id, title, instruction, content, time_limit, max_attempts, passing_score, ordering, is_active) VALUES
('130e8400-e29b-41d4-a716-446655440001', 'd50e8400-e29b-41d4-a716-446655440001', 'Reading Comprehension Quiz', 'Read the passage and answer the questions', '{"passage": "IELTS reading passage...", "questions": []}', 30, 3, 70.00, 1, TRUE),
('130e8400-e29b-41d4-a716-446655440002', 'd50e8400-e29b-41d4-a716-446655440002', 'Skimming Practice', 'Practice skimming techniques with these statements', '{"statements": [], "passage": ""}', 15, 2, 75.00, 1, TRUE),
('130e8400-e29b-41d4-a716-446655440003', 'd50e8400-e29b-41d4-a716-446655440003', 'Part 1 Speaking Practice', 'Record your answers to these personal questions', '{"questions": ["Tell me about your hometown", "What do you do?"]}', 10, 1, 0.00, 1, TRUE),
('130e8400-e29b-41d4-a716-446655440004', 'd50e8400-e29b-41d4-a716-446655440004', 'Cue Card Practice', 'Practice with this cue card topic', '{"topic": "Describe a memorable journey", "points": []}', 5, 2, 0.00, 1, TRUE),
('130e8400-e29b-41d4-a716-446655440005', 'd50e8400-e29b-41d4-a716-446655440005', 'Task 1 Writing Practice', 'Write a 150-word description of the chart', '{"chart_url": "https://example.com/chart1.png"}', 60, 1, 0.00, 1, TRUE),
('130e8400-e29b-41d4-a716-446655440006', 'd50e8400-e29b-41d4-a716-446655440006', 'Listening Comprehension', 'Listen and answer the questions', '{"audio_url": "https://example.com/audio.mp3"}', 25, 2, 65.00, 1, TRUE);

-- Insert sample questions
INSERT INTO questions (id, exercise_id, question_text, question_type, media_url, explanation, points, ordering, difficulty_level) VALUES
('140e8400-e29b-41d4-a716-446655440001', '130e8400-e29b-41d4-a716-446655440001', 'What is the main idea of the passage?', 'multiple_choice', NULL, 'The main idea is found in the first paragraph', 1.00, 1, 6.0),
('140e8400-e29b-41d4-a716-446655440002', '130e8400-e29b-41d4-a716-446655440001', 'According to the text, which statement is true?', 'multiple_choice', NULL, 'Look for supporting evidence in paragraph 2', 1.00, 2, 6.5),
('140e8400-e29b-41d4-a716-446655440003', '130e8400-e29b-41d4-a716-446655440002', 'The passage discusses environmental issues.', 'true_false', NULL, 'Check the topic sentences of each paragraph', 1.00, 1, 5.5),
('140e8400-e29b-41d4-a716-446655440004', '130e8400-e29b-41d4-a716-446655440003', 'Tell me about your hometown.', 'speaking', NULL, 'Mention location, size, characteristics, and what you like about it', 0.00, 1, 5.0),
('140e8400-e29b-41d4-a716-446655440005', '130e8400-e29b-41d4-a716-446655440005', 'Describe the main trend shown in the chart.', 'essay', 'https://example.com/chart1.png', 'Start with an overview of the main trend', 0.00, 1, 7.0),
('140e8400-e29b-41d4-a716-446655440006', '130e8400-e29b-41d4-a716-446655440006', 'What is the speakers main concern?', 'multiple_choice', 'https://example.com/audio1.mp3', 'Listen for key phrases that indicate concern', 1.00, 1, 6.5);

-- Insert sample question options
INSERT INTO question_options (id, question_id, option_text, is_correct, ordering, explanation) VALUES
('150e8400-e29b-41d4-a716-446655440001', '140e8400-e29b-41d4-a716-446655440001', 'Climate change and its effects', TRUE, 1, 'This is mentioned as the central theme'),
('150e8400-e29b-41d4-a716-446655440002', '140e8400-e29b-41d4-a716-446655440001', 'Economic development strategies', FALSE, 2, 'This is only briefly mentioned'),
('150e8400-e29b-41d4-a716-446655440003', '140e8400-e29b-41d4-a716-446655440001', 'Political reform movements', FALSE, 3, 'Not discussed in the passage'),
('150e8400-e29b-41d4-a716-446655440004', '140e8400-e29b-41d4-a716-446655440002', 'Technology improves education quality', TRUE, 1, 'Supported by examples in paragraph 2'),
('150e8400-e29b-41d4-a716-446655440005', '140e8400-e29b-41d4-a716-446655440002', 'Traditional methods are outdated', FALSE, 2, 'The text suggests balance, not replacement'),
('150e8400-e29b-41d4-a716-446655440006', '140e8400-e29b-41d4-a716-446655440006', 'Traffic congestion in the city', TRUE, 1, 'Mentioned repeatedly throughout the audio');

-- Insert sample orders
INSERT INTO orders (id, user_id, order_code, total_amount, discount_amount, final_amount, status, payment_method, payment_status) VALUES
('200e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'ORD001', 2500000, 700000, 1800000, 'completed', 'zalopay', 'completed'),
('200e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'ORD002', 2200000, 550000, 1650000, 'completed', 'stripe', 'completed'),
('200e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 'ORD003', 2800000, 700000, 2100000, 'completed', 'zalopay', 'completed'),
('200e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'ORD004', 6500000, 0, 6500000, 'pending', 'stripe', 'pending'),
('200e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'ORD005', 5200000, 300000, 4900000, 'completed', 'zalopay', 'completed'),
('200e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'ORD006', 1800000, 450000, 1350000, 'failed', 'stripe', 'failed'),
('200e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004', 'ORD007', 3000000, 200000, 2800000, 'completed', 'zalopay', 'completed'),
('200e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440005', 'ORD008', 4800000, 150000, 4650000, 'completed', 'stripe', 'completed'),
('200e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440006', 'ORD009', 3800000, 300000, 3500000, 'completed', 'zalopay', 'completed'),
('200e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440004', 'ORD010', 3200000, 0, 3200000, 'pending', 'stripe', 'pending'),
('200e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440005', 'ORD011', 5800000, 400000, 5400000, 'completed', 'zalopay', 'completed'),
('200e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440006', 'ORD012', 2800000, 200000, 2600000, 'completed', 'stripe', 'completed');

-- Insert sample order items
INSERT INTO order_items (id, order_id, course_id, course_title, combo_id, combo_name, item_type, price, discount_amount) VALUES
('210e8400-e29b-41d4-a716-446655440001', '200e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', 'IELTS Reading Mastery', NULL, NULL, 'course', 2500000, 700000),
('210e8400-e29b-41d4-a716-446655440002', '200e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440002', 'IELTS Speaking Confidence', NULL, NULL, 'course', 2200000, 550000),
('210e8400-e29b-41d4-a716-446655440003', '200e8400-e29b-41d4-a716-446655440003', '950e8400-e29b-41d4-a716-446655440003', 'Academic Writing Mastery', NULL, NULL, 'course', 2800000, 700000),
('210e8400-e29b-41d4-a716-446655440004', '200e8400-e29b-41d4-a716-446655440004', NULL, NULL, '850e8400-e29b-41d4-a716-446655440001', '3.5 - 5.0', 'combo', 6500000, 0),
('210e8400-e29b-41d4-a716-446655440005', '200e8400-e29b-41d4-a716-446655440005', NULL, NULL, '850e8400-e29b-41d4-a716-446655440002', '5.0 - 6.0', 'combo', 5200000, 300000),
('210e8400-e29b-41d4-a716-446655440006', '200e8400-e29b-41d4-a716-446655440006', '950e8400-e29b-41d4-a716-446655440006', 'IELTS Mock Test Series', NULL, NULL, 'course', 1800000, 450000),
('210e8400-e29b-41d4-a716-446655440007', '200e8400-e29b-41d4-a716-446655440001', NULL, NULL, '850e8400-e29b-41d4-a716-446655440003', '6.0 - 7.0', 'combo', 4800000, 200000),
('210e8400-e29b-41d4-a716-446655440008', '200e8400-e29b-41d4-a716-446655440002', NULL, NULL, '850e8400-e29b-41d4-a716-446655440004', '7.0 - 8.0', 'combo', 3800000, 150000),
('210e8400-e29b-41d4-a716-446655440009', '200e8400-e29b-41d4-a716-446655440003', NULL, NULL, '850e8400-e29b-41d4-a716-446655440005', '3.0 - 4.0', 'combo', 5800000, 300000),
('210e8400-e29b-41d4-a716-446655440010', '200e8400-e29b-41d4-a716-446655440004', NULL, NULL, '850e8400-e29b-41d4-a716-446655440006', '4.0 - 5.0', 'combo', 5500000, 0),
('210e8400-e29b-41d4-a716-446655440011', '200e8400-e29b-41d4-a716-446655440005', NULL, NULL, '850e8400-e29b-41d4-a716-446655440007', '5.0 - 6.0', 'combo', 5000000, 400000),
('210e8400-e29b-41d4-a716-446655440012', '200e8400-e29b-41d4-a716-446655440006', NULL, NULL, '850e8400-e29b-41d4-a716-446655440008', '6.0 - 7.0', 'combo', 4500000, 200000);

-- Insert sample payments
INSERT INTO payments (id, order_id, payment_method, transaction_id, amount, currency, status, processed_at) VALUES
('220e8400-e29b-41d4-a716-446655440001', '200e8400-e29b-41d4-a716-446655440001', 'zalopay', 'ZP_TXN_001', 1800000, 'VND', 'completed', NOW() - INTERVAL '25 days'),
('220e8400-e29b-41d4-a716-446655440002', '200e8400-e29b-41d4-a716-446655440002', 'stripe', 'pi_stripe_001', 1650000, 'VND', 'completed', NOW() - INTERVAL '20 days'),
('220e8400-e29b-41d4-a716-446655440003', '200e8400-e29b-41d4-a716-446655440003', 'zalopay', 'ZP_TXN_002', 2100000, 'VND', 'completed', NOW() - INTERVAL '30 days'),
('220e8400-e29b-41d4-a716-446655440004', '200e8400-e29b-41d4-a716-446655440004', 'stripe', NULL, 6500000, 'VND', 'pending', NULL),
('220e8400-e29b-41d4-a716-446655440005', '200e8400-e29b-41d4-a716-446655440005', 'zalopay', 'ZP_TXN_003', 4900000, 'VND', 'completed', NOW() - INTERVAL '15 days'),
('220e8400-e29b-41d4-a716-446655440006', '200e8400-e29b-41d4-a716-446655440006', 'stripe', 'pi_stripe_failed', 1350000, 'VND', 'failed', NOW() - INTERVAL '10 days'),
('220e8400-e29b-41d4-a716-446655440007', '200e8400-e29b-41d4-a716-446655440007', 'zalopay', 'ZP_TXN_004', 2800000, 'VND', 'completed', NOW() - INTERVAL '18 days'),
('220e8400-e29b-41d4-a716-446655440008', '200e8400-e29b-41d4-a716-446655440008', 'stripe', 'pi_stripe_002', 4650000, 'VND', 'completed', NOW() - INTERVAL '12 days'),
('220e8400-e29b-41d4-a716-446655440009', '200e8400-e29b-41d4-a716-446655440009', 'zalopay', 'ZP_TXN_005', 3500000, 'VND', 'completed', NOW() - INTERVAL '8 days'),
('220e8400-e29b-41d4-a716-446655440010', '200e8400-e29b-41d4-a716-446655440010', 'stripe', NULL, 3200000, 'VND', 'pending', NULL),
('220e8400-e29b-41d4-a716-446655440011', '200e8400-e29b-41d4-a716-446655440011', 'zalopay', 'ZP_TXN_006', 5400000, 'VND', 'completed', NOW() - INTERVAL '5 days'),
('220e8400-e29b-41d4-a716-446655440012', '200e8400-e29b-41d4-a716-446655440012', 'stripe', 'pi_stripe_003', 2600000, 'VND', 'completed', NOW() - INTERVAL '3 days');

-- Insert sample coupons
INSERT INTO coupons (id, code, name, description, coupon_type, discount_type, discount_value, minimum_amount, maximum_discount, usage_limit, used_count, valid_from, valid_until, is_active, created_by) VALUES
('230e8400-e29b-41d4-a716-446655440001', 'WELCOME300', 'Welcome Bonus', '300,000 VND off for new students', 'course', 'fixed_amount', 300000, 1000000, 300000, 100, 45, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', TRUE, '550e8400-e29b-41d4-a716-446655440001'),
('230e8400-e29b-41d4-a716-446655440002', 'STUDENT25', 'Student Discount', '25% off all courses', 'course', 'percentage', 25.00, 800000, 800000, 200, 78, NOW() - INTERVAL '45 days', NOW() + INTERVAL '90 days', TRUE, '550e8400-e29b-41d4-a716-446655440001'),
('230e8400-e29b-41d4-a716-446655440003', 'COMBO500', 'Combo Special', '500,000 VND off combo courses', 'combo', 'fixed_amount', 500000, 3000000, 500000, 50, 23, NOW() - INTERVAL '20 days', NOW() + INTERVAL '40 days', TRUE, '550e8400-e29b-41d4-a716-446655440001'),
('230e8400-e29b-41d4-a716-446655440004', 'FLASH50', 'Flash Sale', '50% off selected courses', 'course', 'percentage', 50.00, 1500000, 1500000, 30, 28, NOW() - INTERVAL '10 days', NOW() + INTERVAL '5 days', TRUE, '550e8400-e29b-41d4-a716-446655440001'),
('230e8400-e29b-41d4-a716-446655440005', 'EARLYBIRD', 'Early Bird Special', '20% off for early enrollment', 'course', 'percentage', 20.00, 1000000, 600000, 150, 67, NOW() - INTERVAL '60 days', NOW() + INTERVAL '30 days', TRUE, '550e8400-e29b-41d4-a716-446655440001'),
('230e8400-e29b-41d4-a716-446655440006', 'ACADEMIC15', 'Academic Discount', '15% off academic courses', 'course', 'percentage', 15.00, 2000000, 500000, 75, 34, NOW() - INTERVAL '40 days', NOW() + INTERVAL '50 days', TRUE, '550e8400-e29b-41d4-a716-446655440001');

-- Insert sample coupon usage
INSERT INTO coupon_usage (id, coupon_id, user_id, order_id, combo_id, discount_amount, used_at) VALUES
('240e8400-e29b-41d4-a716-446655440001', '230e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '200e8400-e29b-41d4-a716-446655440001', NULL, 700000, NOW() - INTERVAL '25 days'),
('240e8400-e29b-41d4-a716-446655440002', '230e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', '200e8400-e29b-41d4-a716-446655440002', NULL, 550000, NOW() - INTERVAL '20 days'),
('240e8400-e29b-41d4-a716-446655440003', '230e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440006', '200e8400-e29b-41d4-a716-446655440003', NULL, 700000, NOW() - INTERVAL '30 days'),
('240e8400-e29b-41d4-a716-446655440004', '230e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', '200e8400-e29b-41d4-a716-446655440005', '850e8400-e29b-41d4-a716-446655440002', 300000, NOW() - INTERVAL '15 days'),
('240e8400-e29b-41d4-a716-446655440005', '230e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', '200e8400-e29b-41d4-a716-446655440006', NULL, 450000, NOW() - INTERVAL '10 days');

-- Insert sample blog categories
INSERT INTO blog_categories (id, name, slug, description, ordering, is_active) VALUES
('170e8400-e29b-41d4-a716-446655440001', 'IELTS Tips', 'ielts-tips', 'Useful tips and strategies for IELTS preparation', 1, TRUE),
('170e8400-e29b-41d4-a716-446655440002', 'Study Abroad', 'study-abroad', 'Information about studying overseas', 2, TRUE),
('170e8400-e29b-41d4-a716-446655440003', 'Test Experience', 'test-experience', 'Real IELTS test experiences from students', 3, TRUE),
('170e8400-e29b-41d4-a716-446655440004', 'Grammar Guide', 'grammar-guide', 'Grammar lessons for IELTS preparation', 4, TRUE),
('170e8400-e29b-41d4-a716-446655440005', 'Vocabulary', 'vocabulary', 'IELTS vocabulary building resources', 5, TRUE),
('170e8400-e29b-41d4-a716-446655440006', 'Success Stories', 'success-stories', 'Student success stories and achievements', 6, TRUE);

-- Insert sample blogs
INSERT INTO blogs (id, author_id, category_id, title, content, image, tags, status, is_featured, like_count, published_at) VALUES
('180e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '170e8400-e29b-41d4-a716-446655440001', '10 Essential IELTS Reading Tips', 'Reading is often considered one of the most manageable sections of the IELTS test...', 'https://example.com/blog1.jpg', ARRAY['reading', 'tips', 'strategy'], 'published', TRUE, 234, NOW() - INTERVAL '15 days'),
('180e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '170e8400-e29b-41d4-a716-446655440001', 'How to Improve Your IELTS Speaking Score', 'Speaking can be the most challenging part for many IELTS candidates...', 'https://example.com/blog2.jpg', ARRAY['speaking', 'improvement', 'confidence'], 'published', FALSE, 178, NOW() - INTERVAL '12 days'),
('180e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '170e8400-e29b-41d4-a716-446655440002', 'Top Universities in Australia for International Students', 'Australia remains one of the most popular destinations for international students...', 'https://example.com/blog3.jpg', ARRAY['australia', 'university', 'international'], 'published', TRUE, 456, NOW() - INTERVAL '20 days'),
('180e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', '170e8400-e29b-41d4-a716-446655440003', 'My IELTS Journey: From Band 5.5 to 8.0', 'I still remember the day I got my first IELTS result - 5.5 overall...', 'https://example.com/blog4.jpg', ARRAY['experience', 'improvement', 'success'], 'published', FALSE, 312, NOW() - INTERVAL '8 days'),
('180e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', '170e8400-e29b-41d4-a716-446655440004', 'Common Grammar Mistakes in IELTS Writing', 'Grammar accuracy is crucial for achieving a high score in IELTS Writing...', 'https://example.com/blog5.jpg', ARRAY['grammar', 'writing', 'mistakes'], 'published', TRUE, 298, NOW() - INTERVAL '25 days'),
('180e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', '170e8400-e29b-41d4-a716-446655440005', '100 Advanced Vocabulary Words for IELTS', 'Building a strong vocabulary is essential for IELTS success...', 'https://example.com/blog6.jpg', ARRAY['vocabulary', 'advanced', 'wordlist'], 'published', FALSE, 567, NOW() - INTERVAL '30 days');

-- Insert sample mock tests
INSERT INTO mock_tests (id, title, description, test_type, duration, total_questions, max_score, difficulty_level, created_by) VALUES
('160e8400-e29b-41d4-a716-446655440001', 'IELTS Academic Full Test 1', 'Complete IELTS Academic practice test', 'full_test', 165, 40, 9.0, 'intermediate', '350e8400-e29b-41d4-a716-446655440001'),
('160e8400-e29b-41d4-a716-446655440002', 'Reading Practice Test A', 'Academic Reading practice with 3 passages', 'reading', 60, 40, 9.0, 'intermediate', '350e8400-e29b-41d4-a716-446655440001'),
('160e8400-e29b-41d4-a716-446655440003', 'Writing Task 1 & 2 Practice', 'Academic Writing practice test', 'writing', 60, 2, 9.0, 'advanced', '350e8400-e29b-41d4-a716-446655440002'),
('160e8400-e29b-41d4-a716-446655440004', 'Listening Skills Test', 'Comprehensive listening practice', 'listening', 30, 40, 9.0, 'intermediate', '350e8400-e29b-41d4-a716-446655440002'),
('160e8400-e29b-41d4-a716-446655440005', 'Speaking Mock Interview', 'Full speaking test simulation', 'speaking', 15, 3, 9.0, 'intermediate', '350e8400-e29b-41d4-a716-446655440001'),
('160e8400-e29b-41d4-a716-446655440006', 'General Training Practice', 'GT reading and writing practice', 'full_test', 150, 42, 9.0, 'beginner', '350e8400-e29b-41d4-a716-446655440002');

-- Insert sample test results
INSERT INTO test_results (id, user_id, mock_test_id, overall_score, band_score, reading_score, writing_score, listening_score, speaking_score, time_taken, recommendations, strengths, weaknesses) VALUES
('190e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', '160e8400-e29b-41d4-a716-446655440001', 7.0, 7.0, 7.5, 6.5, 7.0, 7.0, 160, 'Focus on writing Task 2 structure and vocabulary', ARRAY['Reading comprehension', 'Listening accuracy'], ARRAY['Writing coherence', 'Complex sentence structures']),
('190e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', '160e8400-e29b-41d4-a716-446655440002', 6.5, 6.5, 6.5, 0, 0, 0, 55, 'Work on time management and vocabulary', ARRAY['Skimming and scanning'], ARRAY['Academic vocabulary', 'Question types']),
('190e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', '160e8400-e29b-41d4-a716-446655440003', 7.5, 7.5, 0, 7.5, 0, 0, 58, 'Excellent progress in writing skills', ARRAY['Task 1 description', 'Grammar accuracy'], ARRAY['Task 2 examples', 'Word count management']),
('190e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '160e8400-e29b-41d4-a716-446655440004', 6.0, 6.0, 0, 0, 6.0, 0, 28, 'Practice with different accents', ARRAY['Note-taking skills'], ARRAY['Multiple choice questions', 'Spelling accuracy']),
('190e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '160e8400-e29b-41d4-a716-446655440005', 6.5, 6.5, 0, 0, 0, 6.5, 14, 'Build confidence and fluency', ARRAY['Pronunciation', 'Part 1 responses'], ARRAY['Part 2 development', 'Part 3 analysis']),
('190e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', '160e8400-e29b-41d4-a716-446655440006', 5.5, 5.5, 6.0, 5.0, 5.5, 6.0, 145, 'Focus on writing improvement', ARRAY['Speaking fluency', 'Reading speed'], ARRAY['Writing task achievement', 'Grammar range']);

-- Fix learning_paths table
INSERT INTO learning_paths (id, name, description, target_band_score, skill_focus, difficulty_level, estimated_duration, course_sequence, prerequisites, created_by) VALUES
('270e8400-e29b-41d4-a716-446655440001', 'Academic IELTS Path', 'Complete pathway for Academic IELTS preparation', 7.0, 'general', 'intermediate', 16, ARRAY['950e8400-e29b-41d4-a716-446655440005', '950e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440003']::UUID[], ARRAY['Intermediate English level', 'Basic IELTS knowledge'], '350e8400-e29b-41d4-a716-446655440001'),
('270e8400-e29b-41d4-a716-446655440002', 'Speaking Mastery Path', 'Focused pathway for speaking improvement', 7.5, 'speaking', 'advanced', 8, ARRAY['950e8400-e29b-41d4-a716-446655440002']::UUID[], ARRAY['Conversational English'], '350e8400-e29b-41d4-a716-446655440002'),
('270e8400-e29b-41d4-a716-446655440003', 'Writing Excellence Path', 'Advanced writing skills development', 8.0, 'writing', 'advanced', 10, ARRAY['950e8400-e29b-41d4-a716-446655440003']::UUID[], ARRAY['Upper-intermediate writing'], '350e8400-e29b-41d4-a716-446655440001'),
('270e8400-e29b-41d4-a716-446655440004', 'Quick Preparation Path', 'Intensive preparation for urgent test dates', 6.5, 'general', 'intermediate', 6, ARRAY['950e8400-e29b-41d4-a716-446655440005', '950e8400-e29b-41d4-a716-446655440006']::UUID[], ARRAY['Basic IELTS knowledge'], '350e8400-e29b-41d4-a716-446655440002'),
('270e8400-e29b-41d4-a716-446655440005', 'Beginner to Band 6 Path', 'Comprehensive path for beginners', 6.0, 'general', 'beginner', 20, ARRAY['950e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440001']::UUID[], ARRAY['Elementary English'], '350e8400-e29b-41d4-a716-446655440001'),
('270e8400-e29b-41d4-a716-446655440006', 'Band 8+ Achievement Path', 'Advanced path for high achievers', 8.5, 'general', 'advanced', 14, ARRAY['950e8400-e29b-41d4-a716-446655440005', '950e8400-e29b-41d4-a716-446655440003', '950e8400-e29b-41d4-a716-446655440006']::UUID[], ARRAY['Advanced English', 'Previous IELTS experience'], '350e8400-e29b-41d4-a716-446655440002');

-- Insert sample user learning paths
INSERT INTO user_learning_paths (id, user_id, learning_path_id, current_course_index, progress_percentage, started_at, estimated_completion, is_active) VALUES
('280e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', '270e8400-e29b-41d4-a716-446655440001', 1, 65.50, NOW() - INTERVAL '6 weeks', NOW() + INTERVAL '10 weeks', TRUE),
('280e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', '270e8400-e29b-41d4-a716-446655440002', 0, 85.75, NOW() - INTERVAL '5 weeks', NOW() + INTERVAL '3 weeks', TRUE),
('280e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', '270e8400-e29b-41d4-a716-446655440003', 0, 45.25, NOW() - INTERVAL '4 weeks', NOW() + INTERVAL '6 weeks', TRUE);