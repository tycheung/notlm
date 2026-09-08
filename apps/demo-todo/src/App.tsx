import { useCallback, useMemo, useRef, useState } from 'react';
import type { RuntimeContextBase } from '@uipilot/core';
import { UiPilotHost, useUiPilot } from '@uipilot/react';
import { loadDemoTodoPack } from './loadDemoPack';
import { clickGuideByPath } from './navigateClick';

type TodoList = { id: string; name: string };
type TodoItem = { id: string; listId: string; text: string; done: boolean };
type ContextBag = { listCount: number; itemCount: number; completedCount: number };

let idSeq = 0;
function nextId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

function TodoWorkspace({ bagRef }: { bagRef: React.MutableRefObject<ContextBag> }) {
  const { notifyStepCompleted } = useUiPilot();
  const [lists, setLists] = useState<TodoList[]>([]);
  const [items, setItems] = useState<TodoItem[]>([]);
  const [draftName, setDraftName] = useState('Shopping');
  const [draftItem, setDraftItem] = useState('Milk');

  const syncBag = (nextLists: TodoList[], nextItems: TodoItem[]) => {
    bagRef.current = {
      listCount: nextLists.length,
      itemCount: nextItems.length,
      completedCount: nextItems.filter((i) => i.done).length,
    };
  };

  const activeListId = lists[0]?.id;

  const createList = () => {
    const name = draftName.trim() || `List ${lists.length + 1}`;
    setLists((prev) => {
      const next = [...prev, { id: nextId('list'), name }];
      syncBag(next, items);
      queueMicrotask(() => notifyStepCompleted('create_list'));
      return next;
    });
  };

  const addItem = () => {
    if (!activeListId) return;
    const text = draftItem.trim() || `Item ${items.length + 1}`;
    setItems((prev) => {
      const next = [...prev, { id: nextId('item'), listId: activeListId, text, done: false }];
      syncBag(lists, next);
      queueMicrotask(() => notifyStepCompleted('add_item'));
      return next;
    });
  };

  const completeItem = () => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => !i.done);
      if (idx < 0) return prev;
      const next = prev.map((item, i) => (i === idx ? { ...item, done: true } : item));
      syncBag(lists, next);
      queueMicrotask(() => notifyStepCompleted('complete_item'));
      return next;
    });
  };

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <h1>demo-todo</h1>
        <p>
          Local <code>useState</code> only — coach never fetches. Open chat or press{' '}
          <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd>.
        </p>
      </header>

      <section className="demo-panel">
        <h2>Lists</h2>
        <div className="demo-row">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            aria-label="New list name"
          />
          <button type="button" data-guide-id="guide-create-list" onClick={createList}>
            Create list
          </button>
        </div>
        <ul>
          {lists.map((list) => (
            <li key={list.id}>{list.name}</li>
          ))}
          {lists.length === 0 && <li className="muted">No lists yet</li>}
        </ul>
      </section>

      <section className="demo-panel">
        <h2>Todos</h2>
        <div className="demo-row">
          <input
            value={draftItem}
            onChange={(e) => setDraftItem(e.target.value)}
            aria-label="New todo text"
            disabled={!activeListId}
          />
          <button
            type="button"
            data-guide-id="guide-add-item"
            onClick={addItem}
            disabled={!activeListId}
          >
            Add item
          </button>
          <button
            type="button"
            data-guide-id="guide-complete-item"
            onClick={completeItem}
            disabled={!items.some((i) => !i.done)}
          >
            Complete item
          </button>
        </div>
        <ul>
          {items.map((item) => (
            <li key={item.id} className={item.done ? 'done' : undefined}>
              {item.done ? '✓ ' : ''}
              {item.text}
            </li>
          ))}
          {items.length === 0 && <li className="muted">No items yet</li>}
        </ul>
      </section>
    </main>
  );
}

export function App() {
  const pack = useMemo(() => loadDemoTodoPack(), []);
  const bagRef = useRef<ContextBag>({ listCount: 0, itemCount: 0, completedCount: 0 });

  const getContext = useCallback((): RuntimeContextBase => {
    return { pathname: '/', data: { ...bagRef.current } };
  }, []);

  const navigate = useCallback((path: string) => {
    clickGuideByPath(path);
  }, []);

  return (
    <UiPilotHost
      pack={pack}
      getContext={getContext}
      navigate={navigate}
      features={{ chat: true, palette: true, spotlight: true, voice: true }}
      appearance={{
        accent: '#0f766e',
        accentSoft: '#5eead4',
        radius: '14px',
        font: '"Segoe UI", system-ui, sans-serif',
        fabOffsetBottom: '1.25rem',
        fabOffsetRight: '1.25rem',
      }}
      className="demo-todo-coach"
      classNames={{ chatHeader: 'demo-coach-header' }}
      components={{
        ChatHeader: ({ title, onClose, className }) => (
          <div className={className} data-testid="demo-coach-header">
            <span>{title} · demo-todo</span>
            <button
              type="button"
              className="uipilot-chat-close"
              onClick={onClose}
              aria-label="Close assistant"
            >
              ×
            </button>
          </div>
        ),
      }}
    >
      <TodoWorkspace bagRef={bagRef} />
    </UiPilotHost>
  );
}
