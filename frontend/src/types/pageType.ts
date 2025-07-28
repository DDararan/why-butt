export interface WikiPageType {
  pageType: string;
  pageTitle: string;
  creationStaffId: string;
  modifyStaffId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageTypeRequest {
  pageType: string;
  pageTitle: string;
}

export interface UpdatePageTypeRequest {
  pageTitle: string;
} 