import axios from 'axios';
import { WikiPageDetail, WikiPageSummary, WikiPageSearchResult, CreateWikiPageRequest, UpdateWikiPageRequest } from '../types/wiki';

const API_BASE_URL = '/api/wiki';

// axios 인스턴스 생성 (세션 쿠키 포함)
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true // 세션 쿠키 자동 포함
});

export const wikiService = {
    // 범용 HTTP 메서드들 (댓글 등 다른 API 호출용)
    get: async <T>(url: string): Promise<T> => {
        const response = await axios.get(url, { withCredentials: true });
        return response.data;
    },

    post: async <T>(url: string, data?: any): Promise<T> => {
        const response = await axios.post(url, data, { withCredentials: true });
        return response.data;
    },

    put: async <T>(url: string, data?: any): Promise<T> => {
        const response = await axios.put(url, data, { withCredentials: true });
        return response.data;
    },

    delete: async <T>(url: string): Promise<T> => {
        const response = await axios.delete(url, { withCredentials: true });
        return response.data;
    },

    // 기존 위키 관련 메서드들
    getRecentPages: async (): Promise<WikiPageSummary[]> => {
        const response = await apiClient.get('/pages');
        return response.data;
    },

    getRecentWeekPages: async (): Promise<WikiPageSummary[]> => {
        const response = await apiClient.get('/pages/recent-week');
        return response.data;
    },

    getPagesByType: async (pageType: string): Promise<WikiPageSummary[]> => {
        const response = await apiClient.get(`/pages/by-type/${pageType}`);
        return response.data;
    },

    getPage: async (title: string): Promise<WikiPageDetail> => {
        const response = await apiClient.get(`/pages/${encodeURIComponent(title)}`);
        return response.data;
    },

    getPageById: async (id: number): Promise<WikiPageDetail> => {
        const response = await apiClient.get(`/pages/id/${id}`);
        return response.data;
    },

    createPage: async (page: CreateWikiPageRequest): Promise<WikiPageDetail> => {
        const response = await apiClient.post('/pages', page);
        return response.data;
    },

    updatePage: async (title: string, page: UpdateWikiPageRequest): Promise<WikiPageDetail> => {
        const response = await apiClient.put(
            `/pages/${encodeURIComponent(title)}`,
            page
        );
        return response.data;
    },

    updatePageById: async (id: number, page: UpdateWikiPageRequest): Promise<WikiPageDetail> => {
        const response = await apiClient.put(
            `/pages/id/${id}`,
            page
        );
        return response.data;
    },

    deletePage: async (title: string): Promise<void> => {
        await apiClient.delete(`/pages/${encodeURIComponent(title)}`);
    },

    deletePageById: async (id: number): Promise<void> => {
        await apiClient.delete(`/pages/id/${id}`);
    },

    searchPages: async (query: string): Promise<WikiPageSummary[]> => {
        const response = await apiClient.get('/search', {
            params: { query }
        });
        return response.data;
    },

    searchPagesInTitleAndContent: async (query: string): Promise<WikiPageSearchResult[]> => {
        const response = await apiClient.get('/search/full', {
            params: { query }
        });
        return response.data;
    },

    updatePagesOrder: async (orderUpdates: Array<{id: number, displayOrder: number}>): Promise<void> => {
        await apiClient.put('/pages/order', orderUpdates);
    },

    // 페이지 부모 변경
    updatePageParent: async (pageId: number, newParentId: number | null, displayOrder: number): Promise<void> => {
        await apiClient.put('/pages/parent', {
            pageId,
            newParentId,
            displayOrder
        });
    },

    // 히스토리 복원
    restoreHistory: async (pageId: number, seqNbr: number): Promise<void> => {
        await apiClient.post(`/pages/${pageId}/history/${seqNbr}/restore`);
    },
    
    // 실시간 컨텐츠 동기화 (Y.js)
    syncContent: async (pageId: number, content: string): Promise<any> => {
        const response = await apiClient.post(`/${pageId}/content-sync`, {
            content
        });
        return response.data;
    }
}; 