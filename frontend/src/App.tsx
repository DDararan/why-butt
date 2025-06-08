import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { orange } from '@mui/material/colors';
import Layout from './components/Layout';
import EditPage from './pages/EditPage';
import WikiPage from './pages/WikiPage';
import HomePage from './pages/HomePage';
import LoginPage from './components/LoginPage';
import { PageTreeProvider } from './contexts/PageTreeContext';

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
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('사용자 정보 확인 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
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
          <Layout currentUser={currentUser} onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/wiki/:title" element={<WikiPage />} />
              <Route path="/wiki/:title/edit" element={<EditPage />} />
              <Route path="/wiki/new" element={<EditPage />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </PageTreeProvider>
    </ThemeProvider>
  );
};

export default App;
