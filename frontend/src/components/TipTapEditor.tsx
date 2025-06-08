import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import './TipTapEditor.css';

// React Icons import
import { 
  RiBold, 
  RiItalic,
  RiStrikethrough,
  RiCodeLine,
  RiLink,
  RiListUnordered,
  RiListOrdered,
  RiDoubleQuotesL,
  RiH1,
  RiH2,
  RiH3,
  RiImageLine,
  RiCodeBoxLine,
  RiSeparator
} from 'react-icons/ri';

interface TipTapEditorProps {
  defaultValue?: string;
  onChange?: (markdown: string) => void;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  defaultValue = '',
  onChange
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'markdown-link'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'markdown-image'
        }
      }),
      Placeholder.configure({
        placeholder: '내용을 입력하세요...'
      })
    ],
    content: defaultValue,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    }
  });

  useEffect(() => {
    if (editor && defaultValue !== editor.getHTML()) {
      editor.commands.setContent(defaultValue);
    }
  }, [defaultValue, editor]);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('이미지 URL을 입력하세요:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const url = window.prompt('링크 URL을 입력하세요:');
    if (url === null) {
      return;
    }
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="tiptap-editor">
      <div className="tiptap-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
        >
          {RiH1({ size: 20 })}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        >
          {RiH2({ size: 20 })}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
        >
          {RiH3({ size: 20 })}
        </button>
        <span className="tiptap-divider" />
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          {RiBold({ size: 20 })}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          {RiItalic({ size: 20 })}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
        >
          {RiStrikethrough({ size: 20 })}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'is-active' : ''}
        >
          {RiCodeLine({ size: 20 })}
        </button>
        <span className="tiptap-divider" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          {RiListUnordered({ size: 20 })}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
        >
          {RiListOrdered({ size: 20 })}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
        >
          {RiDoubleQuotesL({ size: 20 })}
        </button>
        <span className="tiptap-divider" />
        <button onClick={setLink} className={editor.isActive('link') ? 'is-active' : ''}>
          {RiLink({ size: 20 })}
        </button>
        <button onClick={addImage}>
          {RiImageLine({ size: 20 })}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
        >
          {RiCodeBoxLine({ size: 20 })}
        </button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          {RiSeparator({ size: 20 })}
        </button>
      </div>
      <EditorContent editor={editor} className="tiptap-content" />
    </div>
  );
};

export default TipTapEditor; 