import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

interface AdvancedMarkdownProps {
  children: string;
  className?: string;
}

/**
 * 고급 마크다운 렌더링 컴포넌트
 * - GitHub Flavored Markdown 지원
 * - 수학 공식 (LaTeX) 지원
 * - 코드 하이라이팅
 * - 테이블, 체크리스트, 취소선 등
 */
const AdvancedMarkdown: React.FC<AdvancedMarkdownProps> = ({ children, className }) => {
  return (
    <div className={className || 'markdown-preview'}>
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,        // GitHub Flavored Markdown
          remarkMath,       // 수학 공식
          remarkBreaks      // 줄바꿈 처리
        ]}
        rehypePlugins={[
          rehypeKatex,      // 수학 공식 렌더링
          rehypeHighlight,  // 코드 하이라이팅
          rehypeRaw         // HTML 태그 허용
        ]}
        components={{
          // 테이블 스타일링
          table: ({ children }: any) => (
            <div style={{ overflowX: 'auto' }}>
              <table className="markdown-table">{children}</table>
            </div>
          ),
          // 체크박스 스타일링
          input: ({ type, checked, ...props }: any) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  style={{ marginRight: '8px' }}
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          }
        } as any}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default AdvancedMarkdown; 