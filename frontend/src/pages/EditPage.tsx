import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  TextField,
  Button,
  Box,
  Alert,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import { orange } from '@mui/material/colors';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import { wikiService } from '../services/wikiService';
import { pageTypeService } from '../services/pageTypeService';
import { WikiPageSummary } from '../types/wiki';
import { WikiPageType } from '../types/pageType';
import { usePageTree } from '../contexts/PageTreeContext';
import YjsEditorNew from '../components/YjsEditorNew';
import BasicEditor from '../components/BasicEditor';
import { defaultMarkdownParser } from 'prosemirror-markdown';
import '../styles/markdown.css';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { editingSessionService, EditingUser } from '../services/editingSessionService';

interface LocationState {
  isNew?: boolean;
  parentTitle?: string;
  parentId?: number;
  content?: string;
  pageType?: string;
}

// 페이지를 평면 리스트로 변환하는 함수 (계층 구조 유지)
const flattenPages = (pages: WikiPageSummary[], level = 0): Array<WikiPageSummary & { level: number; displayTitle: string }> => {
  const result: Array<WikiPageSummary & { level: number; displayTitle: string }> = [];
  
  pages.forEach(page => {
    const indent = '　'.repeat(level); // 전각 공백으로 들여쓰기
    const prefix = level > 0 ? '└ ' : '';
    const displayTitle = `${indent}${prefix}${page.title}`;
    
    result.push({
      ...page,
      level,
      displayTitle
    });
    
    if (page.children && page.children.length > 0) {
      result.push(...flattenPages(page.children, level + 1));
    }
  });
  
  return result;
};

interface User {
  staffId: string;
  loginId: string;
  userName: string;
  email: string;
  token: string;
}

interface EditPageProps {
  currentUser: User;
}

const EditPage: React.FC<EditPageProps> = ({ currentUser }) => {
  const { id: urlId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const isNewPage = !urlId || location.pathname === '/wiki/new';
  const { refreshPageTree } = usePageTree();
  
  // 제목 입력 필드에 대한 ref 추가
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // WebSocket 연결 상태 관리 ref (리렌더링 방지용)
  const websocketInitializedRef = useRef(false);
  const currentPageIdRef = useRef<string | null>(null);
  const isUnmountingRef = useRef(false); // 실제 언마운트 추적
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(state?.content || '');
  const contentRef = useRef(state?.content || ''); // 마크다운 버튼용 ref
  const [loading, setLoading] = useState(!state?.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageType, setPageType] = useState<string>(state?.pageType || 'DOCUMENT');
  const [parentId, setParentId] = useState<number | null>(state?.parentId || null);
  const [availablePages, setAvailablePages] = useState<WikiPageSummary[]>([]);
  const [pageTypes, setPageTypes] = useState<WikiPageType[]>([]);
  const [parentPageType, setParentPageType] = useState<string | null>(null);
  
  // 실시간 편집 상태 관리 (읽기 전용)
  const [currentEditors, setCurrentEditors] = useState<EditingUser[]>([]);

  // 페이지 타입 목록 (기본값으로 사용할 타입들)
  const defaultPageTypes = [
    { pageType: 'DOCUMENT', pageTitle: '문서'},
    { pageType: 'REPORT', pageTitle: '보고서'},
    { pageType: 'GUIDE', pageTitle: '가이드'},
    { pageType: 'POLICY', pageTitle: '정책'},
    { pageType: 'MEETING', pageTitle: '회의록'},
    { pageType: 'PROJECT', pageTitle: '프로젝트'},
    { pageType: 'OTHER', pageTitle: '기타'},
  ];

  // 평면화된 페이지 리스트 생성
  const flattenedPages = flattenPages(availablePages);

  useEffect(() => {
    const fetchPage = async () => {
      // state에서 전달받은 내용이 있으면 API 호출 생략
      if (state?.content) {
        setLoading(false);
        return;
      }

      if (isNewPage) {
        setLoading(false);
        
        // 상위 페이지가 지정된 경우 처리
        if (state?.parentId) {
          // parentId가 직접 전달된 경우
          setParentId(state.parentId);
          // 부모 페이지 정보를 가져와서 타입 설정
          try {
            const parentPage = flattenedPages.find(page => page.id === state.parentId);
            if (parentPage) {
              setPageType(parentPage.pageType);
              setParentPageType(parentPage.pageType);
            }
          } catch (error) {
            console.error('부모 페이지 타입 설정 실패:', error);
          }
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const page = await wikiService.getPageById(parseInt(urlId!));
        setTitle(page.title);
        // 마크다운 형식의 내용을 그대로 사용
        setContent(page.content);
        setParentId(page.parentId || null);
        setPageType(page.pageType || 'DOCUMENT');
        
        // 부모 페이지가 있는 경우 부모의 페이지 타입 설정
        if (page.parentId && page.parent) {
          setParentPageType(page.parent.pageType);
        }

        // 페이지 타입 목록 가져오기
        try {
          const types = await pageTypeService.getAllPageTypes();
          if (types && types.length > 0) {
            setPageTypes(types);
            
            // 현재 페이지의 타입이 types에 없으면 기본값으로 설정
            const currentPageType = page.pageType;
            const validTypes = types.map(t => t.pageType);
            if (!validTypes.includes(currentPageType)) {
              setPageType(types[0].pageType || 'DOCUMENT');
            }
          } else {
            // 백엔드에서 타입을 가져올 수 없으면 기본 타입 사용
            console.warn('페이지 타입 목록을 가져올 수 없어 기본값 사용');
            setPageTypes(defaultPageTypes.map(type => ({
              ...type,
              creationStaffId: 'SYSTEM',
              modifyStaffId: 'SYSTEM',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })) as WikiPageType[]);
          }
        } catch (error) {
          console.error('페이지 타입 로드 실패:', error);
          // 오류 시 기본 타입 사용
          setPageTypes(defaultPageTypes.map(type => ({
            ...type,
            creationStaffId: 'SYSTEM',
            modifyStaffId: 'SYSTEM',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })) as WikiPageType[]);
        }
      } catch (error) {
        setError('페이지를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    const fetchAvailablePages = async () => {
      try {
        // 먼저 모든 페이지 타입을 조회
        const types = await pageTypeService.getAllPageTypes();
        const allPages: WikiPageSummary[] = [];
        
        // 각 페이지 타입별로 페이지들을 조회
        for (const type of types) {
          try {
            const pages = await wikiService.getPagesByType(type.pageType);
            allPages.push(...pages);
          } catch (error) {
            console.error(`페이지 타입 ${type.pageType} 조회 실패:`, error);
          }
        }
        
        setAvailablePages(allPages);
      } catch (error) {
        console.error('페이지 목록을 불러오는데 실패했습니다:', error);
        // 실패 시 기본 타입들로라도 조회 시도
        try {
          const menuPages = await wikiService.getPagesByType('DOCUMENT');
          const dailyPages = await wikiService.getPagesByType('DAILY');
          const etcPages = await wikiService.getPagesByType('ETC');
          const allPages = [...menuPages, ...dailyPages, ...etcPages];
          setAvailablePages(allPages);
        } catch (fallbackError) {
          console.error('기본 페이지 타입 조회도 실패:', fallbackError);
        }
      }
    };

    const fetchPageTypes = async () => {
      try {
        const types = await pageTypeService.getAllPageTypes();
        setPageTypes(types);
        
        // 새 페이지이고 pageType이 설정되지 않은 경우 첫 번째 타입으로 설정
        if (isNewPage && !state?.pageType && types.length > 0) {
          setPageType(types[0].pageType || 'DOCUMENT');
        }
      } catch (error) {
        console.error('페이지 타입을 불러오는데 실패했습니다:', error);
        // 실패 시 기본값으로 설정
        setPageTypes(defaultPageTypes.map(type => ({
          ...type,
          creationStaffId: 'SYSTEM',
          modifyStaffId: 'SYSTEM',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })) as WikiPageType[]);
      }
    };

    fetchPage();
    fetchPageTypes();
    fetchAvailablePages();
  }, [urlId, isNewPage, state]);

  // 컴포넌트 마운트 후 제목 필드에 포커스 설정
  useEffect(() => {
    // 로딩이 완료된 후에 포커스 설정
    if (!loading && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [loading]);

  // EditPage는 히스토리 비교용이므로 WebSocket 연결 제거
  // 협업 편집은 WikiPage에서만 사용

  // 컴포넌트 언마운트 추적 - beforeunload나 페이지 이동 시에만 cleanup 허용
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('📤 페이지 이동/새로고침 감지 - 언마운트 플래그 설정');
      isUnmountingRef.current = true;
    };
    
    // 페이지 이동/새로고침 감지
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 여기서는 언마운트 플래그 설정하지 않음 (실제 언마운트인지 확실하지 않음)
    };
  }, []);
  
  // 페이지 변경 시 편집 세션 변경 - 중복 방지를 위해 제거
  // useEffect에서 이미 처리하므로 별도 처리 불필요

  const handleContentChange = (newContent: string) => {
    const changeTimestamp = new Date().toISOString();
    console.log(`[${changeTimestamp}] 📝 handleContentChange 호출됨!`);
    console.log(`[${changeTimestamp}] 📊 콘텐츠 변경:`, {
      이전길이: content.length,
      새로운길이: newContent.length,
      차이: newContent.length - content.length
    });
    console.trace(`[${changeTimestamp}] 📍 handleContentChange 호출 스택 추적`);
    setContent(newContent);
    contentRef.current = newContent; // ref도 동기화
    console.log(`[${changeTimestamp}] ✅ setContent 실행됨 -> 리렌더링 트리거`);
  };

  const handleMarkdownButtonChange = useCallback((newContent: string) => {
    contentRef.current = newContent;
    setContent(newContent);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      if (!title.trim()) {
        setError('제목을 입력해주세요.');
        return;
      }

      // 마크다운 형식의 내용을 그대로 저장
      if (isNewPage) {
        const result = await wikiService.createPage({
          title: title.trim(),
          content: contentRef.current,
          parentId: parentId || undefined,
          pageType: pageType
        });
        refreshPageTree();
        console.log('🚪 페이지 저장 후 이동 - 언마운트 플래그 설정');
        isUnmountingRef.current = true;
        navigate(`/wiki/${result.id}`);
      } else {
        const result = await wikiService.updatePageById(parseInt(urlId!), {
          title: title.trim(),
          content: contentRef.current,
          parentId: parentId || undefined,
          pageType: pageType
        });
        refreshPageTree();
        console.log('🚪 페이지 저장 후 이동 - 언마운트 플래그 설정');
        isUnmountingRef.current = true;
        navigate(`/wiki/${result.id}`);
      }
    } catch (error) {
      setError('페이지 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }, [title, content, parentId, pageType, isNewPage, urlId, navigate, refreshPageTree]);

  // Ctrl+S 단축키 이벤트 리스너 추가
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault(); // 브라우저 기본 저장 동작 방지
        handleSubmit(event as any); // 저장 함수 호출
      }
    };

    // 이벤트 리스너 등록
    document.addEventListener('keydown', handleKeyDown);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSubmit]); // 의존성 배열에 handleSubmit 추가

  // 페이지를 떠날 때 변경 사항 확인
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasChanges = title.trim() !== '' || content.trim() !== '';
      const titleChanged = isNewPage ? title.trim() !== '' : title !== (urlId ? urlId : '');
      
      if (hasChanges || titleChanged) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [title, content, isNewPage, urlId]);

  const handleCancel = () => {
    // 내용이 변경되었는지 확인
    const hasChanges = title.trim() !== '' || content.trim() !== '';
    if (hasChanges) {
      const confirmCancel = window.confirm('작성 중인 내용이 있습니다. 정말로 취소하시겠습니까?\n저장하지 않은 내용은 모두 사라집니다.');
      if (!confirmCancel) {
        return;
      }
    }
    
    // 페이지 이동 시 언마운트 플래그 설정
    console.log('🚪 페이지 이동 - 언마운트 플래그 설정 (handleCancel)');
    isUnmountingRef.current = true;
    
    if (isNewPage) {
      // 새 페이지 작성 중인 경우
      if (state?.parentId) {
        // 부모 페이지가 있으면 해당 페이지로 이동
        navigate(`/wiki/${state.parentId}`);
      } else {
        // 부모 페이지가 없으면 홈으로 이동
        navigate('/');
      }
    } else {
      // 기존 페이지 수정 중인 경우 해당 페이지로 이동
      navigate(`/wiki/${urlId}`);
    }
  };

  const handleInsertMarkdown = (markdownText: string) => {
    setContent(prev => prev + markdownText);
  };

  interface UploadResponse {
    success: boolean;
    message: string;
    filePath: string;
    originalName: string;
  }

  // 이미지 업로드 함수
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
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
            setError(null);
            const uploadingText = '\n![업로드 중...](uploading)\n';
            setContent(prev => prev + uploadingText);
            
            const filePath = await uploadImage(file);
            
            const imageMarkdown = `\n![이미지](${filePath})\n`;
            setContent(prev => prev.replace(uploadingText, imageMarkdown));
            
          } catch (error) {
            setContent(prev => prev.replace('\n![업로드 중...](uploading)\n', ''));
            setError('이미지 업로드에 실패했습니다: ' + (error as Error).message);
          }
        }
        break;
      }
    }
  };

  // 부모 페이지 변경 시 페이지 타입도 업데이트
  const handleParentChange = (newParentId: number | '') => {
    setParentId(newParentId === '' ? null : newParentId as number);
    
    if (newParentId !== '') {
      // 선택된 부모 페이지의 타입을 찾아서 설정
      const selectedParent = flattenedPages.find(page => page.id === newParentId);
      if (selectedParent) {
        setPageType(selectedParent.pageType);
        setParentPageType(selectedParent.pageType);
      }
    } else {
      // 최상위 페이지로 설정 시 기본 타입으로 복원
      setParentPageType(null);
      // 기존 페이지 타입 유지 또는 기본값으로 설정
      if (isNewPage && pageTypes.length > 0) {
        setPageType(pageTypes[0].pageType || 'DOCUMENT');
      }
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box>로딩 중...</Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} data-editpage-mounted="true">
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {/* 히스토리 비교 모드에서는 실시간 편집 상태 표시 안 함 */}
        
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                inputRef={titleInputRef}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>페이지 타입</InputLabel>
                <Select
                  value={pageType}
                  label="페이지 타입"
                  onChange={(e) => setPageType(e.target.value)}
                >
                  {pageTypes.map((type, index) => (
                    <MenuItem 
                      key={index} 
                      value={type.pageType || 'DOCUMENT'}
                    >
                      {type.pageTitle || type.pageType}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>상위 페이지</InputLabel>
                <Select
                  value={parentId || ''}
                  label="상위 페이지"
                  onChange={(e) => handleParentChange(e.target.value as number | '')}
                >
                  <MenuItem value="">없음</MenuItem>
                  {flattenedPages.map((page) => (
                    <MenuItem
                      key={page.id}
                      value={page.id}
                      disabled={page.id === Number(urlId) || page.pageType !== pageType}
                    >
                      {page.displayTitle}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            {!isNewPage ? (
              <YjsEditorNew
                key={`yjs-editor-${urlId}`}
                pageId={parseInt(urlId!)}
                currentUser={{
                  staffId: currentUser.staffId,
                  userName: currentUser.userName,
                  loginId: currentUser.loginId
                }}
                defaultValue={content}
                onChange={(newContent) => {
                  // contentRef만 업데이트하고 state는 업데이트하지 않음
                  // 이렇게 해야 리렌더링으로 인한 포커스 손실이 없음
                  contentRef.current = newContent;
                  // 저장 시 contentRef.current를 사용하므로 문제 없음
                }}
                readOnly={false}
              />
            ) : (
              <BasicEditor
                key={`basic-editor-new`}
                defaultValue={content}
                onChange={(newContent) => {
                  // contentRef만 업데이트하고 state는 업데이트하지 않음
                  // 이렇게 해야 리렌더링으로 인한 포커스 손실이 없음
                  contentRef.current = newContent;
                  // 저장 시 contentRef.current를 사용하므로 문제 없음
                }}
                readOnly={false}
              />
            )}
          </Box>

          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleCancel}
              startIcon={<CancelIcon />}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={saving}
              startIcon={<SaveIcon />}
            >
              저장
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default EditPage; 