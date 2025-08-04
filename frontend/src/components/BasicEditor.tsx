import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import TurndownService from 'turndown';

interface BasicEditorProps {
  defaultValue?: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

const BasicEditor: React.FC<BasicEditorProps> = ({ 
  defaultValue = '', 
  onChange, 
  readOnly = false 
}) => {
  // Turndown 서비스 인스턴스 생성
  const turndownService = new TurndownService({
    headingStyle: 'atx', // # 스타일 헤더 사용
    codeBlockStyle: 'fenced', // ``` 스타일 코드 블록 사용
  });
  
  // 이미지 규칙 추가
  turndownService.addRule('image', {
    filter: 'img',
    replacement: function (content, node: any) {
      const alt = node.alt || '이미지';
      const src = node.getAttribute('src') || '';
      return `![${alt}](${src})`;
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: { class: 'editor-image' },
      }),
    ],
    content: defaultValue,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onChange && !readOnly) {
        const html = editor.getHTML();
        const markdown = turndownService.turndown(html);
        onChange(markdown);
      }
    },
  });

  return (
    <div className="basic-editor">
      <EditorContent editor={editor} />
    </div>
  );
};

export default BasicEditor; 