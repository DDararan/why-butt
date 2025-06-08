import React, { useState, useEffect } from 'react';
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
import { WikiPageSummary } from '../types/wiki';
import { wikiService } from '../services/wikiService';
import { usePageTree } from '../contexts/PageTreeContext';

interface PageTreeProps {
  selectedTitle?: string;
  onNavigate: (title: string) => void;
}

interface MenuItemProps {
  page: WikiPageSummary;
  onNavigate: (title: string) => void;
  selectedTitle?: string;
  level: number;
  isDragging?: boolean;
  dropTarget?: { id: number; position: 'before' | 'after' | 'inside' } | null;
}

const SortableMenuItem: React.FC<MenuItemProps> = ({ page, onNavigate, selectedTitle, level, dropTarget }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isDropTarget = dropTarget?.id === page.id;

  return (
    <div ref={setNodeRef} style={style}>
      <MenuItem 
        page={page} 
        onNavigate={onNavigate} 
        selectedTitle={selectedTitle} 
        level={level}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        dropTarget={dropTarget}
        isDropTarget={isDropTarget}
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
  onNavigate: (title: string) => void;
  selectedTitle?: string;
  level: number;
  parentId: number;
}

const SortableMenuList: React.FC<SortableMenuListProps> = ({ pages, onNavigate, selectedTitle, level, parentId }) => {
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
              selectedTitle={selectedTitle}
              level={level}
              dropTarget={null}
            />
          ))}
        </List>
      </SortableContext>
    </DndContext>
  );
};

const MenuItem: React.FC<MenuItemPropsWithDrag> = ({ page, onNavigate, selectedTitle, level, isDragging, dragHandleProps, isDropTarget, dropTarget }) => {
  const [open, setOpen] = useState(true);
  const hasChildren = page.children && page.children.length > 0;
  const isSelected = page.title === selectedTitle;

  return (
    <>
      <ListItem 
        disablePadding 
        sx={{ 
          pl: level * 2,
          bgcolor: isSelected ? orange[50] : isDropTarget ? orange[100] : 'transparent',
          borderLeft: isSelected ? `4px solid ${orange[700]}` : isDropTarget ? `4px solid ${orange[500]}` : '4px solid transparent',
          border: isDropTarget ? `2px dashed ${orange[400]}` : 'none',
        }}
      >
        <ListItemButton
          onClick={() => onNavigate(page.title)}
          sx={{
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
          <ListItemIcon sx={{ minWidth: 36 }}>
            {hasChildren ? (
              <FolderIcon sx={{ color: orange[700] }} />
            ) : (
              <ArticleIcon sx={{ color: orange[600] }} />
            )}
          </ListItemIcon>
          <ListItemText 
            primary={page.title}
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: isSelected ? 'bold' : 'normal',
                color: isSelected ? orange[900] : 'inherit',
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
                selectedTitle={selectedTitle}
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

const PageTree: React.FC<PageTreeProps> = ({ selectedTitle, onNavigate }) => {
  const [pages, setPages] = useState<WikiPageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [draggedPage, setDraggedPage] = useState<WikiPageSummary | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: number; position: 'before' | 'after' | 'inside' } | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('MENU');
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

  useEffect(() => {
    fetchPages();
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

    // 드롭 타겟 결정 로직
    const overId = typeof over.id === 'string' ? parseInt(over.id.split('-')[0]) : over.id;
    const overPage = findPageById(overId);
    
    if (overPage) {
      // 더 정교한 드롭 위치 계산이 가능하지만, 일단 간단하게 'inside'로 설정
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

      // 자신의 자식으로 이동하려는 경우 방지
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

      // 백엔드 API 호출
      await wikiService.updatePageParent(draggedId, overId, 0);
      
      // 성공 시 페이지 목록 새로고침
      await fetchPages();
      console.log('페이지 이동 완료');

    } catch (error) {
      console.error('페이지 이동 실패:', error);
      alert('페이지 이동에 실패했습니다.');
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={handleHomeClick}
            fullWidth
            sx={{
              bgcolor: orange[700],
              mb: 2,
              '&:hover': {
                bgcolor: orange[800],
              },
            }}
          >
            홈으로
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ color: orange[800] }}>
            페이지 메뉴
          </Typography>
          <IconButton 
            onClick={() => fetchPages(currentTab)}
            disabled={isLoading}
            sx={{
              color: orange[700],
              '&:hover': {
                bgcolor: orange[50],
              },
            }}
          >
            {isLoading ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 36,
                fontSize: '0.75rem',
                color: orange[600],
                '&.Mui-selected': {
                  color: orange[800],
                  fontWeight: 'bold',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: orange[700],
              },
            }}
          >
            <Tab label="메뉴" value="MENU" />
            <Tab label="일자별" value="DAILY" />
            <Tab label="기타" value="ETC" />
          </Tabs>
        </Box>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <List sx={{ width: '100%' }}>
            {pages.length > 0 ? (
              <SortableContext 
                items={flattenPages(pages).map(page => page.id)} 
                strategy={verticalListSortingStrategy}
              >
                {pages.map((page) => (
                  <SortableMenuItem
                    key={page.id}
                    page={page}
                    onNavigate={onNavigate}
                    selectedTitle={selectedTitle}
                    level={0}
                    dropTarget={dropTarget}
                  />
                ))}
              </SortableContext>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                작성된 페이지가 없습니다.
              </Box>
            )}
          </List>
          
          <DragOverlay>
            {activeId && draggedPage ? (
              <Box 
                sx={{ 
                  p: 1, 
                  bgcolor: 'background.paper', 
                  border: 1, 
                  borderColor: orange[300],
                  borderRadius: 1,
                  opacity: 0.8,
                  transform: 'rotate(5deg)'
                }}
              >
                <Typography variant="body2" sx={{ color: orange[800] }}>
                  📄 {draggedPage.title}
                </Typography>
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
};

export default PageTree; 