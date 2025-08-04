import React from 'react';
import { Box, Divider } from '@mui/material';
import { Editor } from '@tiptap/react';
import MarkdownButton from './MarkdownButton';
import TableToolbar from './TableToolbar';

interface EditorToolbarProps {
  editor: Editor;
  handleToolbarClick: (action: () => void) => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, handleToolbarClick }) => {
  if (!editor) {
    return null;
  }

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: 1, 
      p: 1, 
      backgroundColor: '#f5f5f5',
      borderBottom: '1px solid #ddd',
      borderRadius: '4px 4px 0 0'
    }}>
      {/* 텍스트 스타일 */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <MarkdownButton
          isActive={editor.isActive('bold')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleBold().run())}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          //title="굵게 (Ctrl+B)"
        >
          <strong>B</strong>
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('italic')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleItalic().run())}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          //title="기울임 (Ctrl+I)"
        >
          <em>I</em>
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('underline')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleUnderline().run())}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          //title="밑줄 (Ctrl+U)"
        >
          <u>U</u>
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('strike')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleStrike().run())}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          //title="취소선"
        >
          <s>S</s>
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('code')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleCode().run())}
          disabled={!editor.can().chain().focus().toggleCode().run()}
         // title="인라인 코드"
        >
          {'</>'}
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('highlight')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleHighlight().run())}
          disabled={!editor.can().chain().focus().toggleHighlight().run()}
         // title="형광펜"
        >
          🖍️
        </MarkdownButton>
      </Box>

      <Divider orientation="vertical" flexItem />

      {/* 제목 스타일 */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <MarkdownButton
          isActive={editor.isActive('heading', { level: 1 })}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
         // title="제목 1"
        >
          H1
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
         // title="제목 2"
        >
          H2
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('heading', { level: 3 })}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        //  title="제목 3"
        >
          H3
        </MarkdownButton>
      </Box>

      <Divider orientation="vertical" flexItem />

      {/* 리스트 */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <MarkdownButton
          isActive={editor.isActive('bulletList')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleBulletList().run())}
         // title="글머리 기호"
        >
          •
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('orderedList')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleOrderedList().run())}
        //  title="번호 목록"
        >
          1.
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('taskList')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleTaskList().run())}
        //  title="체크리스트"
        >
          ☑
        </MarkdownButton>
      </Box>

      <Divider orientation="vertical" flexItem />

      {/* 정렬 */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <MarkdownButton
          isActive={editor.isActive({ textAlign: 'left' })}
          onClick={() => handleToolbarClick(() => editor.chain().focus().setTextAlign('left').run())}
         // title="왼쪽 정렬"
        >
          ⬅
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive({ textAlign: 'center' })}
          onClick={() => handleToolbarClick(() => editor.chain().focus().setTextAlign('center').run())}
         // title="가운데 정렬"
        >
          ⬌
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive({ textAlign: 'right' })}
          onClick={() => handleToolbarClick(() => editor.chain().focus().setTextAlign('right').run())}
         // title="오른쪽 정렬"
        >
          ➡
        </MarkdownButton>
      </Box>

      <Divider orientation="vertical" flexItem />

      {/* 특수 요소 */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <MarkdownButton
          isActive={editor.isActive('blockquote')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleBlockquote().run())}
         // title="인용구"
        >
          "
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('codeBlock')}
          onClick={() => handleToolbarClick(() => editor.chain().focus().toggleCodeBlock().run())}
          //title="코드 블록"
        >
          {'<>'}
        </MarkdownButton>
        
        <MarkdownButton
          isActive={false}
          onClick={() => handleToolbarClick(() => editor.chain().focus().setHorizontalRule().run())}
         // title="구분선"
        >
          ―
        </MarkdownButton>
        
        <MarkdownButton
          isActive={editor.isActive('link')}
          onClick={() => handleToolbarClick(() => addLink())}
         // title="링크"
        >
          🔗
        </MarkdownButton>
        
      </Box>

      <Divider orientation="vertical" flexItem />


      {/* 표 도구 */}
      <TableToolbar editor={editor} handleToolbarClick={handleToolbarClick} />
    </Box>
  );
};

export default EditorToolbar;