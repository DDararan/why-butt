export interface WikiPage {
    id: number;
    title: string;
    content: string;
    parentId?: number;
    depth: number;
    path: string;
    displayOrder: number;
    pageType: string;
    createdAt: string;
    updatedAt: string;
    creationStaffId: string; 
    creationStaffName: string;
    children?: WikiPageSummary[];
    history?: WikiPageHistory[];
}

export interface WikiPageSummary {
    id: number;
    title: string;
    parentId?: number;
    depth: number;
    path: string;
    displayOrder: number;
    pageType: string;
    updatedAt: string;
    creationStaffId: string;
    creationStaffName: string;
    children?: WikiPageSummary[];
    fileCount?: number;
}

export interface WikiPageDetail {
    id: number;
    title: string;
    content: string;
    parentId?: number;
    depth: number;
    path: string;
    displayOrder: number;
    pageType: string;
    createdAt: string;
    updatedAt: string;
    creationStaffId: string;
    creationStaffName: string;
    children?: WikiPageSummary[];
    parent?: WikiPageSummary;
    history?: WikiPageHistory[];
}

export interface WikiPageHistory {
    id: number;
    seqNbr: number;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    restored?: boolean;
}

export interface WikiPageSearchResult {
    id: number;
    title: string;
    snippet: string;
    titleMatch: boolean;
    updatedAt: string;
}

export interface CreateWikiPageRequest {
    title: string;
    content: string;
    parentId?: number;
    pageType?: string; // MENU, DAILY, ETC
}

export interface UpdateWikiPageRequest {
    title?: string;
    content: string;
    parentId?: number;
    pageType?: string;
} 