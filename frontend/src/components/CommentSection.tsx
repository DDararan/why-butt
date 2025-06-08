import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { MoreVert, Edit, Delete } from '@mui/icons-material';
import { wikiService } from '../services/wikiService';

// 새로운 댓글 타입 정의
interface WikiPageComment {
  commentId: number;
  wikiPageId: number;
  content: string;
  staffId: string;
  updatedAt: string;
}

interface CommentListResponse {
  comments: WikiPageComment[];
  totalCount: number;
}

interface CreateCommentRequest {
  content: string;
}

interface UpdateCommentRequest {
  content: string;
}

interface CommentSectionProps {
  pageId: number;
  currentUser?: {
    staffId: string;
    userName: string;
  };
}

/**
 * 댓글 섹션 컴포넌트
 * 단일 책임 원칙에 따라 댓글 관련 기능만을 담당합니다.
 * 댓글 목록 표시, 새 댓글 작성, 댓글 수정/삭제 기능을 제공합니다.
 */
const CommentSection: React.FC<CommentSectionProps> = ({ pageId, currentUser }) => {
  const [comments, setComments] = useState<WikiPageComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 메뉴 관련 상태
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<number | null>(null);
  
  // 수정 다이얼로그 상태
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);

  // 댓글 목록 로드
  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await wikiService.get<CommentListResponse>(`/api/wiki-pages/${pageId}/comments`);
      setComments(response.comments);
    } catch (err: any) {
      console.error('댓글 로드 실패:', err);
      setError('댓글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 댓글 생성
  const handleCreateComment = async () => {
    if (!newComment.trim()) {
      setError('댓글 내용을 입력해주세요.');
      return;
    }

    if (!currentUser) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const request: CreateCommentRequest = {
        content: newComment.trim()
      };
      
      await wikiService.post(`/api/wiki-pages/${pageId}/comments`, request);
      setNewComment('');
      await loadComments(); // 댓글 목록 새로고침
    } catch (err: any) {
      console.error('댓글 생성 실패:', err);
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다.');
      } else {
        setError('댓글 작성에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 댓글 수정
  const handleUpdateComment = async () => {
    if (!editContent.trim()) {
      setError('댓글 내용을 입력해주세요.');
      return;
    }

    if (!editingCommentId) return;

    try {
      setLoading(true);
      setError(null);
      
      const request: UpdateCommentRequest = {
        content: editContent.trim()
      };
      
      await wikiService.put(`/api/wiki-pages/${pageId}/comments/${editingCommentId}`, request);
      setEditDialogOpen(false);
      setEditContent('');
      setEditingCommentId(null);
      await loadComments(); // 댓글 목록 새로고침
    } catch (err: any) {
      console.error('댓글 수정 실패:', err);
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다.');
      } else if (err.response?.status === 400) {
        setError('댓글을 수정할 권한이 없습니다.');
      } else {
        setError('댓글 수정에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await wikiService.delete(`/api/wiki-pages/${pageId}/comments/${commentId}`);
      await loadComments(); // 댓글 목록 새로고침
    } catch (err: any) {
      console.error('댓글 삭제 실패:', err);
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다.');
      } else if (err.response?.status === 400) {
        setError('댓글을 삭제할 권한이 없습니다.');
      } else {
        setError('댓글 삭제에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 메뉴 처리
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, commentId: number) => {
    setMenuAnchor(event.currentTarget);
    setSelectedCommentId(commentId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedCommentId(null);
  };

  const handleEditClick = () => {
    const comment = comments.find(c => c.commentId === selectedCommentId);
    if (comment) {
      setEditContent(comment.content);
      setEditingCommentId(comment.commentId);
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedCommentId) {
      handleDeleteComment(selectedCommentId);
    }
    handleMenuClose();
  };

  // 컴포넌트 마운트 시 댓글 로드
  useEffect(() => {
    loadComments();
  }, [pageId]);

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        댓글 ({comments.length})
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 댓글 작성 폼 */}
      {currentUser ? (
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="댓글을 작성해주세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleCreateComment}
            disabled={loading || !newComment.trim()}
          >
            댓글 작성
          </Button>
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          댓글을 작성하려면 로그인이 필요합니다.
        </Alert>
      )}

      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          아직 댓글이 없습니다.
        </Typography>
      ) : (
        comments.map((comment, index) => (
          <Paper key={comment.commentId} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="primary">
                  {comment.staffId}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(comment.updatedAt)}
                </Typography>
              </Box>
              
              {/* 본인이 작성한 댓글인 경우에만 메뉴 표시 */}
              {currentUser && currentUser.staffId === comment.staffId && (
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuClick(e, comment.commentId)}
                >
                  <MoreVert />
                </IconButton>
              )}
            </Box>
            
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {comment.content}
            </Typography>
            
            {index < comments.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Paper>
        ))
      )}

      {/* 댓글 메뉴 */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>
          <Edit sx={{ mr: 1 }} />
          수정
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <Delete sx={{ mr: 1 }} />
          삭제
        </MenuItem>
      </Menu>

      {/* 댓글 수정 다이얼로그 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>댓글 수정</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleUpdateComment} 
            variant="contained"
            disabled={loading || !editContent.trim()}
          >
            수정
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommentSection; 