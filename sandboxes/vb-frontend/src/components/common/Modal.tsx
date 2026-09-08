import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from './CloseButton';
import SectionTitle from './SectionTitle';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'full';
  closeOnEsc?: boolean;
  closeOnOutsideClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
  /**
   * Classes for the main body wrapper around {children}.
   * Default: padded + flex-1 + vertical scroll so long content is never clipped.
   * Override only when you need a custom layout (e.g. nested scroll regions).
   */
  contentClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  closeOnEsc = true,
  closeOnOutsideClick = true,
  showCloseButton = true,
  className = '',
  contentClassName =
    'min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  /** Refs only — must NOT be in useEffect deps or every mousedown re-runs cleanup (body scroll flash, lost listeners). */
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  /** Ref so date-picker handling does not re-run the effect (same bug as mouseDown state). */
  const datePickerInteractionRef = useRef(false);
  /** Ignore outside-close briefly after open (e.g. click from React Flow that finishes after mount). */
  const ignoreOutsideCloseUntilRef = useRef(0);

  const handleModalClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle ESC key press and global event listeners
  useEffect(() => {
    if (!isOpen) return;

    ignoreOutsideCloseUntilRef.current = Date.now() + 400;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && closeOnEsc && e.key === 'Escape') {
        handleModalClose();
      }
    };
    
    // Global mousedown handler to track element even outside our component
    const handleGlobalMouseDown = (e: MouseEvent) => {
      mouseDownTargetRef.current = e.target;
      
      // Check if we clicked on a date picker element
      if (isDateTimePickerElement(e.target)) {
        datePickerInteractionRef.current = true;
      }
    };
    
    // Global mouseup handler
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!closeOnOutsideClick || !modalRef.current) {
        mouseDownTargetRef.current = null;
        return;
      }

      if (Date.now() < ignoreOutsideCloseUntilRef.current) {
        mouseDownTargetRef.current = null;
        return;
      }
      
      const mouseDownEl = mouseDownTargetRef.current;

      // If date picker was interacted with, don't close modal
      if (
        datePickerInteractionRef.current ||
        isDateTimePickerElement(e.target) ||
        isDateTimePickerElement(mouseDownEl)
      ) {
        mouseDownTargetRef.current = null;
        datePickerInteractionRef.current = false;
        return;
      }
      
      // Only consider it an outside click if both mousedown and mouseup occurred outside the modal
      const clickedOutside = !modalRef.current.contains(e.target as Node);
      const mouseDownOutside =
        mouseDownEl && !modalRef.current.contains(mouseDownEl as Node);
      
      if (clickedOutside && mouseDownOutside) {
        handleModalClose();
      }
      
      mouseDownTargetRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleGlobalMouseDown, true);
    document.addEventListener('mouseup', handleGlobalMouseUp, true);
    
    // Prevent scrolling when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleGlobalMouseDown, true);
      document.removeEventListener('mouseup', handleGlobalMouseUp, true);
      document.body.style.overflow = 'unset';
      mouseDownTargetRef.current = null;
    };
  }, [isOpen, closeOnEsc, closeOnOutsideClick, handleModalClose]);

  // Helper function to check if an element is a DateTimePicker popover or part of one
  const isDateTimePickerElement = (element: any): boolean => {
    if (!element) return false;
    
    try {
      // Check if element is a DOM element with classList
      if (typeof element !== 'object' || !element.classList) return false;
      
      // Check if this element or any parent has MUI popover classes
      let currentElement = element;
      let depth = 0; // Prevent infinite loops
      
      while (currentElement && depth < 20) {
        depth++;
        
        // Check if currentElement has classList and the relevant classes
        if (currentElement.classList && typeof currentElement.classList.contains === 'function') {
          if (
            currentElement.classList.contains('MuiPopover-root') ||
            currentElement.classList.contains('MuiPaper-root') ||
            currentElement.classList.contains('MuiPickersPopper-root') ||
            currentElement.classList.contains('MuiPickersPopper-paper') ||
            currentElement.classList.contains('MuiPicker-root') ||
            currentElement.classList.contains('MuiPickersLayoutRoot') ||
            currentElement.classList.contains('MuiPickersFadeTransitionGroup-root') ||
            currentElement.classList.contains('MuiDateTimePickerToolbar-root') ||
            (currentElement.getAttribute && 
             currentElement.getAttribute('role') === 'dialog' && 
             currentElement.getAttribute('aria-modal') === 'true')
          ) {
            return true;
          }
        }
        
        // Safely try to get the parent element
        currentElement = currentElement.parentElement || null;
      }
    } catch (err) {
      // If any errors occur during the check, we'll ignore them and return false
      console.error('Error checking for datetime picker element:', err);
      return false;
    }
    
    return false;
  };

  // Size styles
  const sizeStyles = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    xlarge: 'max-w-6xl',
    full: 'max-w-full mx-4',
  };

  if (!isOpen) return null;

  /** Portal to body so fixed positioning is not clipped or covered by ancestor transforms / stacking. */
  const root =
    typeof document !== 'undefined' ? document.body : null;
  if (!root) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] overflow-y-auto"
      role="presentation"
    >
      {/* Scrim fills viewport; must stay below the dialog in paint order */}
      <div className="absolute inset-0 bg-black/70 transition-opacity" aria-hidden />

      {/* Flex centering avoids inline-block + sm:block bugs that can yield a 0-size or off-screen panel */}
      <div className="relative z-10 flex min-h-full items-end sm:items-center justify-center px-0 py-0 sm:px-6 sm:py-8">
        <div
          ref={modalRef}
          className={`relative flex min-h-0 w-full max-h-[95vh] sm:max-h-[90vh] flex-col overflow-hidden text-left bg-surface rounded-t-2xl sm:rounded-card shadow-xl border border-border ${sizeStyles[size]} ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <div className="flex shrink-0 items-center justify-between px-5 py-5 border-b border-border">
              {title && (
                <SectionTitle size="medium" as="h3" id="modal-headline">
                  {title}
                </SectionTitle>
              )}

              {showCloseButton && (
                <CloseButton
                  onClick={handleModalClose}
                  aria-label="Close modal"
                />
              )}
            </div>
          )}

          <div className={contentClassName}>{children}</div>

          {footer && (
            <div className="shrink-0 px-5 py-5 bg-surface border-t border-border">{footer}</div>
          )}
        </div>
      </div>
    </div>,
    root
  );
};

export default Modal;
