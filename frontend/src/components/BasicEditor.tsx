import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

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
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: defaultValue,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onChange && !readOnly) {
        onChange(editor.getHTML());
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