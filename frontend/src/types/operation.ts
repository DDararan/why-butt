export interface Operation {
  type: 'INSERT' | 'DELETE' | 'RETAIN';
  position: number;
  content?: string;
  length: number;
  userId: string;
  timestamp: number;
  revision: number;
  operationId?: string; // 클라이언트 내부 사용 (서버 전송 시 제외)
}

export interface DocumentState {
  content: string;
  revision: number;
}

export interface OperationMessage {
  type: string;
  pageId: number;
  staffId: string;
  userName: string;
  operation?: Operation;
  initialContent?: string;
  revision?: number;
  content?: string; // 마크다운 버튼용 전체 문서 내용
} 