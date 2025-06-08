import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from './Editor';
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
        <Editor
          defaultValue={page.content}
          onChange={handleEditorChange}
        />
      </form>
    </div>
  );
};

export default PageEditor; 