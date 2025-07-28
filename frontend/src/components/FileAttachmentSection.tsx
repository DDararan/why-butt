import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  ExpandMore,
  AttachFile,
  CloudUpload,
  Download,
  Delete,
} from '@mui/icons-material';
import { FileAttachment, FileUploadRequest } from '../types/file';
import { fileService } from '../services/fileService';

interface FileAttachmentSectionProps {
  pageId: number;
}

/**
 * 파일 첨부 섹션 컴포넌트
 * 단일 책임 원칙에 따라 파일 관련 기능만을 담당합니다.
 * 파일 업로드, 다운로드, 삭제 기능을 제공합니다.
 */
const FileAttachmentSection: React.FC<FileAttachmentSectionProps> = ({ pageId }) => {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 파일 목록을 불러옵니다.
   */
  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedFiles = await fileService.getFilesByPageId(pageId);
      setFiles(fetchedFiles);
      setError(null);
    } catch (err) {
      setError('파일 목록을 불러오는데 실패했습니다.');
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  /**
   * 파일을 업로드합니다.
   */
  const handleFileUpload = async (selectedFile: File) => {
    setUploading(true);
    try {
      await fileService.uploadFileByPageId(pageId, selectedFile, customFileName.trim() || undefined);
      setError(null);
      await loadFiles(); // 파일 목록 새로고침
      
      // 파일 입력 및 파일명 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setCustomFileName('');
    } catch (err) {
      setError('파일 업로드에 실패했습니다.');
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  /**
   * 파일 선택 처리
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  /**
   * 파일 다운로드
   */
  const handleFileDownload = async (file: FileAttachment) => {
    try {
      await fileService.downloadFile(file.storedFileName, file.originalFileName);
    } catch (err) {
      setError('파일 다운로드에 실패했습니다.');
      console.error('Error downloading file:', err);
    }
  };

  /**
   * 파일 삭제
   */
  const handleFileDelete = async (fileId: number) => {
    if (!window.confirm('정말로 이 파일을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await fileService.deleteFile(fileId);
      setError(null);
      await loadFiles(); // 파일 목록 새로고침
    } catch (err) {
      setError('파일 삭제에 실패했습니다.');
      console.error('Error deleting file:', err);
    }
  };

  /**
   * 파일 타입에 따른 아이콘 반환
   */
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return '🖼️';
    } else if (contentType.includes('pdf')) {
      return '📄';
    } else if (contentType.includes('word') || contentType.includes('document')) {
      return '📝';
    } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
      return '📊';
    } else if (contentType.includes('zip') || contentType.includes('rar')) {
      return '📦';
    } else {
      return '📎';
    }
  };

  /**
   * 날짜를 한국어 형식으로 포맷팅
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  useEffect(() => {
    loadFiles();
  }, [pageId, loadFiles]);

  return (
    <Box sx={{ mt: 2 }}>
      <Accordion sx={{ border: `1px solid #FF8C00`, borderRadius: 1 }}>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            backgroundColor: '#FFF8DC',
            '&:hover': {
              backgroundColor: '#FFE4B5',
            },
            '& .MuiAccordionSummary-expandIconWrapper': {
              color: '#FF8C00',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AttachFile sx={{ mr: 1, color: '#FF8C00' }} />
            <Typography variant="h6" sx={{ color: '#FF8C00', fontWeight: 'bold' }}>
              첨부 파일 ({files.length})
            </Typography>
          </Box>
        </AccordionSummary>
        
        <AccordionDetails sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* 파일 업로드 폼 */}
            <Card sx={{ mb: 3, borderLeft: '4px solid #FF8C00' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: '#FF8C00' }}>
                  파일 업로드
                </Typography>
                
                <TextField
                  fullWidth
                  placeholder="업로드할 파일명 (선택사항, 비워두면 원본 파일명 사용)"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="file-upload-input"
                  />
                  <label htmlFor="file-upload-input">
                    <Button
                      component="span"
                      variant="contained"
                      startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
                      disabled={uploading}
                      sx={{
                        backgroundColor: '#FF8C00',
                        '&:hover': { backgroundColor: '#FF7F00' }
                      }}
                    >
                      {uploading ? '업로드 중...' : '파일 선택'}
                    </Button>
                  </label>
                  
                  <Typography variant="body2" color="textSecondary">
                    최대 1GB까지 업로드 가능합니다.
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* 파일 목록 */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                {files.length > 0 ? (
                  <List>
                    {files.map((file) => (
                      <ListItem
                        key={file.id}
                        sx={{
                          border: `1px solid #FFB347`,
                          borderRadius: 1,
                          mb: 1,
                          backgroundColor: 'white',
                          '&:hover': {
                            backgroundColor: '#FFF8DC',
                          },
                        }}
                      >
                        <Box sx={{ mr: 2, fontSize: '1.5rem' }}>
                          {getFileIcon(file.contentType)}
                        </Box>
                        
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold' }}>
                                {file.originalFileName}
                              </Typography>
                              <Chip
                                label={fileService.formatFileSize(file.fileSize)}
                                size="small"
                                sx={{ backgroundColor: '#FFE4B5', color: '#FF8C00' }}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" color="textSecondary" component="span">
                              업로드: {file.uploadedBy} • {formatDate(file.uploadedAt)}
                            </Typography>
                          }
                        />
                        
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleFileDownload(file)}
                            sx={{ color: '#FF8C00', mr: 1 }}
                          >
                            <Download />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleFileDelete(file.id)}
                            sx={{ color: '#FF6347' }}
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                    첨부된 파일이 없습니다. 첫 번째 파일을 업로드해보세요!
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default FileAttachmentSection; 