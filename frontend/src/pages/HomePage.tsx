import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  List,
  ListItem,
  ListItemText,
  Container,
} from '@mui/material';
import { orange } from '@mui/material/colors';
import AddIcon from '@mui/icons-material/Add';
import { WikiPageSummary } from '../types/wiki';
import { wikiService } from '../services/wikiService';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [recentWeekPages, setRecentWeekPages] = useState<WikiPageSummary[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 최근 일주일 동안 작성된 글
        const weekPages = await wikiService.getRecentWeekPages();
        setRecentWeekPages(weekPages);
      } catch (error) {
        console.error('페이지를 불러오는데 실패했습니다:', error);
      }
    };

    fetchData();
  }, []);



  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ color: orange[800] }}>
          홈
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/wiki/new')}
          sx={{
            bgcolor: orange[800],
            '&:hover': {
              bgcolor: orange[900],
            },
          }}
        >
          새 글 작성
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ flex: '1 1 600px', maxWidth: 800 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" sx={{ color: orange[800], mb: 2 }}>
                최근 일주일 동안 작성된 글 ({recentWeekPages.length}개)
              </Typography>
              {recentWeekPages.length > 0 ? (
                <List>
                  {recentWeekPages.map((page) => (
                    <ListItem
                      key={page.id}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: orange[50],
                        },
                        borderBottom: '1px solid #f0f0f0',
                        flexDirection: 'column',
                        alignItems: 'flex-start'
                      }}
                      onClick={() => navigate(`/wiki/${encodeURIComponent(page.title)}`)}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: orange[800] }}>
                            {page.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            작성일: {new Date(page.updatedAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  최근 일주일 동안 작성된 글이 없습니다.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
};

export default HomePage; 