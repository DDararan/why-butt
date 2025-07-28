import React, { useState, useEffect } from 'react';
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
    setContent(value);
  };

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={2} sx={{ mb: 2, p: 2 }}>
        <Typography variant="h5" component="h1" sx={{ mb: 2, color: orange[800], fontWeight: 'bold' }}>
          {isEditMode ? '페이지 수정' : '새 페이지 작성'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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
          
          <FormControl sx={{ minWidth: 200 }}>
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <ButtonGroup variant="contained">
            <Button
              onClick={handleCancel}
              startIcon={<CancelIcon />}
              sx={{
                backgroundColor: 'grey.500',
                '&:hover': {
                  backgroundColor: 'grey.600',
                },
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveLoading || !title.trim()}
              startIcon={<SaveIcon />}
              sx={{
                backgroundColor: orange[600],
                '&:hover': {
                  backgroundColor: orange[700],
                },
              }}
            >
              {saveLoading ? '저장 중...' : '저장'}
            </Button>
          </ButtonGroup>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ flex: 1, overflow: 'hidden' }}>
        <YjsEditorNew
          pageId={isEditMode ? parseInt(id!) : 0}
          currentUser={{
            staffId: currentUser.id,
            userName: currentUser.name || currentUser.username,
            loginId: currentUser.username
          }}
          defaultValue={content}
          onChange={handleContentChange}
          readOnly={false}
        />
      </Paper>
    </Box>
  );
};

export default WikiCollaborativeEditPage;