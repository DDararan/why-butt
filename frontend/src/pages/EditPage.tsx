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
} from '@mui/material';
import { orange } from '@mui/material/colors';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { wikiService } from '../services/wikiService';
import { WikiPageSummary } from '../types/wiki';
import { usePageTree } from '../contexts/PageTreeContext';
import TipTapEditor from '../components/TipTapEditor';
import '../styles/markdown.css';

interface LocationState {
  isNew?: boolean;
  parentTitle?: string;
  parentId?: number;
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

const EditPage: React.FC = () => {
  const { title: urlTitle } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const isNewPage = !urlTitle || location.pathname === '/wiki/new';
  const { refreshPageTree } = usePageTree();
  
  // 제목 입력 필드에 대한 ref 추가
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState(urlTitle ? decodeURIComponent(urlTitle) : '');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);
  const [pageType, setPageType] = useState<string>('MENU');
  const [availablePages, setAvailablePages] = useState<WikiPageSummary[]>([]);
  const [parentPageType, setParentPageType] = useState<string | null>(null);

  // 평면화된 페이지 리스트 생성
  const flattenedPages = flattenPages(availablePages);

  useEffect(() => {
    const fetchPage = async () => {
      if (isNewPage) {
        setContent('# 새 페이지\n\n여기에 내용을 작성하세요...');
        setLoading(false);
        
        // 상위 페이지가 지정된 경우 처리
        if (state?.parentTitle) {
          try {
            const parentPage = await wikiService.getPage(state.parentTitle);
            setParentId(parentPage.id);
            setPageType(parentPage.pageType);
            setParentPageType(parentPage.pageType);
          } catch (error) {
            console.error('상위 페이지 정보를 불러오는데 실패했습니다:', error);
          }
        } else if (state?.parentId) {
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
        const page = await wikiService.getPage(urlTitle!);
        setContent(page.content);
        setParentId(page.parentId || null);
        setPageType(page.pageType || 'MENU');
        
        // 부모 페이지가 있는 경우 부모의 페이지 타입 설정
        if (page.parentId) {
          try {
            const parentPage = await wikiService.getPage(page.parent?.title || '');
            setParentPageType(parentPage.pageType);
          } catch (error) {
            console.error('부모 페이지 정보를 불러오는데 실패했습니다:', error);
          }
        }
      } catch (error) {
        setError('페이지를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    const fetchAvailablePages = async () => {
      try {
        // 모든 타입의 페이지를 가져와서 상위 페이지 선택 시 사용
        const menuPages = await wikiService.getPagesByType('MENU');
        const dailyPages = await wikiService.getPagesByType('DAILY');
        const etcPages = await wikiService.getPagesByType('ETC');
        const allPages = [...menuPages, ...dailyPages, ...etcPages];
        setAvailablePages(allPages);
      } catch (error) {
        console.error('페이지 목록을 불러오는데 실패했습니다:', error);
      }
    };

    fetchPage();
    fetchAvailablePages();
  }, [urlTitle, isNewPage, state]);

  // 컴포넌트 마운트 후 제목 필드에 포커스 설정
  useEffect(() => {
    // 로딩이 완료된 후에 포커스 설정
    if (!loading && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [loading]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      if (!title.trim()) {
        setError('제목을 입력해주세요.');
        return;
      }

      console.log('저장하려는 내용:', { title, content, parentId, pageType });

      if (isNewPage) {
        const result = await wikiService.createPage({
          title: title.trim(),
          content,
          parentId: parentId || undefined,
          pageType: pageType
        });
        // 페이지 트리 새로고침
        refreshPageTree();
        navigate(`/wiki/${encodeURIComponent(result.title)}`);
      } else {
        const result = await wikiService.updatePage(urlTitle!, {
          title: title.trim(),
          content,
          parentId: parentId || undefined,
          pageType: pageType
        });
        // 페이지 트리 새로고침
        refreshPageTree();
        navigate(`/wiki/${encodeURIComponent(result.title)}`);
      }
    } catch (error) {
      console.error('페이지 저장 오류:', error);
      setError(`페이지 ${isNewPage ? '작성' : '수정'}에 실패했습니다.`);
    } finally {
      setSaving(false);
    }
  }, [title, content, parentId, pageType, isNewPage, urlTitle, refreshPageTree, navigate]);

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
      const hasChanges = content.trim() !== '' && content !== '# 새 페이지\n\n여기에 내용을 작성하세요...';
      const titleChanged = isNewPage ? title.trim() !== '' : title !== (urlTitle ? decodeURIComponent(urlTitle) : '');
      
      if (hasChanges || titleChanged) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [content, title, isNewPage, urlTitle]);

  const handleCancel = () => {
    // 내용이 변경되었는지 확인
    const hasChanges = content.trim() !== '' && content !== '# 새 페이지\n\n여기에 내용을 작성하세요...';
    const titleChanged = isNewPage ? title.trim() !== '' : title !== (urlTitle ? decodeURIComponent(urlTitle) : '');
    
    if (hasChanges || titleChanged) {
      const confirmCancel = window.confirm('작성 중인 내용이 있습니다. 정말로 취소하시겠습니까?\n저장하지 않은 내용은 모두 사라집니다.');
      if (!confirmCancel) {
        return;
      }
    }
    
    if (isNewPage) {
      // 새 페이지 작성 중인 경우
      if (state?.parentTitle) {
        // 부모 페이지가 있으면 해당 페이지로 이동
        navigate(`/wiki/${encodeURIComponent(state.parentTitle)}`);
      } else {
        // 부모 페이지가 없으면 홈으로 이동
        navigate('/');
      }
    } else {
      // 기존 페이지 수정 중인 경우 해당 페이지로 이동
      navigate(`/wiki/${encodeURIComponent(urlTitle!)}`);
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
      if (isNewPage) {
        setPageType('MENU');
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
                  <MenuItem value="MENU">메뉴</MenuItem>
                  <MenuItem value="DAILY">데일리</MenuItem>
                  <MenuItem value="ETC">기타</MenuItem>
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
                      disabled={page.id === Number(urlTitle) || page.pageType !== pageType}
                    >
                      {page.displayTitle}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <TipTapEditor
              defaultValue={content}
              onChange={setContent}
            />
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