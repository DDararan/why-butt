import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  ButtonGroup,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { orange } from '@mui/material/colors';
import YjsEditorNew from '../components/YjsEditorNew';
import { WikiPage } from '../types/wiki';
import { wikiService } from '../services/wikiService';
import { usePageTree } from '../contexts/PageTreeContext';

const pageTypes = [
  { value: 'DOCUMENT', label: '문서' },
  { value: 'REPORT', label: '보고서' },
  { value: 'GUIDE', label: '가이드' },
  { value: 'POLICY', label: '정책' },
  { value: 'MEETING', label: '회의록' },
  { value: 'PROJECT', label: '프로젝트' },
  { value: 'OTHER', label: '기타' },
];

interface User {
  id: string;
  username: string;
  name?: string;
}

const WikiCollaborativeEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshPageTree } = usePageTree();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pageType, setPageType] = useState('DOCUMENT');
  const [parentId, setParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(400);
  const isResizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isEditMode = !!id;

  useEffect(() => {
    // 현재 사용자 정보 가져오기
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const user = await response.json();
          setCurrentUser({
            id: user.staffId || user.id,
            username: user.loginId || user.username,
            name: user.userName || user.name
          });
        }
      } catch (error) {
        console.error('사용자 정보 확인 오류:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (isEditMode) {
      fetchPage();
    } else if (location.state) {
      // 새 페이지 생성 시 부모 ID와 페이지 타입 설정
      if (location.state.parentId) {
        setParentId(location.state.parentId);
      }
      if (location.state.pageType) {
        setPageType(location.state.pageType);
      }
    }
  }, [id, isEditMode, location.state]);

  const fetchPage = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const page = await wikiService.getPageById(parseInt(id));
      setTitle(page.title);
      setContent(page.content);
      setPageType(page.pageType || 'DOCUMENT');
      setParentId(page.parentId || null);
    } catch (error) {
      setError('페이지를 불러오는데 실패했습니다.');
      console.error('페이지 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('[저장] 저장 버튼 클릭');
    console.log('[저장] 현재 content:', content);
    console.log('[저장] content 길이:', content.length);
    console.log('[저장] content 첫 100자:', content.substring(0, 100));
    
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    try {
      setSaveLoading(true);
      setError(null);
      
      const pageData = {
        title: title.trim(),
        content,
        pageType,
        parentId: parentId === null ? undefined : parentId,
      };
      
      console.log('[저장] 전송할 pageData:', pageData);

      let savedPage: WikiPage;
      
      if (isEditMode) {
        savedPage = await wikiService.updatePageById(parseInt(id!), pageData);
      } else {
        savedPage = await wikiService.createPage(pageData);
      }

      refreshPageTree();
      navigate(`/wiki/${savedPage.id}`);
    } catch (error) {
      setError('페이지 저장에 실패했습니다.');
      console.error('페이지 저장 오류:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      navigate(`/wiki/${id}`);
    } else {
      navigate('/');
    }
  };

  const handleContentChange = (value: string) => {
    console.log('[handleContentChange] 호출됨');
    console.log('[handleContentChange] 받은 value:', value.substring(0, 100) + '...');
    console.log('[handleContentChange] value 길이:', value.length);
    setContent(value);
  };

  // 리사이징 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    
    // 최소/최대 너비 제한
    if (newWidth >= 300 && newWidth <= 1200) {
      setLeftPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // 컴포넌트 언마운트 시 이벤트 리스너 정리
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" height={60} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box>
        <Alert severity="warning">
          협업 편집을 사용하려면 로그인이 필요합니다.
        </Alert>
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'row', // 가로 방향으로 변경
        gap: 0,
        p: 1,
        position: 'relative'
      }}
    >
      {/* 왼쪽: 입력 폼 영역 */}
      <Paper 
        elevation={2} 
        sx={{ 
          width: `${leftPanelWidth}px`,
          display: 'flex',
          flexDirection: 'column',
          p: 2,
          overflow: 'auto',
          flexShrink: 0
        }}
      >
        <Typography variant="h5" component="h1" sx={{ mb: 2, color: orange[800], fontWeight: 'bold' }}>
          {isEditMode ? '페이지 수정' : '새 페이지 작성'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          <TextField
            label="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: orange[300],
                },
                '&.Mui-focused fieldset': {
                  borderColor: orange[500],
                },
              },
            }}
          />
          
          <FormControl fullWidth>
            <InputLabel>페이지 유형</InputLabel>
            <Select
              value={pageType}
              onChange={(e) => setPageType(e.target.value)}
              label="페이지 유형"
            >
              {pageTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 'auto' }}>
          <Button
            onClick={handleSave}
            disabled={saveLoading || !title.trim()}
            startIcon={<SaveIcon />}
            variant="contained"
            fullWidth
            sx={{
              backgroundColor: orange[600],
              '&:hover': {
                backgroundColor: orange[700],
              },
            }}
          >
            {saveLoading ? '저장 중...' : '저장'}
          </Button>
          <Button
            onClick={handleCancel}
            startIcon={<CancelIcon />}
            variant="outlined"
            fullWidth
            sx={{
              borderColor: 'grey.500',
              color: 'grey.700',
              '&:hover': {
                borderColor: 'grey.600',
                backgroundColor: 'grey.50',
              },
            }}
          >
            취소
          </Button>
        </Box>
      </Paper>

      {/* 리사이저 핸들 */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          width: '8px',
          height: '100%',
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: orange[200],
          },
          '&:active': {
            backgroundColor: orange[300],
          },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            width: '2px',
            height: '40px',
            backgroundColor: 'grey.400',
            borderRadius: '1px',
          }
        }}
      />

      {/* 오른쪽: 에디터 영역 */}
      <Paper elevation={1} sx={{ 
        flex: 1, 
        overflow: 'hidden', 
        ml: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <YjsEditorNew
            pageId={isEditMode ? parseInt(id!) : 0}
            currentUser={{
              staffId: currentUser.id,
              userName: currentUser.name || currentUser.username,
              loginId: currentUser.username
            }}
            defaultValue={content}
            onChange={handleContentChange}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default WikiCollaborativeEditPage;