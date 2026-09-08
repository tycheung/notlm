import { useCallback, useMemo, useRef, useState } from 'react';
import type { RuntimeContextBase } from '@uipilot/core';
import { UiPilotHost } from '@uipilot/react';
import { loadDemoCrmPack } from './loadDemoPack';
import { clickGuideByPath } from './navigateClick';

type Contact = { id: string; name: string; email: string };

let idSeq = 0;
function nextId() {
  idSeq += 1;
  return `contact-${idSeq}`;
}

export function App() {
  const pack = useMemo(() => loadDemoCrmPack(), []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const stateRef = useRef({ contacts, draftOpen });
  stateRef.current = { contacts, draftOpen };

  const getContext = useCallback((): RuntimeContextBase => {
    const { contacts: cs, draftOpen: open } = stateRef.current;
    return {
      pathname: '/',
      data: {
        contactCount: cs.length,
        draftOpen: open,
      },
    };
  }, []);

  const navigate = useCallback((path: string) => {
    clickGuideByPath(path);
  }, []);

  const addContact = () => {
    setDraftOpen(true);
    if (!name) setName('Alex Rivera');
    if (!email) setEmail('alex@example.com');
  };

  const saveContact = () => {
    if (!draftOpen) return;
    const trimmedName = name.trim() || 'Unnamed';
    const trimmedEmail = email.trim() || 'unknown@example.com';
    setContacts((prev) => [...prev, { id: nextId(), name: trimmedName, email: trimmedEmail }]);
    setDraftOpen(false);
    setName('');
    setEmail('');
  };

  return (
    <UiPilotHost
      pack={pack}
      getContext={getContext}
      navigate={navigate}
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
      <main className="demo-shell">
        <header className="demo-header">
          <h1>demo-crm</h1>
          <p>
            Second host app — same <code>UiPilotHost</code> pattern. Coach clicks
            buttons only; no CRM API calls.
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
                />
              </label>
              <label>
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Contact email"
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
    </UiPilotHost>
  );
}
