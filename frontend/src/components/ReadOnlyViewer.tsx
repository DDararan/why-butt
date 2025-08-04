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
  // HTML 태그가 포함되어 있거나 base64 이미지가 있는지 확인
  const hasHtmlTags = /<[^>]*>/g.test(content);
  const hasBase64Image = content.includes('data:image');
  const isHtml = hasHtmlTags || hasBase64Image;
  
  // 디버깅: 컨텐츠 확인
  console.log('[ReadOnlyViewer] 컨텐츠 타입:', isHtml ? 'HTML' : 'Markdown');
  console.log('[ReadOnlyViewer] HTML 태그 포함:', hasHtmlTags);
  console.log('[ReadOnlyViewer] Base64 이미지 포함:', hasBase64Image);
  console.log('[ReadOnlyViewer] 컨텐츠 내용:', content.substring(0, 200));
  
  // 이미지 마크다운 패턴 확인
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const imageMatches = content.match(imagePattern);
  if (imageMatches) {
    console.log('[ReadOnlyViewer] 이미지 마크다운 발견:', imageMatches.length, '개');
    imageMatches.forEach((match, index) => {
      console.log(`[ReadOnlyViewer] 이미지 ${index + 1} 길이:`, match.length);
      if (match.includes('data:image')) {
        console.log(`[ReadOnlyViewer] 이미지 ${index + 1}은 base64 이미지`);
      }
    });
  }
  
  // HTML인 경우 또는 base64 이미지가 있는 경우 직접 렌더링
  if (isHtml) {
    // base64 이미지가 있는 마크다운인 경우 HTML로 변환
    let htmlContent = content;
    if (hasBase64Image && !hasHtmlTags) {
      console.log('[ReadOnlyViewer] Base64 이미지가 있는 마크다운을 HTML로 변환');
      // 마크다운 이미지를 HTML img 태그로 변환
      htmlContent = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        console.log('[ReadOnlyViewer] 이미지 변환:', { 
          alt, 
          srcLength: src.length,
          isBase64: src.startsWith('data:image')
        });
        return `<img src="${src}" alt="${alt || '이미지'}" style="max-width: 100%; height: auto; display: block; margin: 1rem 0;" />`;
      });
      
      // 기본적인 마크다운 변환 추가
      // 줄바꿈을 <br>로 변환
      htmlContent = htmlContent.replace(/\n/g, '<br>');
      
      // 단락을 <p>로 감싸기
      htmlContent = `<p>${htmlContent}</p>`;
    }
    
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
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  // base64 이미지를 처리하기 위해 content를 전처리
  const preprocessContent = (content: string) => {
    // 이미지 마크다운을 HTML img 태그로 변환
    const processedContent = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      // base64 이미지 또는 일반 URL 모두 처리
      console.log('[ReadOnlyViewer] 이미지 변환:', { alt, srcLength: src.length });
      return `<img src="${src}" alt="${alt || '이미지'}" style="max-width: 100%; height: auto; display: block; margin: 1rem 0;" />`;
    });
    
    return processedContent;
  };

  const processedContent = preprocessContent(content);

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
            console.log('[ReadOnlyViewer] 이미지 렌더링:', props.src?.substring(0, 100), props.alt);
            return (
              <img 
                {...props} 
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto',
                  display: 'block',
                  margin: '1rem 0'
                }} 
                alt={props.alt || '이미지'}
              />
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </Box>
  );
};

export default ReadOnlyViewer;