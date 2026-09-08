import { useState, useCallback } from 'react';

interface SelectionState {
  selectedItems: Set<string>;
  selectedCategories: Set<string>;
}

export const useSelectionState = () => {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedItems: new Set(),
    selectedCategories: new Set()
  });

  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectionState(prev => ({
      ...prev,
      selectedItems: new Set(
        prev.selectedItems.has(itemId)
          ? [...prev.selectedItems].filter(id => id !== itemId)
          : [...prev.selectedItems, itemId]
      )
    }));
  }, []);

  const toggleCategorySelection = useCallback((categoryId: string) => {
    setSelectionState(prev => ({
      ...prev,
      selectedCategories: new Set(
        prev.selectedCategories.has(categoryId)
          ? [...prev.selectedCategories].filter(id => id !== categoryId)
          : [...prev.selectedCategories, categoryId]
      )
    }));
  }, []);

  const selectAllInCategory = useCallback((categoryId: string, itemIds: string[]) => {
    setSelectionState(prev => ({
      ...prev,
      selectedItems: new Set([...prev.selectedItems, ...itemIds])
    }));
  }, []);

  const deselectAllInCategory = useCallback((categoryId: string, itemIds: string[]) => {
    setSelectionState(prev => ({
      ...prev,
      selectedItems: new Set([...prev.selectedItems].filter(id => !itemIds.includes(id)))
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState({
      selectedItems: new Set(),
      selectedCategories: new Set()
    });
  }, []);

  const isItemSelected = useCallback((itemId: string) => {
    return selectionState.selectedItems.has(itemId);
  }, [selectionState.selectedItems]);

  const isCategorySelected = useCallback((categoryId: string) => {
    return selectionState.selectedCategories.has(categoryId);
  }, [selectionState.selectedCategories]);

  const getSelectedCount = useCallback(() => {
    return selectionState.selectedItems.size;
  }, [selectionState.selectedItems]);

  const getSelectedItems = useCallback(() => {
    return Array.from(selectionState.selectedItems);
  }, [selectionState.selectedItems]);

  return {
    selectionState,
    toggleItemSelection,
    toggleCategorySelection,
    selectAllInCategory,
    deselectAllInCategory,
    clearSelection,
    isItemSelected,
    isCategorySelected,
    getSelectedCount,
    getSelectedItems
  };
};
