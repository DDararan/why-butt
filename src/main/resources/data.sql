-- 초기 사용자 데이터
-- 비밀번호는 실제 환경에서는 암호화되어야 합니다
-- H2 Database용 MERGE 구문 사용

MERGE INTO users (staff_id, login_id, password, user_name, email, is_active, created_at, updated_at) 
KEY (staff_id)
VALUES ('STAFF001', 'admin', 'admin123', '관리자', 'admin@example.com', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

MERGE INTO users (staff_id, login_id, password, user_name, email, is_active, created_at, updated_at) 
KEY (staff_id)
VALUES ('STAFF002', 'user1', 'user123', '사용자1', 'user1@example.com', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

MERGE INTO users (staff_id, login_id, password, user_name, email, is_active, created_at, updated_at) 
KEY (staff_id)
VALUES ('STAFF003', 'user2', 'user123', '사용자2', 'user2@example.com', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);