import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { orange } from '@mui/material/colors';
import Layout from './components/Layout';
import EditPage from './pages/EditPage';
import WikiPage from './pages/WikiPage';
import WikiCollaborativeEditPage from './pages/WikiCollaborativeEditPage';
import LoginPage from './components/LoginPage';
import { PageTreeProvider } from './contexts/PageTreeContext';
import PageEditor from './components/PageEditor';
import HistoryComparePage from './pages/HistoryComparePage';

interface User {
  staffId: string;
  loginId: string;
  userName: string;
  email: string;
  token: string;
}

const theme = createTheme({
  palette: {
    primary: {
      main: orange[800],
    },
    secondary: {
      main: orange[500],
    },
  },
});

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 페이지 로드 시 현재 사용자 정보 확인
  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const user = await response.json();
        console.log('[App] 사용자 정보 확인됨:', user);
        setCurrentUser(user);
        
        // 사용자 정보 저장 (loginId도 포함)
        localStorage.setItem('username', user.userName);
        localStorage.setItem('loginId', user.loginId);
        console.log('[App] localStorage에 사용자 정보 저장:', {
          username: user.userName,
          loginId: user.loginId
        });
      } else {
        console.log('[App] 사용자 정보 확인 실패:', response.status);
      }
    } catch (error) {
      console.error('사용자 정보 확인 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (user: User) => {
    console.log('[App] 로그인 처리:', user);
    setCurrentUser(user);
    
    // 사용자 정보 저장 (loginId도 포함)
    localStorage.setItem('username', user.userName);
    localStorage.setItem('loginId', user.loginId);
    console.log('[App] 로그인 후 localStorage 저장:', {
      username: user.userName,
      loginId: user.loginId
    });
  };

  const handleLogout = () => {
    console.log('[App] 로그아웃 처리');
    setCurrentUser(null);
    // localStorage 정리
    localStorage.removeItem('username');
    localStorage.removeItem('loginId');
    localStorage.removeItem('authToken');
    localStorage.removeItem('collabToken');
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  if (!currentUser) {
    return (
      <ThemeProvider theme={theme}>
        <Router>
          <LoginPage onLogin={handleLogin} />
        </Router>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <PageTreeProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route element={<Layout currentUser={currentUser} onLogout={handleLogout} />}>
              <Route path="/" element={<Navigate to="/wiki" replace />} />
              <Route path="/wiki" element={<WikiPage />} />
              <Route path="/wiki/:id" element={<WikiPage />} />
              <Route path="/wiki/:id/edit" element={<EditPage currentUser={currentUser} />} />
              <Route path="/wiki/new" element={<EditPage currentUser={currentUser} />} />
              <Route path="/pages/new" element={<PageEditor />} />
              <Route path="/pages/:id/edit" element={<PageEditor />} />
              <Route path="/wiki/:id/history/:seqNbr/compare" element={<HistoryComparePage />} />
            </Route>
          </Routes>
        </Router>
      </PageTreeProvider>
    </ThemeProvider>
  );
};

export default App;
