import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RuntimeContextBase } from '@notlm/core';
import { createLocalStorageMissLogTransport } from '@notlm/core';
import {
  NotLMHost,
  createGuideNavigate,
  readDraft,
  useDraftBridge,
  useGuideModal,
  useNotLM,
} from '@notlm/react';
import {
  createHybridUtteranceParser,
  createRankerSession,
  isOnnxRankerEnabled,
  type RankerModelJson,
} from '@notlm/ranker';
import { loadDemoTodoPack } from './loadDemoPack';
import rankerJson from '../../../packs/demo-todo/.notlm/pack/ranker.json';

type TodoList = { id: string; name: string };
type TodoItem = { id: string; listId: string; text: string; done: boolean };
type ContextBag = {
  listCount: number;
  itemCount: number;
  completedCount: number;
  hasLists: boolean;
  lists: Array<{ id: string; name: string }>;
  labTab: 'details' | 'files';
  labExported: boolean;
  labUploaded: boolean;
  labPriority: string;
  labCleared: boolean;
  labDrawerOpen: boolean;
  wizardPage: number;
  wizardDone: boolean;
};

let idSeq = 0;
function nextId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

const emptyBag = (): ContextBag => ({
  listCount: 0,
  itemCount: 0,
  completedCount: 0,
  hasLists: false,
  lists: [],
  labTab: 'details',
  labExported: false,
  labUploaded: false,
  labPriority: '',
  labCleared: false,
  labDrawerOpen: false,
  wizardPage: 0,
  wizardDone: false,
});

function InteractablesLab({
  bagRef,
  pendingModal,
  clearModal,
}: {
  bagRef: React.MutableRefObject<ContextBag>;
  pendingModal: string | null;
  clearModal: () => void;
}) {
  const { notifyStepCompleted } = useNotLM();
  const [tab, setTab] = useState<'details' | 'files'>('details');
  const [menuOpen, setMenuOpen] = useState(false);
  const [priority, setPriority] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wizardPage, setWizardPage] = useState(0);
  const { draft, patchDraft, clear: clearWizardDraft } = useDraftBridge(
    'demo-todo',
    'wizard_draft'
  );
  const wizardName = String(draft.name ?? '');

  const patchBag = (partial: Partial<ContextBag>) => {
    bagRef.current = { ...bagRef.current, ...partial };
  };

  useEffect(() => {
    if (pendingModal !== 'lab_drawer') return;
    setDrawerOpen(true);
    patchBag({ labDrawerOpen: true });
    clearModal();
    queueMicrotask(() => notifyStepCompleted('open_lab_drawer'));
  }, [pendingModal, clearModal, notifyStepCompleted, bagRef]);

  return (
    <section className="demo-panel" data-guide-id="guide-nav-lab">
      <h2>Interactables lab</h2>
      <div className="demo-row">
        <button
          type="button"
          data-guide-id="guide-tab-details"
          aria-pressed={tab === 'details'}
          onClick={() => {
            setTab('details');
            patchBag({ labTab: 'details' });
          }}
        >
          Details
        </button>
        <button
          type="button"
          data-guide-id="guide-tab-files"
          aria-pressed={tab === 'files'}
          onClick={() => {
            setTab('files');
            patchBag({ labTab: 'files' });
            queueMicrotask(() => notifyStepCompleted('open_files_tab'));
          }}
        >
          Files
        </button>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            data-guide-id="guide-menu-actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            Actions
          </button>
          {true && (
            <button
              type="button"
              data-guide-id="guide-menu-export"
              hidden={!menuOpen}
              onClick={() => {
                setMenuOpen(false);
                patchBag({ labExported: true });
                queueMicrotask(() => notifyStepCompleted('export_via_menu'));
              }}
            >
              Export
            </button>
          )}
        </div>
        <button
          type="button"
          data-guide-id="guide-open-drawer"
          onClick={() => {
            setDrawerOpen(true);
            patchBag({ labDrawerOpen: true });
            queueMicrotask(() => notifyStepCompleted('open_lab_drawer'));
          }}
        >
          Open drawer
        </button>
        <button
          type="button"
          data-guide-id="guide-lab-clear"
          onClick={() => setDialogOpen(true)}
        >
          Clear lab
        </button>
      </div>

      {tab === 'details' && (
        <div className="demo-row">
          <label>
            Priority
            <select
              data-guide-id="guide-priority"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                patchBag({ labPriority: e.target.value });
                if (e.target.value) {
                  queueMicrotask(() => notifyStepCompleted('pick_priority'));
                }
              }}
            >
              <option value="">Choose…</option>
              <option value="low">Low</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
      )}

      {tab === 'files' && (
        <div className="demo-row">
          <input
            type="file"
            data-guide-id="guide-upload"
            aria-label="Upload attachment"
            onChange={(e) => {
              if (e.target.files?.length) {
                patchBag({ labUploaded: true });
                queueMicrotask(() => notifyStepCompleted('upload_attachment'));
              }
            }}
          />
        </div>
      )}

      <div className="demo-row">
        {wizardPage === 0 ? (
          <>
            <input
              data-guide-id="guide-wizard-name"
              aria-label="Wizard name"
              value={wizardName}
              onChange={(e) => patchDraft({ name: e.target.value })}
            />
            <button
              type="button"
              data-guide-id="guide-wizard-next"
              onClick={() => {
                setWizardPage(1);
                patchBag({ wizardPage: 1 });
                queueMicrotask(() => notifyStepCompleted('wizard_name'));
              }}
            >
              Next
            </button>
          </>
        ) : (
          <button
            type="button"
            data-guide-id="guide-wizard-finish"
            onClick={() => {
              patchBag({ wizardDone: true });
              clearWizardDraft();
              queueMicrotask(() => notifyStepCompleted('wizard_finish'));
            }}
          >
            Finish wizard
          </button>
        )}
      </div>

      {dialogOpen && (
        <div role="dialog" aria-label="Confirm clear" data-guide-id="guide-confirm-clear">
          <p>Clear lab flags?</p>
          <button
            type="button"
            onClick={() => {
              setDialogOpen(false);
              patchBag({
                labCleared: true,
                labExported: false,
                labUploaded: false,
                labPriority: '',
              });
              setPriority('');
              queueMicrotask(() => notifyStepCompleted('confirm_clear_lab'));
            }}
          >
            Confirm
          </button>
          <button type="button" onClick={() => setDialogOpen(false)}>
            Cancel
          </button>
        </div>
      )}

      {drawerOpen && (
        <aside className="demo-draft" data-guide-id="guide-lab-drawer-panel">
          <p>Lab drawer open.</p>
          <button type="button" onClick={() => setDrawerOpen(false)}>
            Close
          </button>
        </aside>
      )}
    </section>
  );
}

function TodoWorkspace({
  bagRef,
  pendingModal,
  clearModal,
}: {
  bagRef: React.MutableRefObject<ContextBag>;
  pendingModal: string | null;
  clearModal: () => void;
}) {
  const { notifyStepCompleted } = useNotLM();
  const [lists, setLists] = useState<TodoList[]>([]);
  const [items, setItems] = useState<TodoItem[]>([]);
  const listDraft = useDraftBridge('demo-todo', 'list_draft');
  const itemDraft = useDraftBridge('demo-todo', 'item_draft');
  const draftName = String(listDraft.draft.name ?? 'Shopping');
  const draftItem = String(itemDraft.draft.name ?? itemDraft.draft.text ?? 'Milk');

  const syncBag = (nextLists: TodoList[], nextItems: TodoItem[]) => {
    bagRef.current = {
      ...bagRef.current,
      listCount: nextLists.length,
      itemCount: nextItems.length,
      completedCount: nextItems.filter((i) => i.done).length,
      hasLists: nextLists.length > 0,
      lists: nextLists.map((l) => ({ id: l.id, name: l.name })),
    };
  };

  const activeListId = lists[0]?.id;

  const createList = () => {
    const fromDraft = readDraft('demo-todo', 'list_draft');
    const name =
      String(fromDraft.name ?? draftName).trim() || `List ${lists.length + 1}`;
    setLists((prev) => {
      const next = [...prev, { id: nextId('list'), name }];
      syncBag(next, items);
      queueMicrotask(() => notifyStepCompleted('create_list'));
      return next;
    });
  };

  const addItem = () => {
    if (!activeListId) return;
    const fromDraft = readDraft('demo-todo', 'item_draft');
    const text =
      String(fromDraft.text ?? fromDraft.name ?? draftItem).trim() ||
      `Item ${items.length + 1}`;
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
          Local <code>useState</code> + draft bridge — coach never fetches. Open chat or press{' '}
          <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd>.
        </p>
      </header>

      {lists.length === 0 && (
        <section className="demo-panel">
          <button
            type="button"
            data-guide-id="guide-empty-start"
            onClick={() => {
              listDraft.patchDraft({ name: 'Starter' });
              queueMicrotask(() => notifyStepCompleted('empty_start'));
            }}
          >
            Get started
          </button>
        </section>
      )}

      <section className="demo-panel">
        <h2>Lists</h2>
        <div className="demo-row">
          <input
            value={draftName}
            onChange={(e) => listDraft.patchDraft({ name: e.target.value })}
            aria-label="New list name"
            data-guide-id="guide-list-name"
          />
          <button type="button" data-guide-id="guide-create-list" onClick={createList}>
            Create list
          </button>
        </div>
        <ul>
          {lists.map((list) => (
            <li key={list.id} data-guide-id={`guide-list-row-${list.id}`}>
              {list.name}
            </li>
          ))}
          {lists.length === 0 && <li className="muted">No lists yet</li>}
        </ul>
      </section>

      <section className="demo-panel">
        <h2>Todos</h2>
        <div className="demo-row">
          <input
            value={draftItem}
            onChange={(e) => itemDraft.patchDraft({ text: e.target.value, name: e.target.value })}
            aria-label="New todo text"
            data-guide-id="guide-item-text"
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

      <InteractablesLab bagRef={bagRef} pendingModal={pendingModal} clearModal={clearModal} />
    </main>
  );
}

export function App() {
  const pack = useMemo(() => loadDemoTodoPack(), []);
  const bagRef = useRef<ContextBag>(emptyBag());
  const { pendingModal, openModal, clearModal } = useGuideModal();
  const onnxRanker = isOnnxRankerEnabled({
    onnxRanker:
      typeof import.meta !== 'undefined' &&
      (import.meta as { env?: { VITE_NOTLM_ONNX_RANKER?: string } }).env
        ?.VITE_NOTLM_ONNX_RANKER === '1',
  });
  const parseUtteranceFn = useMemo(() => {
    if (!onnxRanker) return undefined;
    const session = createRankerSession(rankerJson as RankerModelJson, {
      preferOnnx: true,
    });
    return createHybridUtteranceParser(session, { minProbability: 0.35 });
  }, [onnxRanker]);

  const getContext = useCallback((): RuntimeContextBase => {
    return { pathname: '/', data: { ...bagRef.current } };
  }, []);

  const navigate = useMemo(
    () =>
      createGuideNavigate({
        onMiss: (path) => console.warn(`[demo-todo] No control for path="${path}"`),
      }),
    []
  );

  const missLog = useMemo(
    () => ({
      transport: createLocalStorageMissLogTransport({
        key: 'notlm:demo-todo:misses',
        limit: 100,
      }),
      packId: 'demo-todo',
    }),
    []
  );

  return (
    <NotLMHost
      pack={pack}
      getContext={getContext}
      navigate={navigate}
      openModal={openModal}
      parseUtteranceFn={parseUtteranceFn}
      missLog={missLog}
      features={{
        chat: true,
        palette: true,
        spotlight: true,
        voice: true,
        onnxRanker,
      }}
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
              className="notlm-chat-close"
              onClick={onClose}
              aria-label="Close assistant"
            >
              ×
            </button>
          </div>
        ),
      }}
    >
      <TodoWorkspace bagRef={bagRef} pendingModal={pendingModal} clearModal={clearModal} />
    </NotLMHost>
  );
}
