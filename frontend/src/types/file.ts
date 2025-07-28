/**
 * 파일 첨부 관련 TypeScript 타입 정의
 * 백엔드 API와의 통신을 위한 데이터 구조를 정의합니다.
 */

export interface FileAttachment {
  id: number;
  originalFileName: string;
  storedFileName: string;
  fileSize: number;
  contentType: string;
  uploadedBy: string;
  pageTitle: string;
  uploadedAt: string;
}

export interface FileUploadRequest {
  pageTitle: string;
  file: File;
  customFileName?: string;
} 