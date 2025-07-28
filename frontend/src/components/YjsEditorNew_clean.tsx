import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlock from '@tiptap/extension-code-block';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import MarkdownButton from './MarkdownButton';
import TableToolbar from './TableToolbar';
import './Editor.css';
import './TipTapEditor.css';
import { wikiService } from '../services/wikiService';

interface YjsEditorNewProps {
  pageId: number;
  currentUser: { staffId: string; userName: string; loginId?: string };
  defaultValue?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

// 사용자 색상 팔레트 - 더 선명하고 구분이 쉬운 색상들
const userColors = [
  '#FF6B6B', // 빨강
  '#4ECDC4', // 청록
  '#45B7D1', // 파랑
  '#96CEB4', // 연두
  '#FECA57', // 노랑
  '#DDA0DD', // 보라
  '#FF8B94', // 분홍
  '#4834D4', // 진한파랑
  '#F0932B', // 주황
  '#6AB04C', // 초록
];

const YjsEditorNew: React.FC<YjsEditorNewProps> = ({
  pageId,
  currentUser,
  defaultValue = '',
  onChange,
  readOnly = false
}) => {
  const [editorReady, setEditorReady] = useState(false);
  const [isLocalSynced, setLocalSynced] = useState(false);
  const [isRemoteSynced, setRemoteSynced] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [connectedUsers, setConnectedUsers] = useState<Array<{id: string, name: string, color: string}>>([]);
  const [initialSyncCompleted, setInitialSyncCompleted] = useState(false);
  
  const ydocRef = useRef<Y.Doc | null>(null);
  const localProviderRef = useRef<IndexeddbPersistence | null>(null);
  const remoteProviderRef = useRef<WebsocketProvider | null>(null);
  const isToolbarActionRef = useRef(false);
  const isUnmountingRef = useRef(false);
  const [providerReady, setProviderReady] = useState(false);
  const isComposingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const initialSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedContentRef = useRef<string>('');
  
  // onChange 최신 값 유지
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  // 백엔드로 컨텐츠 동기화 (디바운스 처리)
  const syncContentToBackend = useCallback((content: string) => {
    if (readOnly || !pageId) return;
    
    // 이전 타이머 취소
    if (contentSyncTimeoutRef.current) {
      clearTimeout(contentSyncTimeoutRef.current);
    }
    
    // 2초 후 동기화 (디바운스)
    contentSyncTimeoutRef.current = setTimeout(async () => {
      // 내용이 바뀌었을 때만 동기화
      if (content !== lastSyncedContentRef.current) {
        try {
          await wikiService.syncContent(pageId, content);
          lastSyncedContentRef.current = content;
          console.log('[Y.js] 백엔드 동기화 성공 (2초 디바운스)');
        } catch (error) {
          console.error('[Y.js] 백엔드 동기화 실패:', error);
        }
      }
    }, 2000);
  }, [pageId, readOnly]);
  
  // 문서 이름 생성 (Docmost 방식: 단순히 pageId 사용)
  const documentName = useMemo(() => `${pageId}`, [pageId]);
  
  // 사용자 색상 생성
  const userColor = useMemo(() => {
    const hash = currentUser.userName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return userColors[hash % userColors.length];
  }, [currentUser.userName]);

  // Y.Doc 초기화 - 컴포넌트별로 고유한 인스턴스 생성
  const ydoc = useMemo(() => {
    // 기존 Y.Doc 정리
    if (ydocRef.current) {
      // 기존 Y.Doc 정리
      ydocRef.current.destroy();
    }
    
    // 새 Y.Doc 생성 (clientID는 자동 생성됨)
    const newDoc = new Y.Doc();
    ydocRef.current = newDoc;
    
    // Y.Doc 생성
    
    return newDoc;
  }, [pageId, documentName]); // pageId 변경 시 새 문서 생성

  // WebSocket Provider 초기 설정 (Docmost 방식)
  const wsProvider = useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    // 읽기 전용 모드에서도 WebSocket 연결을 허용하여 실시간 업데이트 가능하게 함
    // WebSocket Provider 초기화
    
    // WebSocket URL에 room 이름 포함하지 않음 (y-websocket이 자동 추가)
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8181/ws/yjs';
    
    // loginId 우선순위: props > localStorage > staffId
    let loginId = currentUser.loginId;
    if (!loginId) {
      loginId = localStorage.getItem('loginId') || undefined;
    }
    if (!loginId) {
      loginId = currentUser.staffId;
    }
    
    // 사용자 정보 설정
    
    const provider = new WebsocketProvider(
      wsUrl,
      documentName,
      ydoc,
      {
        connect: true,
        params: {
          loginId: loginId,
          userId: currentUser.staffId,
          userName: currentUser.userName,
        },
        maxBackoffTime: 10000,
        disableBc: true,
        // WebSocket URL 연결 방식 변경
        resyncInterval: 5000,
      }
    );
    
    // awareness에 사용자 정보 설정
    provider.awareness.setLocalStateField('user', {
      loginId: loginId,
      staffId: currentUser.staffId,
      name: currentUser.userName,
      color: userColor,
    });
    
    // Provider awareness 설정
    
    return provider;
  }, [documentName, ydoc, currentUser.staffId, currentUser.userName, currentUser.loginId, userColor, readOnly]);

  // TipTap Editor 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        history: false, // Yjs가 히스토리 관리
      }),
      Table.configure({ 
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 25,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        // 표 셀 병합을 위한 속성 허용
        HTMLAttributes: {
          class: 'table-cell',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: { class: 'code-block' },
      }),
      Highlight.configure({ multicolor: true }),
      Image.configure({
        inline: true,
        HTMLAttributes: { class: 'editor-image' },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'editor-link' },
      }),
      Placeholder.configure({
        placeholder: readOnly ? '읽기 전용 모드입니다.' : '내용을 입력하세요...',
      }),
      Subscript,
      Superscript,
      TaskList.configure({
        HTMLAttributes: { class: 'task-list' },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: 'task-item' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      // Yjs 협업 확장 (읽기 전용 모드에서도 필요 - 컨텐츠 동기화를 위해)
      Collaboration.configure({
        document: ydoc,
        field: 'content', // 명시적으로 필드 지정
        fragment: ydoc.getXmlFragment('content'), // fragment 명시적 지정
      }),
      // CollaborationCursor 추가 (wsProvider가 있을 때만 - readOnly 모드에서도 다른 사용자의 커서를 볼 수 있음)
      ...(wsProvider ? [
        CollaborationCursor.configure({
          provider: wsProvider,
          user: {
            name: currentUser.userName,
            color: userColor,
          },
        })
      ] : []),
    ],
    content: '', // Y.js Collaboration이 내용을 관리하므로 초기값은 빈 문자열
    editable: !readOnly,
    onCreate: ({ editor }) => {
      setEditorReady(true);
    },
    onUpdate: ({ editor, transaction }) => {
      // 타이핑 시 Y.js 저장 로그
      if (transaction.docChanged && !readOnly) {
        console.log('[Y.js] 타이핑 감지 - Y.js 문서 업데이트');
      }
      
      // 툴바 액션이나 IME 조합 중이 아닌 경우에만 onChange 호출
      if (!isToolbarActionRef.current && !isComposingRef.current) {
        if (onChangeRef.current && transaction.docChanged) {
          onChangeRef.current(editor.getHTML());
        }
      }
    },
    // onTransaction, onSelectionUpdate 제거
  }, [wsProvider, readOnly, userColor, ydoc, defaultValue]);

  // 키 입력 이벤트 감지 제거

  // Provider 초기화
  useEffect(() => {
    // wsProvider가 없거나 에디터가 준비되지 않은 경우만 건너뛰기 (readOnly 모드에서도 초기화 진행)
    if (!wsProvider || !editor || !editorReady) return;
    
    let syncTimeout: NodeJS.Timeout | undefined;
    
    const initProviders = async () => {
      // Provider 초기화
      
      // 2. RemoteProvider 참조 설정
      remoteProviderRef.current = wsProvider;
      
      if (remoteProviderRef.current) {
        // WebSocket 연결 상태 이벤트
        remoteProviderRef.current.on('status', (event: any) => {
          // WebSocket 상태 변경
          setConnectionStatus(event.status);
          
          if (event.status === 'connected') {
            // WebSocket 연결 완료
            setProviderReady(true);
            
            // 초기 동기화 대기
            
            // 초기 동기화 타임아웃 설정
            initialSyncTimeoutRef.current = setTimeout(() => {
              // 초기 동기화 타임아웃
              setInitialSyncCompleted(true);
            }, 5000);
            
            // Y.Doc과 Provider 연결 상태 확인
          }
        });
        
        // 동기화 상태 변경 이벤트
        remoteProviderRef.current.on('synced', (isSynced: boolean) => {
          // 원격 동기화 상태
          setRemoteSynced(isSynced);
          
          // 초기 동기화 완료 감지
          if (isSynced && !initialSyncCompleted) {
            // 초기 동기화 완료
            
            // Y.js 문서 현재 상태 확인
            const fragment = ydoc.getXmlFragment('content');
            const fragmentLength = fragment.length;
            
            // 첫 번째 클라이언트이고 문서가 비어있으면 defaultValue 설정
            if (defaultValue && editor && fragmentLength === 0) {
              // 첫 번째 클라이언트 - 초기 내용 설정
              
              // 임시로 에디터에 내용을 설정하여 Y.js 문서에 반영
              // 이때 initialSyncCompleted가 false이므로 WebSocket으로 전송되지 않음
              const tempSyncState = initialSyncCompleted;
              try {
                editor.commands.setContent(defaultValue);
                // 초기 내용 설정 완료
              } catch (e) {
                console.error('[Y.js] 초기 내용 설정 실패:', e);
              }
            }
            
            setInitialSyncCompleted(true);
            
            // 타임아웃 정리
            if (initialSyncTimeoutRef.current) {
              clearTimeout(initialSyncTimeoutRef.current);
              initialSyncTimeoutRef.current = null;
            }
          }
        });
        
        // Awareness 변경 감지
        remoteProviderRef.current.awareness.on('change', () => {
          const states = Array.from(remoteProviderRef.current?.awareness.getStates() || []);
          const users = states
            .filter((state: any) => state.user)
            .map((state: any) => ({
              id: state.user.loginId || state.user.staffId,
              name: state.user.name,
              color: state.user.color
            }));
          setConnectedUsers(users);
          // 접속 사용자 업데이트
        });
        
        // 연결 시도
        // WebSocket 연결 시도
        if (remoteProviderRef.current.wsconnected) {
          setConnectionStatus('connected');
          setProviderReady(true);
        }
      }
      
      // 문서 변경 감지 - Y.js 타이핑 저장 로그만 남김
      ydoc.on('update', (update: Uint8Array, origin: any, doc: Y.Doc) => {
        const originName = origin?.constructor?.name || origin;
        
        // 로컬 변경일 때만 로그
        if (origin !== wsProvider && originName !== 'WebsocketProvider' && !readOnly) {
          console.log('[Y.js] 로컬 업데이트 감지 - Y.js 문서 저장');
        }
        
        // onChange 호출 및 백엔드 동기화
        if (onChangeRef.current && editor && !editor.isDestroyed && !isComposingRef.current && initialSyncCompleted) {
          if (origin !== wsProvider && originName !== 'WebsocketProvider') {
            const htmlContent = editor.getHTML();
            onChangeRef.current(htmlContent);
            // 백엔드로 동기화
            syncContentToBackend(htmlContent);
          }
        }
      });
      
      // Y.js 협업 모드 시작
    };
    
    initProviders();
    
    return () => {
      if (isUnmountingRef.current) {
        console.log('[YjsEditor] 실제 언마운트 감지 - Provider 정리');
        
        // 타이머 정리
        if (initialSyncTimeoutRef.current) {
          clearTimeout(initialSyncTimeoutRef.current);
          initialSyncTimeoutRef.current = null;
        }
        
        if (contentSyncTimeoutRef.current) {
          clearTimeout(contentSyncTimeoutRef.current);
          contentSyncTimeoutRef.current = null;
        }
        
        if (syncTimeout) {
          clearTimeout(syncTimeout);
        }
        
        // Provider 정리
        if (localProviderRef.current) {
          // 이미 해제된 provider
        }
        
        if (remoteProviderRef.current) {
          try {
            remoteProviderRef.current.disconnect();
            remoteProviderRef.current.destroy();
          } catch (e) {
            // Provider 해제 중 오류 무시
          }
          remoteProviderRef.current = null;
        }
      }
    };
  }, [wsProvider, editor, editorReady, readOnly, documentName, defaultValue, ydoc, initialSyncCompleted, syncContentToBackend]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 실제 언마운트 플래그 설정
      isUnmountingRef.current = true;
      console.log('[YjsEditor] 컴포넌트 언마운트 - 정리 시작');
      
      // Provider 정리 (언마운트 시에만)
      if (localProviderRef.current) {
        localProviderRef.current.destroy();
        localProviderRef.current = null;
      }
      
      if (remoteProviderRef.current) {
        remoteProviderRef.current.disconnect();
        remoteProviderRef.current.destroy();
        remoteProviderRef.current = null;
      }
      
      // Y.Doc 정리
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };
  }, []);

  // 툴바 액션 감지
  const handleToolbarAction = (callback: () => void) => {
    isToolbarActionRef.current = true;
    callback();
    // 툴바 액션 후 즉시 플래그 리셋
    setTimeout(() => {
      isToolbarActionRef.current = false;
    }, 0);
  };

  // 이미지 업로드 함수
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      interface UploadResponse {
        success: boolean;
        message: string;
        filePath: string;
        originalName: string;
      }

      const response = await wikiService.post<UploadResponse>('/api/files/images', formData);
      
      if (response.success) {
        return response.filePath;
      } else {
        throw new Error(response.message || '이미지 업로드 실패');
      }
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      throw error;
    }
  };

  // 클립보드 붙여넣기 처리
  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        
        const file = item.getAsFile();
        if (file) {
          try {
            const filePath = await uploadImage(file);
            
            if (editor) {
              const imageUrl = filePath;
              handleToolbarAction(() => {
                editor.chain().focus().setImage({ src: imageUrl }).run();
              });
            }
          } catch (error) {
            console.error('이미지 업로드 실패:', error);
            alert('이미지 업로드에 실패했습니다.');
          }
        }
        break;
      }
    }
  };

  // IME 조합 이벤트 감지
  useEffect(() => {
    const handleCompositionStart = () => {
      isComposingRef.current = true;
    };
    
    const handleCompositionEnd = () => {
      isComposingRef.current = false;
    };
    
    const editorElement = editor?.view.dom;
    if (editorElement) {
      editorElement.addEventListener('compositionstart', handleCompositionStart);
      editorElement.addEventListener('compositionend', handleCompositionEnd);
      
      return () => {
        editorElement.removeEventListener('compositionstart', handleCompositionStart);
        editorElement.removeEventListener('compositionend', handleCompositionEnd);
      };
    }
  }, [editor]);

  // 연결 상태 표시 (읽기 전용 모드 제외)
  const getConnectionIndicator = () => {
    if (readOnly) return null;
    
    const colors = {
      connecting: '#FFA500',
      connected: '#4CAF50',
      disconnected: '#F44336'
    };
    
    return (
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          width: 10, 
          height: 10, 
          borderRadius: '50%',
          backgroundColor: colors[connectionStatus as keyof typeof colors] || colors.disconnected,
          zIndex: 10
        }} 
      />
    );
  };

  // 사용자 커서 표시
  const renderConnectedUsers = () => {
    if (readOnly || connectedUsers.length <= 1) return null;
    
    return (
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        left: 8, 
        display: 'flex', 
        gap: 0.5,
        zIndex: 10
      }}>
        {connectedUsers.filter(user => user.id !== (currentUser.loginId || currentUser.staffId)).map(user => (
          <Box
            key={user.id}
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: user.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {!readOnly && (
        <MarkdownButton 
          editor={editor} 
          onToolbarAction={handleToolbarAction}
        />
      )}
      {!readOnly && editor && (
        <TableToolbar 
          editor={editor}
          onToolbarAction={handleToolbarAction}
        />
      )}
      {getConnectionIndicator()}
      {renderConnectedUsers()}
      <Box
        className={`tiptap-editor ${readOnly ? 'readonly' : ''}`}
        sx={{
          minHeight: readOnly ? 'auto' : '400px',
          border: readOnly ? 'none' : '1px solid #ddd',
          borderRadius: readOnly ? 0 : 1,
          p: readOnly ? 0 : 2,
          backgroundColor: readOnly ? 'transparent' : 'white',
          '& .ProseMirror': {
            minHeight: readOnly ? 'auto' : '350px',
            outline: 'none',
            '& p': {
              margin: 0,
              marginBottom: '1rem',
            },
            '& p:last-child': {
              marginBottom: 0,
            },
          },
        }}
        onPaste={handlePaste}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default YjsEditorNew;