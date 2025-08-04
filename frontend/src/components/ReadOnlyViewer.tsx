import React from 'react';
import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import '../styles/markdown.css';

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
  // HTML 태그가 포함되어 있는지 확인
  const isHtml = /<[^>]*>/g.test(content);
  
  // HTML인 경우 직접 렌더링, 마크다운인 경우 ReactMarkdown 사용
  if (isHtml) {
    
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
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }


  return (
    <Box
      className="markdown-preview"
      sx={{
        '& img': {
          maxWidth: '100%',
          height: 'auto',
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
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkUnderline, remarkHighlight]}
        rehypePlugins={[rehypeRaw]}
        components={{
          img: ({node, ...props}) => {
            // base64 이미지 또는 일반 이미지 모두 처리
            const className = props.className || '';
            console.log('[ReadOnlyViewer] 이미지 렌더링:', {
              className,
              srcLength: props.src?.length,
              alt: props.alt
            });
            
            return (
              <img 
                className={className}
                src={props.src}
                alt={props.alt || '이미지'}
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto',
                  display: 'block',
                  margin: '1rem 0'
                }} 
                onError={(e) => {
                  console.error('[ReadOnlyViewer] 이미지 로드 실패:', props.src?.substring(0, 100));
                }}
                onLoad={(e) => {
                  console.log('[ReadOnlyViewer] 이미지 로드 성공');
                }}
              />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default ReadOnlyViewer;