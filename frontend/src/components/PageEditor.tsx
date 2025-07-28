import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BasicEditor from './BasicEditor';
import './PageEditor.css';

interface PageData {
  title: string;
  content: string;
}

const PageEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageData>({
    title: '',
    content: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Y.js 문서 상태 로깅 함수
  const logYjsDocumentState = useCallback((context: string) => {
    // Y.js 관련 로직은 YjsEditorNew.tsx에서 처리
    // 이 컴포넌트에서는 문서 상태를 직접 관리하지 않음
    const state = {
      context,
      // 문서 상태 로깅은 YjsEditorNew.tsx에서 처리
      // 여기서는 빈 값을 반환하거나, 필요한 경우 문서 상태를 가져오는 로직 추가
    };
    
    console.log(`[YjsEditor] 문서 상태 [${context}]:`, state);
    return state;
  }, []);

  // Y.js 동기화 디버깅 함수
  const debugYjsSync = useCallback(() => {
    console.log('=== Y.js 동기화 상태 강제 확인 ===');
    
    // 현재 상태 로깅
    logYjsDocumentState('수동 확인');
    
    // 다른 사용자들과 상태 비교 요청
    // Y.js 동기화는 YjsEditorNew.tsx에서 처리
    // 이 컴포넌트에서는 문서 강제 재동기화 로직 제거
  }, [logYjsDocumentState]);

  useEffect(() => {
    if (id) {
      loadPage();
    }
  }, [id]);

  const loadPage = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/pages/${id}`);
      if (!response.ok) throw new Error('Failed to load page');
      const data = await response.json();
      setPage(data);
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const url = id ? `/api/pages/${id}` : '/api/pages';
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(page),
      });

      if (!response.ok) throw new Error('Failed to save page');
      
      const savedPage = await response.json();
      navigate(`/pages/${savedPage.id}`);
    } catch (error) {
      console.error('Error saving page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditorChange = (content: string) => {
    setPage({ ...page, content });
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="page-editor">
      <form onSubmit={handleSubmit}>
        <div className="editor-header">
          <input
            type="text"
            value={page.title}
            onChange={(e) => setPage({ ...page, title: e.target.value })}
            placeholder="페이지 제목"
            className="title-input"
            required
          />
          <div className="editor-actions">
            <button type="button" onClick={() => navigate(-1)} className="cancel-button">
              취소
            </button>
            <button type="submit" className="save-button">
              저장
            </button>
          </div>
        </div>
        <BasicEditor
          defaultValue={page.content}
          onChange={handleEditorChange}
        />
        
        {/* 디버그 버튼들 */}
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={debugYjsSync}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Y.js 상태 확인
          </button>
        </div>
      </form>
    </div>
  );
};

export default PageEditor; 