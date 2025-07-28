import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';
import { wikiService } from '../services/wikiService';
import BasicEditor from '../components/BasicEditor';

const HistoryComparePage: React.FC = () => {
  const { id, seqNbr } = useParams<{ id: string; seqNbr: string }>();
  const navigate = useNavigate();
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const page = await wikiService.getPageById(parseInt(id!));
        setCurrent(page);
        const hist = page.history?.find((h: any) => h.seqNbr === Number(seqNbr));
        setHistory(hist);
      } catch (e) {
        setError('데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, seqNbr]);

  const handleRestore = async () => {
    if (!history) return;
    try {
      setRestoring(true);
      await wikiService.updatePageById(parseInt(id!), {
        title: history.title,
        content: history.content,
        parentId: current.parentId,
        pageType: current.pageType,
      });
      navigate(`/wiki/${id}`);
    } catch (e) {
      setError('복원에 실패했습니다.');
    } finally {
      setRestoring(false);
    }
  };

  // 간단한 diff 표시 (줄 단위)
  const renderDiff = () => {
    if (!current || !history) return null;
    const currentLines = current.content.split('\n');
    const historyLines = history.content.split('\n');
    const maxLen = Math.max(currentLines.length, historyLines.length);
    return (
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1">현재 버전</Typography>
          <Paper variant="outlined" sx={{ p: 2, minHeight: 200 }}>
            <BasicEditor defaultValue={current.content} onChange={() => {}} readOnly />
          </Paper>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1">선택한 이전 버전</Typography>
          <Paper variant="outlined" sx={{ p: 2, minHeight: 200 }}>
            <BasicEditor defaultValue={history.content} onChange={() => {}} readOnly />
          </Paper>
        </Box>
      </Box>
    );
  };

  if (loading) return <Box>로딩 중...</Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!current || !history) return <Box>데이터 없음</Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>페이지 버전 비교</Typography>
      {renderDiff()}
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="contained" color="primary" onClick={handleRestore} disabled={restoring}>
          {restoring ? '복원 중...' : '이전 버전으로 복원'}
        </Button>
        <Button variant="outlined" onClick={() => navigate(-1)}>뒤로가기</Button>
      </Box>
    </Box>
  );
};

export default HistoryComparePage; 