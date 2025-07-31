import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  CircularProgress,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Collapse,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem as MuiMenuItem,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { orange } from '@mui/material/colors';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import ArticleIcon from '@mui/icons-material/Article';
import FolderIcon from '@mui/icons-material/Folder';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { WikiPageSummary } from '../types/wiki';
import { WikiPageType } from '../types/pageType';
import { wikiService } from '../services/wikiService';
import { pageTypeService } from '../services/pageTypeService';
import { usePageTree } from '../contexts/PageTreeContext';

interface PageTreeProps {
  selectedId?: number;
  onNavigate: (id: number) => void;
}

interface MenuItemProps {
  page: WikiPageSummary;
  onNavigate: (id: number) => void;
  selectedId?: number;
  level: number;
  isDragging?: boolean;
  dropTarget?: { id: number; position: 'before' | 'after' | 'inside' } | null;
}

const SortableMenuItem: React.FC<MenuItemProps> = ({ page, onNavigate, selectedId, level, dropTarget }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: page.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isDropTarget = dropTarget?.id === page.id;
  const [open, setOpen] = useState(false);
  const hasChildren = page.children && page.children.length > 0;
  const isSelected = selectedId === page.id;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <MenuItem 
        page={page} 
        onNavigate={onNavigate} 
        selectedId={selectedId} 
        level={level}
        isDragging={isDragging}
        dragHandleProps={listeners}
        isDropTarget={isDropTarget}
        dropTarget={dropTarget}
      />
    </div>
  );
};

interface DragHandleProps {
  [key: string]: any;
}

interface MenuItemPropsWithDrag extends MenuItemProps {
  dragHandleProps?: DragHandleProps;
  isDropTarget?: boolean;
}

interface SortableMenuListProps {
  pages: WikiPageSummary[];
  onNavigate: (id: number) => void;
  selectedId?: number;
  level: number;
  parentId: number;
}

const SortableMenuList: React.FC<SortableMenuListProps> = ({ pages, onNavigate, selectedId, level, parentId }) => {
  const [localPages, setLocalPages] = useState<WikiPageSummary[]>(pages);
  
  // pages가 변경될 때 localPages 동기화
  useEffect(() => {
    setLocalPages(pages);
  }, [pages]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = localPages.findIndex((page) => page.id === active.id);
      const newIndex = localPages.findIndex((page) => page.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newPages = arrayMove(localPages, oldIndex, newIndex);
        setLocalPages(newPages);

        // 순서 변경 API 호출
        const orderUpdates = newPages.map((page, index) => ({
          id: page.id,
          displayOrder: index
        }));

        try {
          await wikiService.updatePagesOrder(orderUpdates);
          console.log(`레벨 ${level} 페이지 순서 변경 완료`);
        } catch (error) {
          console.error('페이지 순서 변경 실패:', error);
          // 실패 시 원래 순서로 복원
          setLocalPages(pages);
        }
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={localPages.map(page => page.id)} strategy={verticalListSortingStrategy}>
        <List component="div" disablePadding>
          {localPages.map((child) => (
            <SortableMenuItem
              key={child.id}
              page={child}
              onNavigate={onNavigate}
              selectedId={selectedId}
              level={level}
              dropTarget={null}
            />
          ))}
        </List>
      </SortableContext>
    </DndContext>
  );
};

const MenuItem: React.FC<MenuItemPropsWithDrag> = ({ page, onNavigate, selectedId, level, isDragging, dragHandleProps, isDropTarget, dropTarget }) => {
  const [open, setOpen] = useState(true);
  const hasChildren = page.children && page.children.length > 0;
  const isSelected = selectedId === page.id;

  return (
    <>
      <ListItem
        disablePadding
        sx={{
          pl: level * 2,
          py: 0.1,
          minHeight: '20px',
          maxHeight: '24px',
          bgcolor: isSelected ? orange[50] : 'transparent',
          borderLeft: isSelected ? `3px solid ${orange[500]}` : 'none',
          border: isDropTarget ? `2px dashed ${orange[300]}` : 'none',
        }}
      >
        <ListItemButton
          onClick={() => onNavigate(page.id)}
          sx={{
            py: 0.1,                 // ← 여기가 중요
            minHeight: '20px',      // ← selected 배경 높이를 줄이려면 여기도 일치시켜야 함
            maxHeight: '24px',
            fontSize: '1.3rem',
            '&:hover': {
              bgcolor: orange[50],
            },
          }}
        >
          {dragHandleProps && (
            <ListItemIcon 
              sx={{ minWidth: 24, cursor: 'grab' }}
              {...dragHandleProps}
            >
              <DragIndicatorIcon sx={{ color: orange[400], fontSize: 16 }} />
            </ListItemIcon>
          )}
          <ListItemText 
            primary={
              <span>
                {page.title}
                {page.fileCount && page.fileCount > 0 ? ` (${page.fileCount})` : ''}
              </span>
            }
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: isSelected ? 'bold' : 'normal',
                color: isSelected ? orange[900] : 'inherit',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',         // 한 줄로 표시
                overflow: 'hidden',           // 넘치는 부분 숨김
                textOverflow: 'ellipsis',     // ... 표시
              },
            }}
          />
          {hasChildren && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
              sx={{ color: orange[700] }}
            >
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {page.children!.map((child) => (
              <SortableMenuItem
                key={child.id}
                page={child}
                onNavigate={onNavigate}
                selectedId={selectedId}
                level={level + 1}
                dropTarget={dropTarget}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

const PageTree: React.FC<PageTreeProps> = ({ selectedId, onNavigate }) => {
  const [pages, setPages] = useState<WikiPageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [draggedPage, setDraggedPage] = useState<WikiPageSummary | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: number; position: 'before' | 'after' | 'inside' } | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('MENU');
  const [pageTypes, setPageTypes] = useState<WikiPageType[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newTypeDialogOpen, setNewTypeDialogOpen] = useState(false);
  const [editTypeDialogOpen, setEditTypeDialogOpen] = useState(false);
  const [selectedPageType, setSelectedPageType] = useState<WikiPageType | null>(null);
  const [newPageType, setNewPageType] = useState('');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [editPageTitle, setEditPageTitle] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const { setRefreshFunction } = usePageTree();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchPages = async (pageType: string = currentTab) => {
    try {
      setIsLoading(true);
      const result = await wikiService.getPagesByType(pageType);
      console.log(`${pageType} 페이지 API 응답:`, result);
      setPages(result);
    } catch (error) {
      console.error(`${pageType} 페이지 목록을 불러오는데 실패했습니다:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPageTypes = async () => {
    try {
      const types = await pageTypeService.getAllPageTypes();
      setPageTypes(types);
    } catch (error) {
      console.error('페이지 타입 목록을 불러오는데 실패했습니다:', error);
    }
  };

  useEffect(() => {
    fetchPages();
    fetchPageTypes();
    // Context에 새로고침 함수 등록
    setRefreshFunction(() => fetchPages(currentTab));
  }, [setRefreshFunction, currentTab]);

  const handleHomeClick = () => {
    window.location.href = '/';
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
    fetchPages(newValue);
  };

  // 모든 페이지를 플랫하게 변환하는 함수
  const flattenPages = (pages: WikiPageSummary[]): WikiPageSummary[] => {
    const result: WikiPageSummary[] = [];
    const flatten = (pageList: WikiPageSummary[]) => {
      pageList.forEach(page => {
        result.push(page);
        if (page.children && page.children.length > 0) {
          flatten(page.children);
        }
      });
    };
    flatten(pages);
    return result;
  };

  const findPageById = (id: number | string, pageList: WikiPageSummary[] = pages): WikiPageSummary | null => {
    for (const page of pageList) {
      if (page.id === id) return page;
      if (page.children) {
        const found = findPageById(id, page.children);
        if (found) return found;
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
    const page = findPageById(active.id);
    setDraggedPage(page);
    console.log('드래그 시작:', page?.title);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;
    if (!over || !active || over.id === active.id) {
      setDropTarget(null);
      return;
    }

    const overId = typeof over.id === 'string' ? parseInt(over.id.split('-')[0]) : over.id;
    const overPage = findPageById(overId);
    
    if (overPage) {
      setDropTarget({ id: overPage.id, position: 'inside' });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDraggedPage(null);
    setDropTarget(null);

    if (!over || !active || over.id === active.id) {
      return;
    }

    try {
      const draggedId = typeof active.id === 'number' ? active.id : parseInt(active.id.toString());
      const overId = typeof over.id === 'string' ? parseInt(over.id.split('-')[0]) : over.id;
      
      const draggedPage = findPageById(draggedId);
      const targetPage = findPageById(overId);

      if (!draggedPage || !targetPage) {
        console.error('드래그된 페이지 또는 타겟 페이지를 찾을 수 없습니다');
        return;
      }

      const isMovingToDescendant = (parent: WikiPageSummary, child: WikiPageSummary): boolean => {
        if (parent.children) {
          for (const c of parent.children) {
            if (c.id === child.id) return true;
            if (isMovingToDescendant(c, child)) return true;
          }
        }
        return false;
      };

      if (isMovingToDescendant(draggedPage, targetPage)) {
        alert('자신의 하위 페이지로는 이동할 수 없습니다.');
        return;
      }

      console.log(`${draggedPage.title}을(를) ${targetPage.title}의 하위로 이동`);

      await wikiService.updatePageParent(draggedId, overId, 0);
      await fetchPages();
      console.log('페이지 이동 완료');

    } catch (error) {
      console.error('페이지 이동 실패:', error);
      alert('페이지 이동에 실패했습니다.');
    }
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleCreatePageType = async () => {
    try {
      await pageTypeService.createPageType({
        pageType: newPageType,
        pageTitle: newPageTitle
      });
      await fetchPageTypes();
      setNewTypeDialogOpen(false);
      setNewPageType('');
      setNewPageTitle('');
      alert('페이지 타입이 생성되었습니다.');
    } catch (error) {
      console.error('페이지 타입 생성 실패:', error);
      alert('페이지 타입 생성에 실패했습니다.');
    }
  };

  const handleUpdatePageType = async () => {
    if (!selectedPageType) return;
    
    try {
      await pageTypeService.updatePageType(selectedPageType.pageType, {
        pageTitle: editPageTitle
      });
      await fetchPageTypes();
      setEditTypeDialogOpen(false);
      setSelectedPageType(null);
      setEditPageTitle('');
      alert('페이지 타입이 수정되었습니다.');
    } catch (error) {
      console.error('페이지 타입 수정 실패:', error);
      alert('페이지 타입 수정에 실패했습니다.');
    }
  };

  const handleDeletePageType = async (pageType: WikiPageType) => {
    if (!window.confirm(`'${pageType.pageTitle}' 페이지 타입을 삭제하시겠습니까?`)) {
      return;
    }
    
    try {
      await pageTypeService.deletePageType(pageType.pageType);
      await fetchPageTypes();
      alert('페이지 타입이 삭제되었습니다.');
    } catch (error) {
      console.error('페이지 타입 삭제 실패:', error);
      alert('페이지 타입 삭제에 실패했습니다.');
    }
  };

  const openEditDialog = (pageType: WikiPageType) => {
    setSelectedPageType(pageType);
    setEditPageTitle(pageType.pageTitle);
    setEditTypeDialogOpen(true);
    handleMenuClose();
  };

  // 디버깅용 버튼에 Y.js 상태 확인 추가
  const debugYjsSync = useCallback(() => {
    console.log('=== Y.js 동기화 상태 강제 확인 ===');
    console.log('PageTree에서 Y.js 디버그 호출됨');
    
    // Y.js 관련 기능은 YjsEditorNew 컴포넌트로 이동 필요
    alert('Y.js 디버그 기능은 에디터에서 사용해주세요');
  }, []);

  return (
    <Card sx={{ height: '100%' , overflowY: 'auto'}}>
      <CardContent>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 0.2 }}>
          <Typography variant="h6" component="h2" sx={{ color: orange[800], fontSize: '1.1rem' }}>
            페이지 메뉴
          </Typography>
          <Box>
            <IconButton 
              onClick={() => fetchPages(currentTab)}
              disabled={isLoading}
              sx={{ color: orange[600] }}
            >
              {isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
            <IconButton 
              onClick={handleSettingsClick}
              sx={{ color: orange[600] }}
            >
              <SettingsIcon />
            </IconButton>
          </Box>
        </Box>

        {/* 설정 메뉴 */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MuiMenuItem onClick={() => { setNewTypeDialogOpen(true); handleMenuClose(); }}>
            <AddIcon sx={{ mr: 1 }} />
            페이지 타입 추가
          </MuiMenuItem>
          <MuiMenuItem onClick={() => { setSettingsOpen(true); handleMenuClose(); }}>
            <SettingsIcon sx={{ mr: 1 }} />
            페이지 타입 관리
          </MuiMenuItem>
        </Menu>

        {/* 탭 기본값 메뉴, 일자별, 기타*/}
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{ 
            maxWidth: '100%',
            overflowY: 'auto',
            borderBottom: 0, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              fontSize: '0.8rem',     
              minWidth: 'auto',        // ✅ 기본 minWidth 72px 제거
              paddingLeft: '8px',      // ✅ 좌우 여백 줄이기
              paddingRight: '8px',
              marginRight: '4px',      // ✅ 탭 사이 간격도 최소화
            }
          }}
        >
          {pageTypes.map((type) => (
            <Tab key={type.pageType} label={type.pageTitle} value={type.pageType} />
          ))}
        </Tabs>

        {/* 페이지 목록 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <List>               
              {pages.map((page) => (
                <SortableMenuItem
                  key={page.id}
                  page={page}
                  onNavigate={onNavigate}
                  selectedId={selectedId}
                  level={0}
                  dropTarget={dropTarget}
                />
              ))}
            </List>
          </SortableContext>
          
          <DragOverlay>
            {draggedPage && (
              <MenuItem
                page={draggedPage}
                onNavigate={onNavigate}
                selectedId={selectedId}
                level={0}
                isDragging={true}
                dropTarget={dropTarget}
              />
            )}
          </DragOverlay>
        </DndContext>
      </CardContent>

      {/* 페이지 타입 관리 다이얼로그 */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: '1.1rem' }}>페이지 타입 관리</DialogTitle>
        <DialogContent>
          <List>
            {pageTypes.map((type) => (
              <ListItem
                key={type.pageType}
                secondaryAction={
                  <Box>
                    <IconButton onClick={() => openEditDialog(type)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeletePageType(type)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText 
                  primary={type.pageTitle} 
                  secondary={`타입: ${type.pageType}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 새 페이지 타입 생성 다이얼로그 */}
      <Dialog open={newTypeDialogOpen} onClose={() => setNewTypeDialogOpen(false)}>
        <DialogTitle sx={{ fontSize: '1.1rem' }}>새 페이지 타입 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="페이지 타입 코드"
            value={newPageType}
            onChange={(e) => setNewPageType(e.target.value)}
            fullWidth
            variant="outlined"
            sx={{ mb: 1 }}
          />
          <TextField
            margin="dense"
            label="페이지 타입 제목"
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTypeDialogOpen(false)}>취소</Button>
          <Button onClick={handleCreatePageType} variant="contained">생성</Button>
        </DialogActions>
      </Dialog>

      {/* 페이지 타입 수정 다이얼로그 */}
      <Dialog open={editTypeDialogOpen} onClose={() => setEditTypeDialogOpen(false)}>
        <DialogTitle sx={{ fontSize: '1.1rem' }}>페이지 타입 수정</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="페이지 타입 제목"
            value={editPageTitle}
            onChange={(e) => setEditPageTitle(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTypeDialogOpen(false)}>취소</Button>
          <Button onClick={handleUpdatePageType} variant="contained">수정</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PageTree; 