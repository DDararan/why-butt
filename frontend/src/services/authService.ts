import axios from 'axios';

interface CollaborationToken {
  token: string;
  userId: number;
  username: string;
  name: string;
  expiresAt: number;
}

export const authService = {
  /**
   * 협업 토큰 가져오기
   */
  async getCollaborationToken(): Promise<string> {
    // 기존 토큰 확인
    const storedToken = localStorage.getItem('collabToken');
    const tokenExpiry = localStorage.getItem('collabTokenExpiry');
    
    if (storedToken && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry);
      if (Date.now() < expiryTime) {
        return storedToken;
      }
    }
    
    // 새 토큰 요청
    try {
      const username = localStorage.getItem('loginId') || 'user1';
      const response = await axios.post<CollaborationToken>(
        `/api/auth/collab-token?username=${encodeURIComponent(username)}`
      );
      
      const { token, expiresAt } = response.data;
      
      // 토큰 저장
      localStorage.setItem('collabToken', token);
      localStorage.setItem('collabTokenExpiry', expiresAt.toString());
      localStorage.setItem('authToken', token); // CollaborativeEditor에서 사용
      
      return token;
    } catch (error) {
      console.error('협업 토큰 생성 실패:', error);
      // 데모용 기본 토큰 반환
      const demoToken = btoa(`1:demo:${Date.now()}`);
      localStorage.setItem('authToken', demoToken);
      return demoToken;
    }
  },
  
  /**
   * 로그아웃
   */
  logout() {
    localStorage.removeItem('collabToken');
    localStorage.removeItem('collabTokenExpiry');
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
  }
};