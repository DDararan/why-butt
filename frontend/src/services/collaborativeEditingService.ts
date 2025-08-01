import { EditingUser } from './editingSessionService';

export interface Operation {
  type: string;
  data: any;
  userId: string;
  timestamp: number;
}

export interface DocumentState {
  content: string;
  revision: number;
  lastModified: Date;
}

interface User {
  staffId: string;
  userName: string;
  loginId?: string;
  email?: string;
}

class CollaborativeEditingService {
  private websocket: WebSocket | null = null;
  private currentPageId: number | null = null;
  private currentUser: User | null = null;
  private editorsUpdateCallbacks: ((editors: EditingUser[]) => void)[] = [];
  private operationCallbacks: ((operation: Operation) => void)[] = [];
  private documentSyncCallbacks: ((state: DocumentState) => void)[] = [];
  private errorCallbacks: ((error: string) => void)[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  public connect(user: User): void {
    this.currentUser = user;
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    // 주의: 이 서비스는 현재 사용되지 않음. YjsEditorNew에서 Yjs WebSocket을 사용함
    const getWebSocketUrl = () => {
      
      // 현재 페이지의 호스트 정보 가져오기
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
      
      // 현재 호스트 사용
      return `${protocol}//${host}:8181/ws/yjs/collaborative`;
    };
    
    const wsUrl = getWebSocketUrl();
    
    try {
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('[CollaborativeEditingService] WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Send user identification
        if (this.currentUser) {
          this.send({
            type: 'identify',
            user: {
              staffId: this.currentUser.staffId,
              userName: this.currentUser.userName,
              loginId: this.currentUser.loginId
            }
          });
        }
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[CollaborativeEditingService] Failed to parse message:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('[CollaborativeEditingService] WebSocket error:', error);
        this.notifyError('WebSocket connection error');
      };

      this.websocket.onclose = () => {
        console.log('[CollaborativeEditingService] WebSocket disconnected');
        this.handleReconnect();
      };
    } catch (error) {
      console.error('[CollaborativeEditingService] Failed to create WebSocket:', error);
      this.notifyError('Failed to establish WebSocket connection');
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.notifyError('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`[CollaborativeEditingService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'editors_update':
        this.notifyEditorsUpdate(data.editors || []);
        break;
      case 'operation':
        this.notifyOperation(data.operation);
        break;
      case 'document_sync':
        this.notifyDocumentSync(data.state);
        break;
      case 'error':
        this.notifyError(data.message);
        break;
      default:
        console.warn('[CollaborativeEditingService] Unknown message type:', data.type);
    }
  }

  public startEditing(pageId: number, initialContent: string): void {
    this.currentPageId = pageId;
    this.send({
      type: 'start_editing',
      pageId,
      content: initialContent
    });
  }

  public stopEditing(pageId: number): void {
    if (this.currentPageId === pageId) {
      this.send({
        type: 'stop_editing',
        pageId
      });
      this.currentPageId = null;
    }
  }

  public sendOperation(operation: Operation): void {
    if (!this.currentPageId) return;
    
    this.send({
      type: 'operation',
      pageId: this.currentPageId,
      operation
    });
  }

  public sendDocumentUpdate(pageId: number, content: string): void {
    this.send({
      type: 'document_update',
      pageId,
      content
    });
  }

  private send(data: any): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(data));
    } else {
      console.warn('[CollaborativeEditingService] WebSocket not connected, queuing message');
    }
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.currentPageId = null;
    this.reconnectAttempts = 0;
  }

  // Event listeners
  public onEditorsUpdate(callback: (editors: EditingUser[]) => void): void {
    this.editorsUpdateCallbacks.push(callback);
  }

  public onOperation(callback: (operation: Operation) => void): void {
    this.operationCallbacks.push(callback);
  }

  public onDocumentSync(callback: (state: DocumentState) => void): void {
    this.documentSyncCallbacks.push(callback);
  }

  public onError(callback: (error: string) => void): void {
    this.errorCallbacks.push(callback);
  }

  // Event notifiers
  private notifyEditorsUpdate(editors: EditingUser[]): void {
    this.editorsUpdateCallbacks.forEach(callback => callback(editors));
  }

  private notifyOperation(operation: Operation): void {
    this.operationCallbacks.forEach(callback => callback(operation));
  }

  private notifyDocumentSync(state: DocumentState): void {
    this.documentSyncCallbacks.forEach(callback => callback(state));
  }

  private notifyError(error: string): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }
}

export const collaborativeEditingService = new CollaborativeEditingService();