import React, { useState, useCallback, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Autocomplete, TextField, InputAdornment, ListItem, ListItemText, Button, Menu, MenuItem, Chip } from '@mui/material';
import { Search as SearchIcon, AccountCircle, ExitToApp } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import PageTree from './PageTree';
import { wikiService } from '../services/wikiService';
import { WikiPageSearchResult } from '../types/wiki';

interface User {
  staffId: string;
  loginId: string;
  userName: string;
  email: string;
  token: string;
}

interface LayoutProps {
  children: React.ReactNode;
  currentUser?: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOptions, setSearchOptions] = useState<WikiPageSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  
  const currentPath = location.pathname;
  const currentTitle = currentPath.startsWith('/wiki/') 
    ? decodeURIComponent(currentPath.replace('/wiki/', ''))
    : undefined;

  const handleNavigate = (title: string) => {
    navigate(`/wiki/${encodeURIComponent(title)}`);
  };

  // 디바운싱된 검색 기능
  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchOptions([]);
      setIsSearchLoading(false);
      return;
    }

    setIsSearchLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await wikiService.searchPagesInTitleAndContent(searchInput.trim());
        setSearchOptions(results);
      } catch (error) {
        console.error('검색 중 오류 발생:', error);
        setSearchOptions([]);
      } finally {
        setIsSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const handleSearchInputChange = useCallback((event: any, value: string) => {
    setSearchInput(value);
  }, []);

  const handleSearchSelection = useCallback((event: any, value: string | WikiPageSearchResult | null) => {
    if (value && typeof value === 'object') {
      // 검색 결과에서 선택한 경우
      navigate(`/wiki/${encodeURIComponent(value.title)}`);
      setSearchInput(''); // 검색창 초기화
      setSearchOptions([]); // 검색 결과 초기화
    } else if (value && typeof value === 'string' && searchOptions.length === 0) {
      // 검색 결과가 없고 직접 입력한 문자열인 경우만 페이지 이동
      navigate(`/wiki/${encodeURIComponent(value)}`);
      setSearchInput(''); // 검색창 초기화
    }
  }, [navigate, searchOptions]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      // 검색 결과가 있고 로딩 중이 아닐 때만 첫 번째 결과로 이동
      if (searchOptions.length > 0 && !isSearchLoading) {
        event.preventDefault();
        event.stopPropagation();
        navigate(`/wiki/${encodeURIComponent(searchOptions[0].title)}`);
        setSearchInput(''); // 검색창 초기화
        setSearchOptions([]); // 검색 결과 초기화
      }
      // 검색 결과가 없거나 로딩 중일 때는 Autocomplete 기본 동작 허용
    }
  }, [navigate, searchOptions, isSearchLoading]);

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('로그아웃 오류:', error);
    } finally {
      handleUserMenuClose();
      onLogout();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static" sx={{ bgcolor: '#ff9800' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ mr: 3, fontWeight: 'bold' }}>
            WHY-BUTT (와이벗)
          </Typography>
          
          <Autocomplete
            freeSolo
            options={searchOptions}
            getOptionLabel={(option) => typeof option === 'string' ? option : option.title}
            onInputChange={handleSearchInputChange}
            onChange={handleSearchSelection}
            loading={isSearchLoading}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="페이지 제목이나 내용에서 검색..."
                onKeyDown={handleKeyDown}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'rgba(0, 0, 0, 0.6)' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'transparent',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.7)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <ListItem sx={{ p: 0 }}>
                  <ListItemText
                    primary={option.title}
                    secondary={option.snippet ? `${option.snippet.substring(0, 100)}...` : ''}
                    primaryTypographyProps={{
                      fontWeight: option.titleMatch ? 'bold' : 'normal',
                      color: option.titleMatch ? '#ff9800' : 'inherit'
                    }}
                  />
                </ListItem>
              </Box>
            )}
            sx={{
              flexGrow: 1,
              maxWidth: 600,
              mr: 2
            }}
          />
          
          {currentUser && (
            <>
              <Chip
                icon={<AccountCircle />}
                label={currentUser.userName}
                variant="outlined"
                onClick={handleUserMenuClick}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              />
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
              >
                <MenuItem onClick={handleUserMenuClose}>
                  <Typography variant="body2">
                    {currentUser.userName} ({currentUser.loginId})
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ExitToApp sx={{ mr: 1 }} />
                  로그아웃
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <Box
          sx={{
            width: 300,
            flexShrink: 0,
            p: 2,
            borderRight: '1px solid #e0e0e0',
            bgcolor: 'white',
          }}
        >
          <PageTree selectedTitle={currentTitle} onNavigate={handleNavigate} />
        </Box>
        <Box sx={{ flexGrow: 1, p: 2 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout; 