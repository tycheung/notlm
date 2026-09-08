import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RuntimeContextBase } from '@uipilot/core';
import { UiPilotHost, useGuideModal, useUiPilot } from '@uipilot/react';
import { loadDemoCrmPack } from './loadDemoPack';
import { clickGuideByPath } from './navigateClick';

type Contact = { id: string; name: string; email: string };
type ContextBag = { contactCount: number; draftOpen: boolean };

let idSeq = 0;
function nextId() {
  idSeq += 1;
  return `contact-${idSeq}`;
}

function CrmWorkspace({
  bagRef,
  pendingModal,
  clearModal,
}: {
  bagRef: React.MutableRefObject<ContextBag>;
  pendingModal: string | null;
  clearModal: () => void;
}) {
  const { notifyStepCompleted } = useUiPilot();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const syncBag = (nextContacts: Contact[], open: boolean) => {
    bagRef.current = { contactCount: nextContacts.length, draftOpen: open };
  };

  useEffect(() => {
    if (pendingModal !== 'contact_draft') return;
    setDraftOpen(true);
    bagRef.current = { ...bagRef.current, draftOpen: true };
    clearModal();
  }, [pendingModal, clearModal, bagRef]);

  const addContact = () => {
    setDraftOpen(true);
    if (!name) setName('Alex Rivera');
    if (!email) setEmail('alex@example.com');
    syncBag(contacts, true);
    queueMicrotask(() => notifyStepCompleted('add_contact'));
  };

  const saveContact = () => {
    if (!draftOpen) return;
    const trimmedName = name.trim() || 'Unnamed';
    const trimmedEmail = email.trim() || 'unknown@example.com';
    setContacts((prev) => {
      const next = [...prev, { id: nextId(), name: trimmedName, email: trimmedEmail }];
      syncBag(next, false);
      queueMicrotask(() => notifyStepCompleted('save_contact'));
      return next;
    });
    setDraftOpen(false);
    setName('');
    setEmail('');
  };

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <h1>demo-crm</h1>
        <p>
          Second host app — same <code>UiPilotHost</code> pattern. Coach clicks buttons only; no
          CRM API calls.
        </p>
      </header>

      <section className="demo-panel">
        <h2>Contacts</h2>
        <div className="demo-row">
          <button type="button" data-guide-id="guide-add-contact" onClick={addContact}>
            Add contact
          </button>
        </div>

        {draftOpen && (
          <div className="demo-draft">
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Contact name"
                data-guide-id="guide-contact-name"
              />
            </label>
            <label>
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Contact email"
                data-guide-id="guide-contact-email"
              />
            </label>
            <button type="button" data-guide-id="guide-save-contact" onClick={saveContact}>
              Save contact
            </button>
          </div>
        )}

        <ul>
          {contacts.map((c) => (
            <li key={c.id}>
              <strong>{c.name}</strong> — {c.email}
            </li>
          ))}
          {contacts.length === 0 && <li className="muted">No contacts yet</li>}
        </ul>
      </section>
    </main>
  );
}

export function App() {
  const pack = useMemo(() => loadDemoCrmPack(), []);
  const bagRef = useRef<ContextBag>({ contactCount: 0, draftOpen: false });
  const { pendingModal, openModal, clearModal } = useGuideModal();

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
      openModal={openModal}
      features={{ chat: true, palette: true, spotlight: true, voice: true }}
      appearance={{
        accent: '#b45309',
        accentSoft: '#fcd34d',
        radius: '10px',
        fabOffsetBottom: '1.25rem',
        fabOffsetRight: '1.25rem',
      }}
      className="demo-crm-coach"
    >
      <CrmWorkspace bagRef={bagRef} pendingModal={pendingModal} clearModal={clearModal} />
    </UiPilotHost>
  );
}
