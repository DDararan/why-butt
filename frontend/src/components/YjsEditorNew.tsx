import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
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
import { Plugin } from 'prosemirror-state';

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

const YjsEditorNew: React.FC<YjsEditorNewProps> = ({
  pageId,
  currentUser,
  defaultValue = '',
  onChange
}) => {
  const [editorReady, setEditorReady] = useState(false);
  const [isLocalSynced, setLocalSynced] = useState(false);
  const [isRemoteSynced, setRemoteSynced] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [connectedUsers, setConnectedUsers] = useState<Array<{id: string, name: string, color: string}>>([]);
  const [initialSyncCompleted, setInitialSyncCompleted] = useState(false);
  const [skipBroadcast, setSkipBroadcast] = useState(false); // 브로드캐스트 스킵 플래그
  
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
      Image.extend({
        addProseMirrorPlugins() {
          return [
            ...(this.parent?.() || []),
            new Plugin({
              props: {
                handlePaste: (view, event) => {
                  console.log('[이미지붙여넣기] handlePaste 호출됨');
                  const items = event.clipboardData?.items;
                  if (!items) {
                    console.log('[이미지붙여넣기] clipboardData.items가 없음');
                    return false;
                  }

                  console.log('[이미지붙여넣기] 클립보드 아이템 개수:', items.length);
                  
                  for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    console.log(`[이미지붙여넣기] 아이템 ${i}: type=${item.type}, kind=${item.kind}`);
                    
                    if (item.type.indexOf('image') === 0) {
                      console.log('[이미지붙여넣기] 이미지 아이템 발견');
                      const file = item.getAsFile();
                      if (!file) {
                        console.log('[이미지붙여넣기] getAsFile() 실패');
                        continue;
                      }

                      console.log('[이미지붙여넣기] 파일 정보:', {
                        name: file.name,
                        size: file.size,
                        type: file.type
                      });

                      event.preventDefault();

                      // FileReader를 사용하여 base64로 변환
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const base64 = e.target?.result as string;
                        console.log('[이미지붙여넣기] base64 변환 완료, 길이:', base64.length);
                        console.log('[이미지붙여넣기] base64 시작부분:', base64.substring(0, 50));
                        
                        const { schema } = view.state;
                        const node = schema.nodes.image.create({ src: base64 });
                        console.log('[이미지붙여넣기] 이미지 노드 생성:', node);
                        
                        const transaction = view.state.tr.replaceSelectionWith(node);
                        view.dispatch(transaction);
                        console.log('[이미지붙여넣기] 트랜잭션 dispatch 완료');
                      };
                      reader.onerror = (error) => {
                        console.error('[이미지붙여넣기] FileReader 오류:', error);
                      };
                      reader.readAsDataURL(file);

                      return true;
                    }
                  }
                  console.log('[이미지붙여넣기] 이미지 아이템을 찾지 못함');
                  return false;
                },
                handleDrop: (view, event) => {
                  const files = event.dataTransfer?.files;
                  if (!files || files.length === 0) return false;

                  const file = files[0];
                  if (!file.type.startsWith('image/')) return false;

                  event.preventDefault();

                  // FileReader를 사용하여 base64로 변환
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    console.log('[이미지드롭] base64 변환 완료');
                    
                    const { schema } = view.state;
                    const node = schema.nodes.image.create({ src: base64 });
                    const transaction = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(transaction);
                  };
                  reader.readAsDataURL(file);

                  return true;
                },
              },
            }),
          ];
        },
      }).configure({
        inline: true,
        HTMLAttributes: { class: 'editor-image' },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'editor-link' },
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
            
            // 초기 동기화 대기
            
            // 초기 동기화 타임아웃 설정
            initialSyncTimeoutRef.current = setTimeout(() => {
              // 초기 동기화 타임아웃
              console.log('[Y.js] 동기화 타임아웃 - 강제로 동기화 완료 처리');
              setInitialSyncCompleted(true);
            }, 5000);
            
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
            console.log('[키입력5] 백엔드 동기화 시작 (2초 디바운스)');
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
  }, [wsProvider, editor, editorReady, documentName, defaultValue, ydoc, initialSyncCompleted, syncContentToBackend, skipBroadcast, handleInitialDataSync]);

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
        // 서버에서 반환한 전체 URL을 그대로 사용
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
    if (connectedUsers.length <= 1) return null;
    
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
    <Box sx={{ position: 'relative' }}>
      {editor && (
        <EditorToolbar 
          editor={editor}
          handleToolbarClick={handleToolbarAction}
        />
      )}
      {getConnectionIndicator()}
      {renderConnectedUsers()}
      <Box
        className="tiptap-editor"
        sx={{
          minHeight: '400px',
          border: '1px solid #ddd',
          borderRadius: 1,
          p: 2,
          backgroundColor: 'white',
          '& .ProseMirror': {
            minHeight: '350px',
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