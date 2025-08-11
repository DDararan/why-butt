import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import MarkdownButton from './MarkdownButton';
import { Editor } from '@tiptap/react';
import { findParentNode } from '@tiptap/core';

interface TableToolbarProps {
  editor: Editor;
  handleToolbarClick: (action: () => void) => void;
}

const TableToolbar: React.FC<TableToolbarProps> = ({ editor, handleToolbarClick }) => {
  // console.log('[TableToolbar] 컴포넌트 렌더링됨');
  
  const [hasTable, setHasTable] = useState(false);
  const [isInTable, setIsInTable] = useState(false);
  
  // 표 상태 확인 함수
  const checkTableState = () => {
    // console.log('[TableToolbar] checkTableState 실행됨');
    let foundTable = false;
    let inTable = false;
    
    try {
      // 문서 내에 표가 있는지 확인
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'table') {
          foundTable = true;
          return false;
        }
      });
      
      // 현재 커서가 표 내부에 있는지 확인
      const predicate = (node: any) => node.type.name === 'table';
      const parent = findParentNode(predicate)(editor.state.selection);
      inTable = !!parent;
      
      // 대체 방법: 현재 선택된 노드가 tableCell 또는 tableHeader인지 확인
      if (!inTable) {
        const { $from } = editor.state.selection;
        inTable = $from.parent.type.name === 'tableCell' || 
                   $from.parent.type.name === 'tableHeader';
      }
    } catch (e) {
      console.error('[TableToolbar] 표 감지 오류:', e);
    }
    
    // console.log('[TableToolbar] 표 상태:', {
    //   foundTable,
    //   inTable,
    //   parentType: editor.state.selection.$from.parent.type.name,
    //   canMergeCells: editor.can().mergeCells(),
    //   canSplitCell: editor.can().splitCell(),
    //   commands: Object.keys(editor.commands)
    // });
    
    setHasTable(foundTable);
    setIsInTable(inTable);
  };
  
  // 에디터 상태 변경 감지
  useEffect(() => {
    checkTableState();
    
    // 에디터 업데이트 이벤트 리스너
    const updateHandler = () => {
      // console.log('[TableToolbar] 에디터 업데이트 감지');
      checkTableState();
    };
    
    editor.on('update', updateHandler);
    editor.on('selectionUpdate', updateHandler);
    
    return () => {
      editor.off('update', updateHandler);
      editor.off('selectionUpdate', updateHandler);
    };
  }, [editor]);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {/* 표 삽입 버튼 - 항상 표시 */}
      <MarkdownButton
        isActive={false}
        onClick={() => handleToolbarClick(() => {
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        })}
        disabled={hasTable}
      >
        ⊞ 표
      </MarkdownButton>

      {/* 표가 문서에 있을 때 표시되는 버튼들 */}
      {hasTable && (
        <>
          {/* 행 관련 버튼 */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <MarkdownButton
              isActive={false}
              onClick={() => handleToolbarClick(() => editor.chain().focus().addRowBefore().run())}
              disabled={!isInTable || !editor.can().addRowBefore()}
              style={{ fontSize: '11px', padding: '4px 6px' }}
            >
              ↑행
            </MarkdownButton>
            <MarkdownButton
              isActive={false}
              onClick={() => handleToolbarClick(() => editor.chain().focus().addRowAfter().run())}
              disabled={!isInTable || !editor.can().addRowAfter()}
              style={{ fontSize: '11px', padding: '4px 6px' }}
            >
              ↓행
            </MarkdownButton>
            <MarkdownButton
              isActive={false}
              onClick={() => handleToolbarClick(() => editor.chain().focus().deleteRow().run())}
              disabled={!isInTable || !editor.can().deleteRow()}
              style={{ fontSize: '11px', padding: '4px 6px' }}
            >
              ⊟행
            </MarkdownButton>
          </Box>

          {/* 열 관련 버튼 */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <MarkdownButton
              isActive={false}
              onClick={() => handleToolbarClick(() => editor.chain().focus().addColumnBefore().run())}
              disabled={!isInTable || !editor.can().addColumnBefore()}
              style={{ fontSize: '11px', padding: '4px 6px' }}
            >
              ←열
            </MarkdownButton>
            <MarkdownButton
              isActive={false}
              onClick={() => handleToolbarClick(() => editor.chain().focus().addColumnAfter().run())}
              disabled={!isInTable || !editor.can().addColumnAfter()}
              style={{ fontSize: '11px', padding: '4px 6px' }}
            >
              →열
            </MarkdownButton>
            <MarkdownButton
              isActive={false}
              onClick={() => handleToolbarClick(() => editor.chain().focus().deleteColumn().run())}
              disabled={!isInTable || !editor.can().deleteColumn()}
              style={{ fontSize: '11px', padding: '4px 6px' }}
            >
              ⊟열
            </MarkdownButton>
          </Box>

          {/* 기타 표 기능 */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <MarkdownButton
              isActive={false}
              onClick={() => handleToolbarClick(() => editor.chain().focus().toggleHeaderRow().run())}
              disabled={!isInTable || !editor.can().toggleHeaderRow()}
              style={{ fontSize: '11px', padding: '4px 6px' }}
            >
              ⊡헤더
            </MarkdownButton>
            <MarkdownButton
              isActive={false}
              onClick={() => handleToolbarClick(() => editor.chain().focus().deleteTable().run())}
              disabled={!isInTable || !editor.can().deleteTable()}
              style={{ fontSize: '11px', padding: '4px 6px', backgroundColor: '#ffebee' }}
            >
              🗑️
            </MarkdownButton>
          </Box>
        </>
      )}
    </Box>
  );
};

export default React.memo(TableToolbar);