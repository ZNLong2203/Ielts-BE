CREATE VIEW rag_courses AS
SELECT
  c.id,
  c.title,
  c.description,
  c.skill_focus,
  c.difficulty_level,
  c.estimated_duration,
  c.price,
  c.discount_price,
  c.rating,
  c.enrollment_count,
  c.tags,
  c.published_at,
  cat.name AS category_name
FROM courses c
LEFT JOIN course_categories cat ON cat.id = c.category_id
WHERE
  c.deleted = FALSE
  AND c.published_at IS NOT NULL
  AND cat.deleted = FALSE;

CREATE VIEW rag_combo_courses AS
SELECT
  id,
  name,
  description,
  original_price,
  combo_price,
  discount_percentage,
  enrollment_count,
  tags,
  created_at
FROM combo_courses
WHERE deleted = FALSE;

CREATE VIEW rag_blogs AS
SELECT
  b.id,
  b.title,
  b.content,
  b.tags,
  b.published_at,
  c.name AS category_name
FROM blogs b
LEFT JOIN blog_categories c ON c.id = b.category_id
WHERE
  b.deleted = FALSE
  AND b.status = 'published'
  AND c.deleted = FALSE;

CREATE VIEW rag_mock_tests AS
SELECT
  id,
  title,
  description,
  test_type,
  duration,
  difficulty_level,
  target_band_score
FROM mock_tests
WHERE
  deleted = FALSE
  AND status = 'public';

CREATE VIEW rag_combo_coupons AS
SELECT
  c.id AS coupon_id,
  c.code,
  c.name AS coupon_name,
  c.description,
  c.discount_type,        
  c.discount_value,
  c.minimum_amount,
  c.maximum_discount,
  c.valid_from,
  c.valid_until,
  cb.id AS combo_id,
  cb.name AS combo_name,
  cb.combo_price,
  cb.original_price,
  cb.discount_percentage AS combo_discount_percentage
FROM coupons c
JOIN combo_courses cb
  ON cb.id = ANY (c.applicable_combos)
WHERE
  c.deleted = FALSE
  AND c.is_active = TRUE
  AND c.coupon_type = 'combo'
  AND cb.deleted = FALSE
  AND c.valid_from <= CURRENT_TIMESTAMP
  AND c.valid_until >= CURRENT_TIMESTAMP;

CREATE VIEW rag_combos_with_coupons AS
SELECT
  cb.id AS combo_id,
  cb.name AS combo_name,
  cb.description,
  cb.combo_price,
  cb.original_price,
  cb.discount_percentage AS base_discount_percentage,
  c.code AS coupon_code,
  c.discount_type,
  c.discount_value,
  c.valid_until
FROM combo_courses cb
LEFT JOIN coupons c
  ON c.coupon_type = 'combo'
  AND c.is_active = TRUE
  AND c.deleted = FALSE
  AND c.valid_from <= CURRENT_TIMESTAMP
  AND c.valid_until >= CURRENT_TIMESTAMP
  AND cb.id = ANY (c.applicable_combos)
WHERE
  cb.deleted = FALSE;
