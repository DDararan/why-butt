import React from 'react';
import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import '../styles/markdown.css';
import { marked } from 'marked';

// 커스텀 remark 플러그인: ++텍스트++ → <u>텍스트</u>
function remarkUnderline() {
  return (tree: any) => {
    const visit = (node: any, index: number | null, parent: any) => {
      if (node.type === 'text') {
        const regex = /\+\+([^+]+)\+\+/g;
        const matches = [...node.value.matchAll(regex)];
        
        if (matches.length > 0) {
          const newNodes: any[] = [];
          let lastIndex = 0;
          
          matches.forEach(match => {
            const startIndex = match.index!;
            const endIndex = startIndex + match[0].length;
            
            // 매치 이전 텍스트
            if (startIndex > lastIndex) {
              newNodes.push({
                type: 'text',
                value: node.value.slice(lastIndex, startIndex)
              });
            }
            
            // 언더라인 HTML
            newNodes.push({
              type: 'html',
              value: `<u>${match[1]}</u>`
            });
            
            lastIndex = endIndex;
          });
          
          // 마지막 텍스트
          if (lastIndex < node.value.length) {
            newNodes.push({
              type: 'text',
              value: node.value.slice(lastIndex)
            });
          }
          
          if (parent && typeof index === 'number') {
            parent.children.splice(index, 1, ...newNodes);
            return index + newNodes.length;
          }
        }
      }
      
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const result = visit(node.children[i], i, node);
          if (typeof result === 'number') {
            i = result - 1;
          }
        }
      }
    };
    
    visit(tree, null, null);
  };
}

// 커스텀 remark 플러그인: ==텍스트== → <mark>텍스트</mark>
function remarkHighlight() {
  return (tree: any) => {
    const visit = (node: any, index: number | null, parent: any) => {
      if (node.type === 'text') {
        const regex = /==([^=]+)==/g;
        const matches = [...node.value.matchAll(regex)];
        
        if (matches.length > 0) {
          const newNodes: any[] = [];
          let lastIndex = 0;
          
          matches.forEach(match => {
            const startIndex = match.index!;
            const endIndex = startIndex + match[0].length;
            
            // 매치 이전 텍스트
            if (startIndex > lastIndex) {
              newNodes.push({
                type: 'text',
                value: node.value.slice(lastIndex, startIndex)
              });
            }
            
            // 하이라이트 HTML
            newNodes.push({
              type: 'html',
              value: `<mark>${match[1]}</mark>`
            });
            
            lastIndex = endIndex;
          });
          
          // 마지막 텍스트
          if (lastIndex < node.value.length) {
            newNodes.push({
              type: 'text',
              value: node.value.slice(lastIndex)
            });
          }
          
          if (parent && typeof index === 'number') {
            parent.children.splice(index, 1, ...newNodes);
            return index + newNodes.length;
          }
        }
      }
      
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const result = visit(node.children[i], i, node);
          if (typeof result === 'number') {
            i = result - 1;
          }
        }
      }
    };
    
    visit(tree, null, null);
  };
}

interface ReadOnlyViewerProps {
  content: string;
}

const ReadOnlyViewer: React.FC<ReadOnlyViewerProps> = ({ content }) => {
  console.log('[ReadOnlyViewer_시작] 초기 컨텐츠:', content?.substring(0, 100));
  
  // HTML인지 마크다운인지 판단하여 처리
  let processedContent = content || '';
  
  // HTML 태그 패턴 확인 (table, p, div, h1-h6 등의 일반적인 HTML 태그들)
  const isHTML = /<(table|thead|tbody|tr|td|th|p|div|h[1-6]|ul|ol|li|blockquote|pre|code|strong|em|u|s|mark|img|br|hr)[^>]*>/i.test(processedContent);
  
  if (isHTML) {
    // 이미 HTML인 경우 그대로 사용
    console.log('[ReadOnlyViewer] HTML 콘텐츠 감지 - 변환 없이 사용');
    console.log('[ReadOnlyViewer] HTML 시작:', processedContent.substring(0, 100));
    
    // TipTap 에디터에서 생성한 HTML을 직접 사용
    // 별도의 변환 없이 그대로 표시
  } else {
    // 마크다운인 경우 HTML로 변환
    console.log('[ReadOnlyViewer] 마크다운 콘텐츠 감지 - HTML로 변환');
    
    try {
      // marked 옵션 설정
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
      
      // 이미지 마크다운 패턴 확인 (디버깅용)
      const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const imageMatches = processedContent.match(imagePattern);
      if (imageMatches) {
        console.log('[ReadOnlyViewer_이미지] 마크다운 이미지:', imageMatches.length, '개');
        imageMatches.forEach((match, index) => {
          console.log(`[ReadOnlyViewer_이미지] ${index + 1} URL 길이:`, match.length);
          if (match.includes('data:image')) {
            console.log(`[ReadOnlyViewer_이미지] base64 발견`);
          }
        });
      }
      
      // 마크다운을 HTML로 변환
      const htmlContent = marked(processedContent) as string;
      console.log('[ReadOnlyViewer_변환] 마크다운 -> HTML:', processedContent.substring(0, 50), ' => ', htmlContent.substring(0, 50));
      console.log('[ReadOnlyViewer_변환] HTML 길이:', htmlContent.length);
      
      // 변환된 HTML 콘텐츠 사용
      processedContent = htmlContent;
    } catch (error) {
      console.error('[ReadOnlyViewer_오류] 마크다운 변환 실패:', error);
    }
  }
  
  // 항상 HTML로 직접 렌더링
  // YjsEditorNew와 동일한 방식으로 처리
  return (
      <Box
        className="markdown-preview html-content"
        sx={{
          '& img': {
            maxWidth: '100%',
            height: 'auto',
          },
          '& .editor-image': {
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            margin: '1rem 0',
          },
          '& table': {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '1rem',
          },
          '& th, & td': {
            border: '1px solid #ddd',
            padding: '8px',
          },
          '& th': {
            backgroundColor: '#f5f5f5',
          },
          '& pre': {
            backgroundColor: '#f5f5f5',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
          },
          '& code': {
            backgroundColor: '#f5f5f5',
            padding: '0.2rem 0.4rem',
            borderRadius: '3px',
            fontSize: '0.9em',
          },
          '& pre code': {
            backgroundColor: 'transparent',
            padding: 0,
          },
          '& blockquote': {
            borderLeft: '4px solid #ddd',
            marginLeft: 0,
            paddingLeft: '1rem',
            color: '#666',
          },
          '& ul, & ol': {
            paddingLeft: '2rem',
          },
          '& li': {
            marginBottom: '0.5rem',
          },
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            marginTop: '1.5rem',
            marginBottom: '1rem',
          },
          '& p': {
            marginBottom: '1rem',
            lineHeight: '1.6',
          },
          '& u': {
            textDecoration: 'underline',
          },
          '& s, & del, & strike': {
            textDecoration: 'line-through',
          },
          '& mark': {
            backgroundColor: '#ffeb3b',
            padding: '0.1em 0.2em',
            borderRadius: '2px',
          },
        }}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
  );
};

export default ReadOnlyViewer;