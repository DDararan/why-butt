import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Paper,
  Button,
  Box,
  Skeleton,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
  Grid,
  Menu,
  MenuItem,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { orange } from '@mui/material/colors';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import AdvancedMarkdown from '../components/AdvancedMarkdown';
import { WikiPage as WikiPageType } from '../types/wiki';
import { wikiService } from '../services/wikiService';
import CommentSection from '../components/CommentSection';
import FileAttachmentSection from '../components/FileAttachmentSection';
import { usePageTree } from '../contexts/PageTreeContext';
import '../styles/markdown.css';

interface User {
  staffId: string;
  loginId: string;
  userName: string;
  email: string;
}

const WikiPage: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const { refreshPageTree } = usePageTree();
  const [page, setPage] = useState<WikiPageType | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      if (!title) return;
      
      try {
        setLoading(true);
        setError(null);
        const fetchedPage = await wikiService.getPage(title);
        setPage(fetchedPage);
      } catch (error) {
        if ((error as any)?.response?.status === 404) {
          setError('페이지를 찾을 수 없습니다.');
        } else {
          setError('페이지를 불러오는데 실패했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [title]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('사용자 정보 확인 오류:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  const handleEdit = () => {
    if (title) {
      navigate(`/wiki/${encodeURIComponent(title)}/edit`);
    }
  };

  const handleCreateChild = () => {
    if (title) {
      navigate(`/wiki/new`, { state: { parentTitle: title } });
    }
    setAnchorEl(null);
  };

  const handleCreateSibling = () => {
    if (page?.parentId) {
      // 부모 페이지의 제목을 찾아서 전달해야 하지만, 현재는 parentId만 있음
      // 대신 parentId를 사용해서 새 페이지 생성 시 같은 부모로 설정
      navigate(`/wiki/new`, { state: { parentId: page.parentId } });
    } else {
      // 최상위 페이지의 경우 새로운 최상위 페이지 생성
      navigate(`/wiki/new`);
    }
    setAnchorEl(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!title) return;

    try {
      setIsDeleting(true);
      await wikiService.deletePage(title);
      
      // 페이지 삭제 후 왼쪽 메뉴 새로고침
      refreshPageTree();
      
      navigate('/'); // 홈페이지로 리다이렉트
    } catch (error) {
      console.error('페이지 삭제 실패:', error);
      alert('페이지 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getContentToDisplay = () => {
    if (selectedHistoryVersion !== null && page?.history) {
      const historyItem = page.history.find(h => h.seqNbr === selectedHistoryVersion);
      return historyItem?.content || page.content;
    }
    return page?.content || '';
  };

  const getTitleToDisplay = () => {
    if (selectedHistoryVersion !== null && page?.history) {
      const historyItem = page.history.find(h => h.seqNbr === selectedHistoryVersion);
      return historyItem?.title || page.title;
    }
    return page?.title || '';
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" height={60} />
        <Skeleton variant="text" height={30} />
        <Skeleton variant="rectangular" height={200} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert 
          severity="info" 
          action={
            <Button color="inherit" size="small" onClick={handleCreateChild}>
              페이지 생성
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!page) return null;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              color: orange[900],
              fontWeight: 'bold',
            }}
          >
            {getTitleToDisplay()}
            {selectedHistoryVersion !== null && (
              <Chip 
                label={`버전 ${selectedHistoryVersion}`} 
                size="small" 
                sx={{ ml: 2, bgcolor: orange[100], color: orange[800] }}
              />
            )}
          </Typography>
          {selectedHistoryVersion !== null && (
            <Button
              size="small"
              onClick={() => setSelectedHistoryVersion(null)}
              sx={{ mt: 1, color: orange[700] }}
            >
              현재 버전으로 돌아가기
            </Button>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* 새 페이지 작성 드롭다운 */}
          <ButtonGroup variant="contained" sx={{ height: 'fit-content' }}>
            <Button
              startIcon={<AddIcon />}
              onClick={handleCreateChild}
              sx={{
                backgroundColor: orange[600],
                '&:hover': {
                  backgroundColor: orange[700],
                },
              }}
            >
              하위 페이지
            </Button>
            <Button
              size="small"
              onClick={handleMenuOpen}
              sx={{
                backgroundColor: orange[600],
                '&:hover': {
                  backgroundColor: orange[700],
                },
                minWidth: 'auto',
                px: 1,
              }}
            >
              <ArrowDropDownIcon />
            </Button>
          </ButtonGroup>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            sx={{
              '& .MuiPaper-root': {
                border: `1px solid ${orange[200]}`,
              },
            }}
          >
            <MenuItem onClick={handleCreateChild}>
              <SubdirectoryArrowRightIcon sx={{ mr: 1, color: orange[600] }} />
              하위 페이지 작성
            </MenuItem>
            <MenuItem onClick={handleCreateSibling}>
              <FolderIcon sx={{ mr: 1, color: orange[600] }} />
              {page.parentId ? '동일 레벨 페이지 작성' : '새 최상위 페이지 작성'}
            </MenuItem>
          </Menu>

          {/* 페이지 수정 버튼 */}
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            sx={{
              backgroundColor: orange[700],
              '&:hover': {
                backgroundColor: orange[800],
              },
            }}
          >
            페이지 수정
          </Button>

          {/* 페이지 삭제 버튼 */}
          <Button
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
            sx={{
              color: 'error.main',
              borderColor: 'error.main',
              '&:hover': {
                borderColor: 'error.dark',
                backgroundColor: 'error.light',
                color: 'error.dark',
              },
            }}
          >
            페이지 삭제
          </Button>
        </Box>
      </Box>

      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', mb: 2 }}
      >
        마지막 수정: {formatDate(page.updatedAt)}
        {page.depth > 0 && (
          <Chip 
            label={`레벨 ${page.depth}`} 
            size="small" 
            sx={{ ml: 1, bgcolor: orange[50], color: orange[700] }}
          />
        )}
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* 페이지 내용 */}
      <Paper
        elevation={0}
        className="markdown-preview"
        sx={{
          p: 3,
          backgroundColor: 'white',
          border: `1px solid ${orange[200]}`,
          '& img': {
            maxWidth: '100%',
            height: 'auto',
          },
        }}
      >
                    <AdvancedMarkdown>{getContentToDisplay()}</AdvancedMarkdown>
      </Paper>

      {/* 파일 첨부 섹션 */}
      {selectedHistoryVersion === null && (
        <FileAttachmentSection pageTitle={page.title} />
      )}

      {/* 댓글 섹션 */}
      {selectedHistoryVersion === null && (
        <CommentSection pageId={page.id} currentUser={currentUser || undefined} />
      )}

      {/* 페이지 히스토리 */}
      {page.history && page.history.length > 0 && (
        <Accordion sx={{ mt: 3, mb: 3 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              bgcolor: orange[50],
              '&:hover': {
                bgcolor: orange[100],
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HistoryIcon sx={{ mr: 1, color: orange[700] }} />
              <Typography variant="h6" sx={{ color: orange[800] }}>
                페이지 히스토리 ({page.history.length}개 버전)
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {page.history.map((historyItem, index) => (
                <ListItem
                  key={`${historyItem.id}-${historyItem.seqNbr}`}
                  sx={{
                    border: `1px solid ${orange[200]}`,
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: selectedHistoryVersion === historyItem.seqNbr ? orange[50] : 'white',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: orange[50],
                    },
                  }}
                  onClick={() => setSelectedHistoryVersion(
                    selectedHistoryVersion === historyItem.seqNbr ? null : historyItem.seqNbr
                  )}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={2}>
                      <Chip
                        label={`v${historyItem.seqNbr}`}
                        size="small"
                        color={index === 0 ? 'primary' : 'default'}
                        sx={{
                          bgcolor: index === 0 ? orange[600] : orange[200],
                          color: index === 0 ? 'white' : orange[800],
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <ListItemText
                        primary={historyItem.title}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                            {formatDate(historyItem.updatedAt)}
                          </Box>
                        }
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {index === 0 ? '현재 버전' : `${index}번째 이전 버전`}
                      </Typography>
                    </Grid>
                  </Grid>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title" sx={{ color: 'error.main' }}>
          페이지 삭제 확인
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            정말로 "<strong>{page.title}</strong>" 페이지를 삭제하시겠습니까?
            <br />
            <br />
            ⚠️ 이 작업은 되돌릴 수 없으며, 다음 항목들이 함께 삭제됩니다:
            <br />
            • 페이지 내용 및 모든 히스토리
            <br />
            • 관련된 모든 댓글
            <br />
            • 첨부된 모든 파일
            <br />
            • 모든 하위 페이지 (있는 경우)
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} sx={{ color: 'text.secondary' }}>
            취소
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            sx={{
              '&:hover': {
                backgroundColor: 'error.dark',
              },
            }}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WikiPage; 