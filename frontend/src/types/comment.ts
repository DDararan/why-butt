/**
 * 댓글 관련 TypeScript 타입 정의
 * 백엔드 API와의 통신을 위한 데이터 구조를 정의합니다.
 */

export interface Comment {
  id: number;
  content: string;
  author: string;
  staffId: string;
  pageTitle: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
  pageTitle: string;
}

export interface UpdateCommentRequest {
  content: string;
} 