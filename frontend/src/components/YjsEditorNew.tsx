import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, Typography, Tooltip, Avatar, AvatarGroup } from '@mui/material';
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

import EditorToolbar from './EditorToolbar';
import './Editor.css';
import './TipTapEditor.css';
import { wikiService } from '../services/wikiService';

interface YjsEditorNewProps {
  pageId: number;
  currentUser: { staffId: string; userName: string; loginId?: string };
  defaultValue?: string;
  onChange?: (value: string) => void;
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

export interface YjsEditorRef {
  handleUndoAll: () => void;
}

const YjsEditorNew = React.forwardRef<YjsEditorRef, YjsEditorNewProps>(({
  pageId,
  currentUser,
  defaultValue = '',
  onChange
}, ref) => {
  const [editorReady, setEditorReady] = useState(false);
  const [isLocalSynced, setLocalSynced] = useState(false);
  const [isRemoteSynced, setRemoteSynced] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [connectedUsers, setConnectedUsers] = useState<Array<{
    id: string, 
    name: string, 
    color: string,
    loginId?: string,
    staffId?: string,
    clientId?: number
  }>>([]);
  const [initialSyncCompleted, setInitialSyncCompleted] = useState(false);
  const [skipBroadcast, setSkipBroadcast] = useState(false); // 브로드캐스트 스킵 플래그
  const [canUndo, setCanUndo] = useState(false); // UndoManager 상태
  
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
  const skipBroadcastRef = useRef(false); // 브로드캐스트 스킵을 ref로 관리
  const undoManagerRef = useRef<Y.UndoManager | null>(null); // UndoManager 추가
  
  // onChange 최신 값 유지
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  // 백엔드로 컨텐츠 동기화 (디바운스 처리)
  const syncContentToBackend = useCallback((content: string) => {
    if (!pageId) return;
    
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
          console.log('[Y.js] 동기화된 컨텐츠 길이:', content.length);
        } catch (error) {
          console.error('[Y.js] 백엔드 동기화 실패:', error);
        }
      }
    }, 2000);
  }, [pageId]);
  
  // 문서 이름 생성 (Docmost 방식: 단순히 pageId 사용)
  const documentName = useMemo(() => `${pageId}`, [pageId]);
  
  // 사용자 색상 생성
  const userColor = useMemo(() => {
    const hash = currentUser.userName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return userColors[hash % userColors.length];
  }, [currentUser.userName]);

  // Y.Doc 초기화 - 컴포넌트별로 고유한 인스턴스 생성
  const ydoc = useMemo(() => {
    console.log('[] Y.Doc 생성/초기화', {
      pageId,
      documentName
    });
    
    // 기존 Y.Doc 정리
    if (ydocRef.current) {
      console.log('[] 기존 Y.Doc 파기');
      // 기존 Y.Doc 정리
      ydocRef.current.destroy();
    }
    
    // 새 Y.Doc 생성 (clientID는 자동 생성됨)
    const newDoc = new Y.Doc();
    ydocRef.current = newDoc;
    
    console.log('[페이지수정13] 새 Y.Doc 생성 완료');
    
    return newDoc;
  }, [pageId, documentName]); // pageId 변경 시 새 문서 생성

  // WebSocket Provider 초기 설정 (Docmost 방식)
  const wsProvider = useMemo(() => {
    console.log('[페이지수정14] WebSocket Provider 생성 시작', {
      pageId,
      documentName
    });
    
    if (typeof window === 'undefined') return null;
    
    // WebSocket Provider 초기화
    
    // 현재 접속한 URL을 기반으로 동적으로 WebSocket URL 생성
    const getWebSocketUrl = () => {
      
      // 현재 페이지의 호스트 정보 가져오기
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
       
      // 현재 호스트 사용
      return `${protocol}//${host}:8181/ws/yjs`;
    };
    
    const wsUrl = getWebSocketUrl();
    
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
        resyncInterval: -1,
      }
    );
    
    // awareness에 사용자 정보 설정
    provider.awareness.setLocalStateField('user', {
      loginId: loginId,
      staffId: currentUser.staffId,
      name: currentUser.userName,
      color: userColor,
      id: loginId || currentUser.staffId // 고유 ID 추가
    });
    
    // Provider awareness 설정
    console.log('[페이지수정15] WebSocket Provider 생성 완료', {
      wsUrl,
      documentName,
      params: {
        loginId: loginId,
        userId: currentUser.staffId,
        userName: currentUser.userName,
      }
    });
    
    return provider;
  }, [documentName, ydoc, currentUser.staffId, currentUser.userName, currentUser.loginId, userColor]);

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
        allowBase64: true,
        HTMLAttributes: { class: 'editor-image' },
      }),
      Placeholder.configure({
        placeholder: '내용을 입력하세요...',
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
      // CollaborationCursor 추가 (wsProvider가 있을 때만)
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
    immediatelyRender: false, // 초기 렌더링을 지연하여 Y.js 동기화 대기
    editable: true,
    onCreate: ({ editor }) => {
      console.log('[페이지수정16] TipTap 에디터 생성 완료');
      
      // 에디터 생성 시 Y.js fragment 확인
      const fragment = ydoc.getXmlFragment('content');
      console.log('[페이지수정16-1] 에디터 생성 시 Y.js fragment 상태:');
      console.log('  - fragment.toString():', fragment.toString());
      console.log('  - fragment.length:', fragment.length);
      console.log('  - 에디터 초기 HTML:', editor.getHTML());
      
      setEditorReady(true);
    },
    onUpdate: ({ editor, transaction }) => {
      
      
      // 타이핑 시 Y.js 저장 로그
      if (transaction.docChanged) {
        console.log('[키입력1] TipTap 에디터 변경 감지', {
          docChanged: transaction.docChanged,
          steps: transaction.steps.length,
          content: editor.getHTML().substring(0, 50) + '...'
        });
        
        // Y.js fragment 상태 확인
        const fragment = ydoc.getXmlFragment('content');
        console.log('[키입력3-1] Y.js fragment 현재 상태:');
        console.log('  - fragment.toString():', fragment.toString());
        console.log('  - fragment.length:', fragment.length);
        
        // 이미지가 포함되어 있는지 확인
        const html = editor.getHTML();
        if (html.includes('<img')) {
          console.log('[이미지확인] 에디터에 이미지 포함됨');
          const imgMatch = html.match(/<img[^>]+src="([^"]+)"/);
          if (imgMatch) {
            console.log('[이미지확인] 이미지 src 시작부분:', imgMatch[1].substring(0, 100));
          }
        }
      }
      
      // 툴바 액션이나 IME 조합 중이 아닌 경우에만 onChange 호출
      if (!isToolbarActionRef.current && !isComposingRef.current) {
        if (onChangeRef.current && transaction.docChanged) {
          console.log('[키입력2] onChange 호출');
          onChangeRef.current(editor.getHTML());
        }
      }
    },
    // onTransaction, onSelectionUpdate 제거
  }, [wsProvider, userColor, ydoc, defaultValue]);

  // 키 입력 이벤트 감지 제거

  // 초기 데이터 동기화를 위한 함수 (페이지 수정 버튼 클릭 시 사용)
  const handleInitialDataSync = useCallback((fragmentLength: number, currentContent: string) => {
    console.log('[페이지수정_초기화] 초기 데이터 동기화 시작');
    console.log('  - fragment 길이:', fragmentLength);
    console.log('  - 현재 컨텐츠 길이:', currentContent.length);
    console.log('  - DB defaultValue 길이:', defaultValue ? defaultValue.length : 0);
    
    const isEmptyContent = !currentContent || currentContent === '<p></p>' || currentContent.length < 10;
    
    // Y.js 문서가 비어있거나 의심스러운 경우 DB 내용 사용
    if (defaultValue && editor && (fragmentLength === 0 || isEmptyContent)) {
      console.log('[페이지수정_초기화] Y.js 문서가 비어있음 - DB 내용으로 초기화');
      try {
        // 에디터 내용 설정
        editor.commands.setContent(defaultValue);
        console.log('[페이지수정_초기화] DB 내용 설정 완료');
      } catch (e) {
        console.error('[페이지수정_초기화] 초기 내용 설정 실패:', e);
      }
    } else {
      console.log('[페이지수정_초기화] Y.js 문서에 유효한 내용 있음 - 그대로 사용');
      console.log('  - Y.js 내용:', currentContent.substring(0, 100) + '...');
    }
  }, [defaultValue, editor]);

  // Provider 초기화
  useEffect(() => {
    // wsProvider가 없거나 에디터가 준비되지 않은 경우만 건너뛰기
    if (!wsProvider || !editor || !editorReady) return;
    
    // 플래그 초기화
    skipBroadcastRef.current = false;
    
    let syncTimeout: NodeJS.Timeout | undefined;
    
    const initProviders = async () => {
      // Provider 초기화
      
      // 2. RemoteProvider 참조 설정
      remoteProviderRef.current = wsProvider;
      
      if (remoteProviderRef.current) {
        // WebSocket 연결 상태 이벤트
        remoteProviderRef.current.on('status', (event: any) => {
          // WebSocket 상태 변경
          console.log('[Y.js] WebSocket 상태 변경:', event.status);
          console.log('[Y.js] 페이지 ID:', pageId, ', Room:', documentName);
          setConnectionStatus(event.status);
          
          if (event.status === 'connected') {
            // WebSocket 연결 완료
            console.log('[초기동기화] WebSocket 연결 완료');
            console.log('[초기동기화] SyncStep1 메시지 전송 시작...');
            setProviderReady(true);
            
            skipBroadcastRef.current = true;
            // Y.Doc과 Provider 연결 상태 확인
          }
        });
        
        // 동기화 상태 변경 이벤트
        remoteProviderRef.current.on('sync', (isSynced: boolean) => {
          // 원격 동기화 상태
          console.log('[초기동기화] ============= Y.js 동기화 상태 변경 =============');
          console.log('[초기동기화] 동기화 상태:', isSynced ? '완료' : '진행중');
          setRemoteSynced(isSynced);
          
          // 초기 동기화 완료 감지
          if (isSynced && !initialSyncCompleted) {
            console.log('[초기동기화] ✅ 초기 동기화 완료!');
            console.log('[초기동기화] - SyncStep1 → SyncStep2 → SyncDone 프로토콜 완료');
            console.log('[초기동기화] - 이제부터 실시간 UPDATE 메시지로 동기화됩니다.');
            
            // 초기 동기화 플래그 해제
            setTimeout(() => {
              skipBroadcastRef.current = false;
            }, 500);
            
            // UndoManager 초기화 - 초기 동기화 완료 후 설정
            if (!undoManagerRef.current) {
              const fragment = ydoc.getXmlFragment('content');
              undoManagerRef.current = new Y.UndoManager(fragment, {
                // 현재 사용자의 변경사항만 추적
                trackedOrigins: new Set([ydoc.clientID]),
                captureTimeout: 300, // 300ms 이내의 변경사항은 하나로 그룹화
              });
              
              // UndoManager 상태 변경 감지
              undoManagerRef.current.on('stack-item-added', () => {
                console.log('[UndoManager] 변경사항 추가됨, undo 가능:', undoManagerRef.current!.undoStack.length > 0);
                setCanUndo(undoManagerRef.current!.undoStack.length > 0);
              });
              
              undoManagerRef.current.on('stack-item-popped', () => {
                console.log('[UndoManager] 변경사항 취소됨, undo 가능:', undoManagerRef.current!.undoStack.length > 0);
                setCanUndo(undoManagerRef.current!.undoStack.length > 0);
              });
              
              console.log('[UndoManager] 초기화 완료 - clientID:', ydoc.clientID);
            }
            
            // 약간의 지연을 두고 에디터 내용 확인
            setTimeout(() => {
              console.log('[디버그] setTimeout 내부 실행');
              // Y.js 문서 현재 상태 확인
              const fragment = ydoc.getXmlFragment('content');
              const fragmentLength = fragment.length;
              
              // Y.js 문서 내부 구조 상세 로그
              console.log('[디버그] Y.js 문서 구조 분석:');
              console.log('  - fragment 객체:', fragment);
              console.log('  - fragment.toArray():', fragment.toArray());
              if (fragment.length > 0) {
                const firstItem = fragment.get(0);
                console.log('  - 첫 번째 아이템:', firstItem);
                console.log('  - 첫 번째 아이템 타입:', firstItem?.constructor.name);
              }
              
              // 에디터가 준비되었을 때 Y.js 문서의 실제 내용 확인
              let currentContent = '';
              if (editor && !editor.isDestroyed) {
                currentContent = editor.getHTML();
                console.log('[Y.js] 초기 동기화 - 현재 에디터 내용:', currentContent.substring(0, 100) + '...');
                console.log('[Y.js] 초기 동기화 - 에디터 내용 길이:', currentContent.length);
                console.log('[Y.js] 초기 동기화 - fragment 노드 수:', fragmentLength);
                console.log('[Y.js] 초기 동기화 - defaultValue 길이:', defaultValue ? defaultValue.length : 0);
              }
              
              // 초기 데이터 동기화 함수 호출
              handleInitialDataSync(fragmentLength, currentContent);
              
              setInitialSyncCompleted(true);
              
              // 초기 동기화 완료 로그
              console.log('[Y.js] 초기 동기화 처리 완료');
              
              // 타임아웃 정리
              if (initialSyncTimeoutRef.current) {
                clearTimeout(initialSyncTimeoutRef.current);
                initialSyncTimeoutRef.current = null;
              }
            }, 100); // 100ms 지연
          }
        });
        
        // Awareness 변경 감지
        remoteProviderRef.current.awareness.on('change', () => {
          const states = Array.from(remoteProviderRef.current?.awareness.getStates() || []);
          console.log('[Awareness] 상태 변경 감지:', states);
          
          const users = states
            .map(([clientId, state]) => {
              if (state.user) {
                return {
                  clientId,
                  id: state.user.id || state.user.loginId || state.user.staffId,
                  name: state.user.name,
                  color: state.user.color,
                  loginId: state.user.loginId,
                  staffId: state.user.staffId
                };
              }
              return null;
            })
            .filter((user): user is NonNullable<typeof user> => user !== null);
          
          console.log('[Awareness] 접속 사용자 목록:', users);
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
        if (origin !== wsProvider && originName !== 'WebsocketProvider') {
          
          // 브로드캐스트 스킵 플래그 확인
          if (skipBroadcastRef.current) {
            console.log('[페이지수정19] 브로드캐스트 스킵 - Y.js 업데이트 무시');
            return; // 브로드캐스트 스킵
          }
          
          console.log('[실시간수정] Y.js UPDATE 메시지 생성', {
            origin: originName,
            updateSize: update.length,
            docId: ydoc.clientID,
            skipBroadcast: skipBroadcastRef.current
          });
          
          // Y.js 문서 현재 상태 확인
          const fragment = ydoc.getXmlFragment('content');
          console.log('[키입력3-1] Y.js fragment 현재 상태:');
          console.log('  - fragment.toString():', fragment.toString());
          console.log('  - fragment.length:', fragment.length);
          
          if (editor && !editor.isDestroyed) {
            const editorContent = editor.getHTML();
            console.log('[키입력3-2] 에디터 현재 상태:');
            console.log('  - 에디터 HTML:', editorContent.substring(0, 100) + '...');
            console.log('  - 에디터 길이:', editorContent.length);
            
            // 이미지가 포함된 경우 WebSocket 전송 확인
            if (editorContent.includes('<img')) {
              console.log('[이미지동기화] 이미지가 포함된 Y.js 업데이트 감지');
              console.log('[이미지동기화] wsProvider 연결 상태:', wsProvider.wsconnected);
              console.log('[이미지동기화] WebSocket readyState:', wsProvider.ws?.readyState);
              
              // Y.js는 자동으로 브로드캐스트해야 함
              // 수동으로 동기화 트리거
              if (wsProvider.wsconnected) {
                console.log('[이미지동기화] WebSocket이 연결되어 있음 - Y.js가 자동으로 브로드캐스트해야 함');
              } else {
                console.log('[이미지동기화] WebSocket이 연결되어 있지 않음!');
              }
            }
          }
        }
        
        // 원격 업데이트일 때 로그 (WebSocket으로부터 받은 업데이트)
        if ((origin === wsProvider || originName === 'WebsocketProvider') && editor && !editor.isDestroyed) {
          const currentContent = editor.getHTML();
          console.log('[페이지수정17] 원격 Y.js 업데이트 수신', {
            origin: originName,
            contentLength: currentContent.length,
            content: currentContent.substring(0, 100) + '...'
          });
          
          // 이미지가 포함된 업데이트인지 확인
          if (currentContent.includes('<img')) {
            console.log('[원격이미지] 원격에서 이미지 업데이트 수신');
            const imgMatch = currentContent.match(/<img[^>]+src="([^"]+)"/);
            if (imgMatch) {
              console.log('[원격이미지] 이미지 src 시작부분:', imgMatch[1].substring(0, 100));
              
              // 에디터 강제 리렌더링
              setTimeout(() => {
                if (editor && !editor.isDestroyed) {
                  // 현재 selection 저장
                  const { from, to } = editor.state.selection;
                  
                  // 에디터 view 강제 업데이트
                  editor.view.updateState(editor.view.state);
                  
                  // selection 복원
                  editor.commands.setTextSelection({ from, to });
                  
                  console.log('[원격이미지] 에디터 view 강제 업데이트 완료');
                }
              }, 50);
            }
          }
        }
        
        // onChange 호출 및 백엔드 동기화
        if (onChangeRef.current && editor && !editor.isDestroyed && !isComposingRef.current && initialSyncCompleted) {
          if (origin !== wsProvider && originName !== 'WebsocketProvider') {
            
            // 초기 동기화 origin인 경우 onChange 호출 안함
            if (origin === 'initial-sync') {
              console.log('[페이지수정_초기화] 초기 동기화 - onChange/백엔드 동기화 건너뛰기');
              return;
            }
            
            // 브로드캐스트 스킵 플래그 확인
            if (skipBroadcastRef.current) {
              console.log('[페이지수정20] 브로드캐스트 스킵 - onChange/백엔드 동기화 건너뛰기');
              return;
            }
            
            console.log('[키입력4] Y.js 변경을 onChange로 전달');
            const htmlContent = editor.getHTML();
            onChangeRef.current(htmlContent);
            // 백엔드로 동기화
            // console.log('[키입력5] 백엔드 동기화 시작 (2초 디바운스)');
            // syncContentToBackend(htmlContent);
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
        
        // UndoManager 정리
        if (undoManagerRef.current) {
          console.log('[UndoManager] 정리 중...');
          undoManagerRef.current.clear(); // undo/redo 스택 초기화
          undoManagerRef.current = null;
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
    }, [wsProvider, editor, editorReady, documentName, defaultValue, ydoc, initialSyncCompleted, handleInitialDataSync]);

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

  // 모든 변경사항 취소 (사용자별 UndoManager 사용)
  const handleUndoAll = useCallback(() => {
    if (!undoManagerRef.current) {
      console.log('[UndoManager] UndoManager가 초기화되지 않음');
      return;
    }
    
    console.log('[UndoManager] 모든 변경사항 취소 시작');
    console.log('[UndoManager] 현재 undo 스택 크기:', undoManagerRef.current.undoStack.length);
    
    // 모든 변경사항을 한 번에 취소
    let undoCount = 0;
    while (undoManagerRef.current.undoStack.length > 0) {
      undoManagerRef.current.undo();
      undoCount++;
    }
    
    console.log(`[UndoManager] ${undoCount}개의 변경사항 취소 완료`);
    setCanUndo(false);
  }, []);

  // ref로 handleUndoAll 노출
  React.useImperativeHandle(ref, () => ({
    handleUndoAll
  }), [handleUndoAll]);

  // 이미지 붙여넣기 처리 (Y.js 동기화를 위해 에디터 레벨에서 처리)
  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items || !editor) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        event.stopPropagation();
        
        const file = item.getAsFile();
        if (file) {
          console.log('[이미지붙여넣기] 파일 크기:', file.size);
          
          // 원본 이미지 사용
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            console.log('[이미지붙여넣기-에디터레벨] base64 변환 완료');
            console.log('[이미지붙여넣기-에디터레벨] 원본 크기:', base64.length);
            
            // skipBroadcast 플래그 해제
            skipBroadcastRef.current = false;
            
            // 에디터 commands를 사용하여 Y.js가 자동으로 동기화
            setTimeout(() => {
              editor.chain().focus().setImage({ src: base64 }).run();
              console.log('[이미지붙여넣기-에디터레벨] 원본 이미지 에디터 명령 실행 완료');
            }, 100);
          };
          reader.readAsDataURL(file);
        }
        return true;
      }
    }
    return false;
  }, [editor]);

  // 연결 상태 표시
  const getConnectionIndicator = () => {
    
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
    const otherUsers = connectedUsers.filter(user => user.id !== (currentUser.loginId || currentUser.staffId));
    
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 1,
        padding: '8px 16px',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0',
        minHeight: '40px'
      }}>
        {otherUsers.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#999' }}>
            현재 혼자 편집 중입니다
          </Typography>
        ) : (
          <>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#666', mr: 1 }}>
              실시간 편집 중:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              {otherUsers.map(user => (
                <Tooltip key={user.id} title={`${user.name} (${user.loginId || user.staffId})`}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      padding: '4px 12px',
                      borderRadius: '16px',
                      backgroundColor: 'white',
                      border: `2px solid ${user.color}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      cursor: 'default'
                    }}
                  >
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: user.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '13px' }}>
                      {user.name}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Box>
            <Typography variant="caption" sx={{ ml: 'auto', color: '#666', fontWeight: 'bold' }}>
              총 {otherUsers.length}명 편집 중
            </Typography>
          </>
        )}
      </Box>
    );
  };

  // 초기 동기화가 완료되지 않은 경우 로딩 표시
  if (!initialSyncCompleted && !isLocalSynced) {
    return (
      <Box sx={{ 
        position: 'relative', 
        minHeight: '400px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid #ddd',
        borderRadius: 1,
        backgroundColor: 'white'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2 }}>Y.js 문서 동기화 중...</Typography>
          <Typography variant="body2" color="text.secondary">
            다른 사용자의 최신 편집 내용을 불러오고 있습니다.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderConnectedUsers()}
      {editor && (
        <EditorToolbar 
          editor={editor}
          handleToolbarClick={handleToolbarAction}
        />
      )}
      {getConnectionIndicator()}
      <Box
        className="tiptap-editor"
        sx={{
          flex: 1,
          border: '1px solid #ddd',
          borderRadius: 1,
          p: 1.5,
          backgroundColor: 'white',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          '& .ProseMirror': {
            flex: 1,
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
});

export default YjsEditorNew;