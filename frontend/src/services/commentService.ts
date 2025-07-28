import axios from 'axios';
import { Comment, CreateCommentRequest, UpdateCommentRequest } from '../types/comment';

/**
 * 댓글 관련 API 서비스
 * 백엔드 API와의 통신을 담당하며, 관심사의 분리를 통해 API 호출 로직을 캡슐화합니다.
 */

const API_BASE_URL = '/api/comments';

// axios 인스턴스 생성 (세션 쿠키 포함)
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true // 세션 쿠키 자동 포함
});

export const commentService = {
  /**
   * 특정 페이지의 모든 댓글을 조회합니다.
   */
  getCommentsByPageTitle: async (pageTitle: string): Promise<Comment[]> => {
    const response = await apiClient.get(`?pageTitle=${encodeURIComponent(pageTitle)}`);
    return response.data;
  },

  /**
   * 새로운 댓글을 생성합니다.
   */
  createComment: async (request: CreateCommentRequest): Promise<Comment> => {
    const response = await apiClient.post('', request);
    return response.data;
  },

  /**
   * 댓글을 수정합니다.
   */
  updateComment: async (commentId: number, request: UpdateCommentRequest): Promise<Comment> => {
    const response = await apiClient.put(`/${commentId}`, request);
    return response.data;
  },

  /**
   * 댓글을 삭제합니다.
   */
  deleteComment: async (commentId: number): Promise<void> => {
    await apiClient.delete(`/${commentId}`);
  },

  /**
   * 특정 페이지의 댓글 개수를 조회합니다.
   */
  getCommentCount: async (pageTitle: string): Promise<number> => {
    const response = await apiClient.get(`/count?pageTitle=${encodeURIComponent(pageTitle)}`);
    return response.data;
  }
}; 