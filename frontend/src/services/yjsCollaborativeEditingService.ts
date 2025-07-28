import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

export interface User {
  staffId: string;
  userName: string;
  color?: string;
}

export interface YjsCollaborativeEditingServiceConfig {
  websocketUrl: string;
  roomName: string;
  user: User;
  doc?: Y.Doc;
}

export class YjsCollaborativeEditingService {
  private doc: Y.Doc;
  private wsProvider: WebsocketProvider | null = null;
  private indexeddbProvider: IndexeddbPersistence | null = null;
  private awareness: any;
  private roomName: string;
  private user: User;
  private websocketUrl: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 1000;

  constructor(config: YjsCollaborativeEditingServiceConfig) {
    this.doc = config.doc || new Y.Doc();
    this.roomName = config.roomName;
    this.user = config.user;
    this.websocketUrl = config.websocketUrl;
  }

  public async connect(): Promise<void> {
    try {
      console.log('[YJS] 연결 시작:', {
        room: this.roomName,
        user: this.user.userName,
        websocketUrl: this.websocketUrl
      });
      
      // IndexedDB 영속성 설정 (오프라인 지원) - 일시적으로 비활성화
      // this.indexeddbProvider = new IndexeddbPersistence(this.roomName, this.doc);
      
      // WebSocket URL에 room 파라미터 추가
      const wsUrl = `${this.websocketUrl}?room=${encodeURIComponent(this.roomName)}`;
      console.log('[YJS] WebSocket URL:', wsUrl);
      
      // WebSocket Provider 설정
      this.wsProvider = new WebsocketProvider(
        this.websocketUrl, // room 파라미터 제거 (y-websocket이 자동으로 추가)
        this.roomName,
        this.doc,
        {
          connect: true,
          params: {
            userId: this.user.staffId,
            userName: this.user.userName
          },
          // WebSocket 재연결 설정
          maxBackoffTime: 10000,
          resyncInterval: 5000,
          // 바이너리 메시지 사용
          WebSocketPolyfill: WebSocket,
          // 즉각적인 동기화
          disableBc: true, // BroadcastChannel 비활성화
        }
      );

      this.awareness = this.wsProvider.awareness;

      // 사용자 정보 설정
      this.setUserAwareness();

      // 연결 상태 모니터링
      this.setupConnectionHandlers();

      // 문서 업데이트 로깅
      this.doc.on('update', (update: Uint8Array, origin: any, doc: Y.Doc) => {
        console.log('[YJS] 문서 업데이트:', {
          updateSize: update.length,
          origin,
          timestamp: new Date().toISOString()
        });
      });
      
      this.isConnected = true;
      console.log('[YJS] WebSocket 연결 성공:', this.roomName);
    } catch (error) {
      console.error('Yjs WebSocket 연결 실패:', error);
      throw error;
    }
  }

  private setUserAwareness(): void {
    if (!this.awareness) return;

    // 사용자별 색상 생성
    const userColor = this.user.color || this.generateUserColor(this.user.staffId);

    this.awareness.setLocalStateField('user', {
      id: this.user.staffId,
      name: this.user.userName,
      color: userColor,
      colorLight: this.lightenColor(userColor, 0.9)
    });
  }

  private generateUserColor(userId: string): string {
    // userId를 기반으로 일관된 색상 생성
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  private lightenColor(color: string, amount: number): string {
    // HSL 색상을 밝게 만들기
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const h = parseInt(match[1]);
      const s = parseInt(match[2]);
      const l = parseInt(match[3]);
      const newL = Math.min(100, l + (100 - l) * amount);
      return `hsl(${h}, ${s}%, ${newL}%)`;
    }
    return color;
  }

  private setupConnectionHandlers(): void {
    if (!this.wsProvider) return;

    this.wsProvider.on('status', (event: any) => {
      console.log('[YJS] WebSocket 상태 변경:', event.status);
      
      if (event.status === 'connected') {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('[YJS] WebSocket 연결됨');
      } else if (event.status === 'disconnected') {
        this.isConnected = false;
        console.log('[YJS] WebSocket 연결 끊김');
        this.handleReconnection();
      }
    });

    this.wsProvider.on('sync', (isSynced: boolean) => {
      console.log('[YJS] 동기화 상태:', isSynced);
    });
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('최대 재연결 시도 횟수 초과');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${delay}ms 후)`);
    
    setTimeout(() => {
      if (!this.isConnected && this.wsProvider) {
        this.wsProvider.connect();
      }
    }, delay);
  }

  public getDocument(): Y.Doc {
    return this.doc;
  }

  public getAwareness(): any {
    return this.awareness;
  }

  public getProvider(): WebsocketProvider | null {
    return this.wsProvider;
  }

  public isConnectedToServer(): boolean {
    return this.isConnected;
  }

  public getConnectedUsers(): Map<number, any> {
    if (!this.awareness) return new Map();
    return this.awareness.getStates();
  }

  public sendCursorPosition(cursorPos: any): void {
    if (!this.awareness) return;
    
    this.awareness.setLocalStateField('cursor', cursorPos);
  }

  public sendSelection(selection: any): void {
    if (!this.awareness) return;
    
    this.awareness.setLocalStateField('selection', selection);
  }

  public disconnect(): void {
    console.log('Yjs 연결 해제 중...');
    
    if (this.wsProvider) {
      this.wsProvider.disconnect();
      this.wsProvider.destroy();
      this.wsProvider = null;
    }

    if (this.indexeddbProvider) {
      this.indexeddbProvider.destroy();
      this.indexeddbProvider = null;
    }

    this.isConnected = false;
    console.log('Yjs 연결 해제 완료');
  }

  public onAwarenessChange(callback: (states: Map<number, any>) => void): void {
    if (!this.awareness) return;
    
    this.awareness.on('change', (changes: any) => {
      callback(this.awareness.getStates());
    });
  }

  public onDocumentUpdate(callback: (update: Uint8Array, origin: any) => void): void {
    this.doc.on('update', callback);
  }

  public offDocumentUpdate(callback: (update: Uint8Array, origin: any) => void): void {
    this.doc.off('update', callback);
  }
}