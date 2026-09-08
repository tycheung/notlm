import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
  closestCenter,
  useDroppable,
  useDraggable,
  KeyboardSensor,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Loading from './Loading';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { createPortal } from 'react-dom';

export interface DragDropItem {
  id: string | number;
  data: any;
}

export interface DragDropCategory {
  id: string;
  name: string;
  items: DragDropItem[];
  color?: string;
  maxItems?: number;
}

export interface DragDropResult {
  item: DragDropItem;
  fromCategoryId: string;
  toCategoryId: string;
}

interface ExpandedCategories {
  [categoryId: string]: boolean;
}

interface DragDropCategorizedTableProps {
  categories: DragDropCategory[];
  onDrop: (result: DragDropResult) => void;
  renderItem: (item: DragDropItem, isDragging?: boolean) => React.ReactNode;
  renderCategoryHeader?: (category: DragDropCategory) => React.ReactNode;
  isLoading?: boolean;
  className?: string;
  emptyMessage?: string;
  /** When true, blocks drops when category.items.length >= maxItems. Default false (cap is display-only). */
  enforceMaxItems?: boolean;
}

interface DraggableRowProps {
  item: DragDropItem;
  renderItem: (item: DragDropItem, isDragging?: boolean, listeners?: any) => React.ReactNode;
}

const DraggableRow: React.FC<DraggableRowProps> = ({ item, renderItem }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: item.id,
    data: item,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing hover:bg-surface-light ${isDragging ? 'opacity-0' : ''}`}
    >
      <td className="px-4 py-3 text-sm font-medium text-text">
        {renderItem(item, isDragging, listeners)}
      </td>
    </tr>
  );
};

interface DroppableCategoryProps {
  category: DragDropCategory;
  renderItem: (item: DragDropItem, isDragging?: boolean) => React.ReactNode;
  renderCategoryHeader?: (category: DragDropCategory) => React.ReactNode;
  expandedCategories: ExpandedCategories;
  toggleCategory: (categoryId: string) => void;
  emptyMessage: string;
}

const DroppableCategory: React.FC<DroppableCategoryProps> = ({
  category,
  renderItem,
  renderCategoryHeader,
  expandedCategories,
  toggleCategory,
  emptyMessage
}) => {
  const { setNodeRef: setHeaderNodeRef, isOver: isHeaderOver } = useDroppable({
    id: `${category.id}-header`,
    data: { categoryId: category.id }
  });
  
  const { setNodeRef: setItemsNodeRef, isOver: isItemsOver } = useDroppable({
    id: `${category.id}-items`,
    data: { categoryId: category.id }
  });
  
  const isOver = isHeaderOver || isItemsOver;
  const itemIds = category.items?.map(item => item.id) || [];

  return (
    <React.Fragment>
      {/* Category Header Row - Always droppable */}
      <tr 
        style={{ backgroundColor: 'transparent !important' }} 
        className="hover:bg-transparent"
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <td 
          colSpan={1} 
          className="px-4 py-3 hover:bg-transparent" 
          style={{ backgroundColor: 'transparent !important' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          ref={setHeaderNodeRef}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleCategory(category.id)}
                className={`flex items-center text-left font-medium text-text transition-all duration-200 ${
                  isOver ? 'font-bold' : ''
                }`}
                style={{ 
                  backgroundColor: 'transparent',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.border = 'none';
                  e.currentTarget.classList.add('font-bold');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.border = 'none';
                  e.currentTarget.classList.remove('font-bold');
                }}
              >
                {expandedCategories[category.id] ? (
                  <ExpandLessIcon className="w-5 h-5 mr-2" />
                ) : (
                  <ExpandMoreIcon className="w-5 h-5 mr-2" />
                )}
                {category.name} ({category.items?.length}
                {category.maxItems ? `/${category.maxItems}` : ''})
              </button>
              
              {/* Custom category header content - positioned next to squad name */}
              {renderCategoryHeader && renderCategoryHeader(category)}
            </div>
          </div>
          
          {/* Empty drop zone when category is empty */}
          {category.items?.length === 0 && expandedCategories[category.id] && (
            <div className={`mt-2 text-center py-4 text-text-muted border-2 border-dashed rounded-lg transition-colors ${
              isOver ? 'border-primary bg-surface-light' : 'border-border'
            }`}>
              <p>{emptyMessage}</p>
            </div>
          )}
        </td>
      </tr>
      
      {/* Category Items Container - Always droppable when expanded */}
      {expandedCategories[category.id] && (
        <tr>
          <td colSpan={1} className="p-0">
            <div 
              ref={setItemsNodeRef}
              className={`transition-colors ${isOver ? 'bg-surface-light' : ''}`}
            >
              {category.items && category.items.length > 0 ? (
                <table className="w-full">
                  <tbody>
                    {category.items.map((item) => (
                      <DraggableRow
                        key={item.id}
                        item={item}
                        renderItem={renderItem}
                      />
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={`text-center py-4 text-text-muted border-2 border-dashed rounded-lg transition-colors ${
                  isOver ? 'border-primary bg-surface-light' : 'border-border'
                }`}>
                  <p>{emptyMessage}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

const DragDropCategorizedTable: React.FC<DragDropCategorizedTableProps> = ({
  categories,
  onDrop,
  renderItem,
  renderCategoryHeader,
  isLoading = false,
  className = '',
  emptyMessage = 'No items',
  enforceMaxItems = false,
}) => {
  const [activeItem, setActiveItem] = useState<DragDropItem | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<ExpandedCategories>({});
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );


  // Initialize expanded categories
  useEffect(() => {
    if (categories.length > 0 && Object.keys(expandedCategories).length === 0) {
      const initialExpanded: ExpandedCategories = {};
      categories.forEach(category => {
        initialExpanded[category.id] = true;
      });
      setExpandedCategories(initialExpanded);
    }
  }, [categories, expandedCategories]);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveItem(active.data.current as DragDropItem);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    
    const { active, over } = event;
    setActiveItem(null);

    if (!over) {
      return;
    }

    const activeItem = active.data.current as DragDropItem;
    let overCategoryId: string;

    // Extract category ID from droppable data
    if (over.data?.current?.categoryId) {
      overCategoryId = over.data.current.categoryId;
    } else if (over.id.toString().includes('-header') || over.id.toString().includes('-items')) {
      // Extract category ID from droppable zone ID
      overCategoryId = over.id.toString().replace('-header', '').replace('-items', '');
    } else {
      // Fallback: try to extract from ID (for backward compatibility)
      overCategoryId = over.id as string;
    }


    if (!overCategoryId) {
      return;
    }

    // Find which category the active item is currently in
    const fromCategory = categories.find(cat => 
      cat.items && cat.items.some(item => item.id === activeItem.id)
    );

    if (!fromCategory) {
      return;
    }

    // If dropping in the same category, do nothing
    if (fromCategory.id === overCategoryId) {
      return;
    }

    const toCategory = categories.find(cat => cat.id === overCategoryId);
    if (
      enforceMaxItems &&
      toCategory?.maxItems &&
      toCategory.items &&
      toCategory.items.length >= toCategory.maxItems
    ) {
      return;
    }

    // Execute the drop
    
    onDrop({
      item: activeItem,
      fromCategoryId: fromCategory.id,
      toCategoryId: overCategoryId,
    });
    
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loading size="large" />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[]}
      >
        <div className="bg-surface rounded-lg shadow border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-light">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Participant
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {categories.map((category) => (
                                        <DroppableCategory
                        key={category.id}
                        category={category}
                        renderItem={renderItem}
                        renderCategoryHeader={renderCategoryHeader}
                        expandedCategories={expandedCategories}
                        toggleCategory={toggleCategory}
                        emptyMessage={emptyMessage}
                      />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {createPortal(
          <DragOverlay>
            {activeItem && (
              <div className="bg-surface rounded shadow border border-border" style={{
                width: '300px',
                height: 'auto',
                minHeight: '40px',
                maxHeight: '60px',
                overflow: 'hidden',
                boxSizing: 'border-box',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                cursor: 'grabbing',
              }}>
                {renderItem(activeItem, true)}
              </div>
            )}
          </DragOverlay>,
          document.body
        )}

      </DndContext>
    </div>
  );
};

export default DragDropCategorizedTable; 