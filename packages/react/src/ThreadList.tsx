import type { ReactNode } from 'react';

export type ChatThread = {
  id: string;
  title?: string;
  updatedAt: number;
};

export type ThreadListProps = {
  threads: ChatThread[];
  activeThreadId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  newLabel?: string;
};

export function ThreadList({
  threads,
  activeThreadId,
  onSelect,
  onNew,
  newLabel = 'New chat',
}: ThreadListProps): ReactNode {
  if (threads.length <= 1) {
    return (
      <div className="notlm-thread-list" data-testid="notlm-thread-list">
        <button
          type="button"
          className="notlm-thread-new"
          onClick={onNew}
          data-testid="notlm-thread-new"
        >
          {newLabel}
        </button>
      </div>
    );
  }
  return (
    <div className="notlm-thread-list" data-testid="notlm-thread-list">
      <button
        type="button"
        className="notlm-thread-new"
        onClick={onNew}
        data-testid="notlm-thread-new"
      >
        {newLabel}
      </button>
      {threads.map((t) => (
        <button
          key={t.id}
          type="button"
          className={
            t.id === activeThreadId
              ? 'notlm-thread-item notlm-thread-item-active'
              : 'notlm-thread-item'
          }
          onClick={() => onSelect(t.id)}
          data-testid={`notlm-thread-${t.id}`}
        >
          {t.title?.trim() || 'Chat'}
        </button>
      ))}
    </div>
  );
}
