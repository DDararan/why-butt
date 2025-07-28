import axios from 'axios';
import { WikiPageType, CreatePageTypeRequest, UpdatePageTypeRequest } from '../types/pageType';

const API_BASE_URL = '/api/wiki/page-types';

// axios 인스턴스 생성 (세션 쿠키 포함)
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true // 세션 쿠키 자동 포함
});

export const pageTypeService = {
    // 모든 페이지 타입 조회
    getAllPageTypes: async (): Promise<WikiPageType[]> => {
        const response = await apiClient.get('');
        return response.data;
    },

    // 특정 페이지 타입 조회
    getPageType: async (pageType: string): Promise<WikiPageType> => {
        const response = await apiClient.get(`/${pageType}`);
        return response.data;
    },

    // 페이지 타입 생성
    createPageType: async (request: CreatePageTypeRequest): Promise<WikiPageType> => {
        const response = await apiClient.post('', request);
        return response.data;
    },

    // 페이지 타입 수정
    updatePageType: async (pageType: string, request: UpdatePageTypeRequest): Promise<WikiPageType> => {
        const response = await apiClient.put(`/${pageType}`, request);
        return response.data;
    },

    // 페이지 타입 삭제
    deletePageType: async (pageType: string): Promise<void> => {
        await apiClient.delete(`/${pageType}`);
    }
}; 