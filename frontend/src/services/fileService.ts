import axios from 'axios';
import { FileAttachment, FileUploadRequest } from '../types/file';

/**
 * 파일 관련 API 서비스
 * 백엔드 API와의 통신을 담당하며, 파일 업로드/다운로드 로직을 캡슐화합니다.
 */

const getBaseUrl = () => {
  const config = (window as any).APP_CONFIG;
  if (!config?.API_URL) {
    console.warn('APP_CONFIG.API_URL is not set, using default localhost');
    return 'http://localhost:8181';
  }
  return config.API_URL;
};

const API_BASE_URL = `${getBaseUrl()}/api/files`;

export const fileService = {
  /**
   * 파일을 업로드합니다. (제목 기반)
   */
  uploadFile: async (request: FileUploadRequest): Promise<FileAttachment> => {
    const formData = new FormData();
    formData.append('pageTitle', request.pageTitle);
    formData.append('file', request.file);
    if (request.customFileName) {
      formData.append('customFileName', request.customFileName);
    }

    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * 파일을 업로드합니다. (ID 기반)
   */
  uploadFileByPageId: async (pageId: number, file: File, customFileName?: string): Promise<FileAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    if (customFileName) {
      formData.append('customFileName', customFileName);
    }

    const response = await axios.post(`${API_BASE_URL}/upload/page/${pageId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * 특정 페이지의 모든 첨부 파일을 조회합니다. (제목 기반)
   */
  getFilesByPageTitle: async (pageTitle: string): Promise<FileAttachment[]> => {
    const response = await axios.get(`${API_BASE_URL}?pageTitle=${encodeURIComponent(pageTitle)}`);
    return response.data;
  },

  /**
   * 특정 페이지의 모든 첨부 파일을 조회합니다. (ID 기반)
   */
  getFilesByPageId: async (pageId: number): Promise<FileAttachment[]> => {
    const response = await axios.get(`${API_BASE_URL}/page/${pageId}`);
    return response.data;
  },

  /**
   * 파일을 다운로드합니다.
   */
  downloadFile: async (storedFileName: string, originalFileName: string): Promise<void> => {
    const response = await axios.get(`${API_BASE_URL}/download/${storedFileName}`, {
      responseType: 'blob',
    });

    // 파일 다운로드를 위한 임시 링크 생성
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalFileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * 파일을 삭제합니다.
   */
  deleteFile: async (fileId: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/${fileId}`);
  },

  /**
   * 파일 정보를 조회합니다.
   */
  getFileInfo: async (storedFileName: string): Promise<FileAttachment> => {
    const response = await axios.get(`${API_BASE_URL}/info/${storedFileName}`);
    return response.data;
  },

  /**
   * 파일 크기를 사람이 읽기 쉬운 형태로 포맷팅합니다.
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}; 