import { useCallback, useMemo, useRef, useState } from 'react';
import type { RuntimeContextBase } from '@uipilot/core';
import { UiPilotHost } from '@uipilot/react';
import { loadDemoTodoPack } from './loadDemoPack';
import { clickGuideByPath } from './navigateClick';

type TodoList = { id: string; name: string };
type TodoItem = { id: string; listId: string; text: string; done: boolean };

let idSeq = 0;
function nextId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

export function App() {
  const pack = useMemo(() => loadDemoTodoPack(), []);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [items, setItems] = useState<TodoItem[]>([]);
  const [draftName, setDraftName] = useState('Shopping');
  const [draftItem, setDraftItem] = useState('Milk');

  const stateRef = useRef({ lists, items });
  stateRef.current = { lists, items };

  const getContext = useCallback((): RuntimeContextBase => {
    const { lists: ls, items: its } = stateRef.current;
    return {
      pathname: '/',
      data: {
        listCount: ls.length,
        itemCount: its.length,
        completedCount: its.filter((i) => i.done).length,
      },
    };
  }, []);

  const navigate = useCallback((path: string) => {
    // Host wiring for executeStep → UI-actions only (.click on guide control).
    clickGuideByPath(path);
  }, []);

  const activeListId = lists[0]?.id;

  const createList = () => {
    const name = draftName.trim() || `List ${lists.length + 1}`;
    setLists((prev) => [...prev, { id: nextId('list'), name }]);
  };

  const addItem = () => {
    if (!activeListId) return;
    const text = draftItem.trim() || `Item ${items.length + 1}`;
    setItems((prev) => [
      ...prev,
      { id: nextId('item'), listId: activeListId, text, done: false },
    ]);
  };

  const completeItem = () => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => !i.done);
      if (idx < 0) return prev;
      return prev.map((item, i) => (i === idx ? { ...item, done: true } : item));
    });
  };

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
            <button
              type="button"
              data-guide-id="guide-create-list"
              onClick={createList}
            >
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
    </UiPilotHost>
  );
}
