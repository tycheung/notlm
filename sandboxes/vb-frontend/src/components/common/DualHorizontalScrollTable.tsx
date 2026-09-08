import React, { useEffect, useRef, useState } from 'react';

type DualHorizontalScrollTableProps = {
  children: React.ReactNode;
  /** Keep the top scrollbar visible while the page scrolls vertically. */
  stickyTop?: boolean;
  /**
   * Cap the table body height so rows scroll under a sticky header.
   * Example: `calc(100dvh - 14rem)` or `70vh`.
   */
  bodyMaxHeight?: string;
  className?: string;
};

/**
 * Dual horizontal scrollbars (top + bottom) so wide tables stay usable
 * without scrolling to the bottom to pan sideways.
 */
const DualHorizontalScrollTable: React.FC<DualHorizontalScrollTableProps> = ({
  children,
  stickyTop = false,
  bodyMaxHeight,
  className,
}) => {
  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const syncing = useRef(false);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const updateWidth = () => setScrollWidth(content.scrollWidth);
    updateWidth();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(content);
    return () => observer.disconnect();
  }, [children]);

  const syncFrom = (source: 'top' | 'bottom') => {
    if (syncing.current || !topRef.current || !bottomRef.current) return;
    syncing.current = true;
    if (source === 'top') {
      bottomRef.current.scrollLeft = topRef.current.scrollLeft;
    } else {
      topRef.current.scrollLeft = bottomRef.current.scrollLeft;
    }
    syncing.current = false;
  };

  return (
    <div className={className}>
      <div
        className={
          stickyTop
            ? 'sticky top-0 z-20 border-b border-border bg-surface'
            : undefined
        }
      >
        <div
          ref={topRef}
          className="overflow-x-auto overflow-y-hidden"
          onScroll={() => syncFrom('top')}
          aria-label="Top horizontal scroll"
        >
          <div style={{ width: scrollWidth || undefined, height: 1 }} />
        </div>
      </div>
      <div
        ref={bottomRef}
        className={bodyMaxHeight ? 'overflow-auto' : 'overflow-x-auto'}
        style={bodyMaxHeight ? { maxHeight: bodyMaxHeight } : undefined}
        onScroll={() => syncFrom('bottom')}
      >
        <div ref={contentRef}>{children}</div>
      </div>
    </div>
  );
};

export default DualHorizontalScrollTable;
