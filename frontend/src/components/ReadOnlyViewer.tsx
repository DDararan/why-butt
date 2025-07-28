import React from 'react';
import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import '../styles/markdown.css';

interface ReadOnlyViewerProps {
  content: string;
}

const ReadOnlyViewer: React.FC<ReadOnlyViewerProps> = ({ content }) => {
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
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default ReadOnlyViewer;