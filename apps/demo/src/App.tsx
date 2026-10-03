import { useCallback, useMemo, useRef, useState } from 'react';
import type { CoachEvent, RuntimeContextBase } from '@notlm/core';
import { NotLMHost, createGuideNavigate, useNotLM } from '@notlm/react';
import { loadDemoHelloPack } from './loadDemoPack';

type ContextBag = { helloCount: number };

function HelloWorkspace({ bagRef }: { bagRef: React.MutableRefObject<ContextBag> }) {
  const { notifyStepCompleted } = useNotLM();
  const [greeted, setGreeted] = useState(false);

  const sayHello = () => {
    setGreeted(true);
    bagRef.current = { helloCount: bagRef.current.helloCount + 1 };
    queueMicrotask(() => notifyStepCompleted('say_hello'));
  };

  return (
    <main>
      <header>
        <h1>demo-hello</h1>
        <p className="muted">Third-host proof — minimal NotLMHost wiring.</p>
      </header>
      <section className="demo-panel">
        <button type="button" data-guide-id="guide-hello" onClick={sayHello}>
          Say hello
        </button>
        {greeted && <p data-testid="hello-done">Hello from the host UI.</p>}
      </section>
    </main>
  );
}

export function App() {
  const pack = useMemo(() => loadDemoHelloPack(), []);
  const bagRef = useRef<ContextBag>({ helloCount: 0 });
  const eventsRef = useRef<CoachEvent[]>([]);

  const getContext = useCallback((): RuntimeContextBase => {
    return { pathname: '/', data: { ...bagRef.current } };
  }, []);

  const navigate = useMemo(() => createGuideNavigate(), []);

  return (
    <NotLMHost
      pack={pack}
      getContext={getContext}
      navigate={navigate}
      onCoachEvent={(e) => {
        eventsRef.current.push(e);
      }}
      features={{ chat: true, palette: true, spotlight: true, voice: true }}
      appearance={{ accent: '#0369a1' }}
      className="demo-hello-coach"
    >
      <HelloWorkspace bagRef={bagRef} />
    </NotLMHost>
  );
}

export const DEMO_STATUS = 'hello-host' as const;
export const DEMO_APPS = ['@notlm/demo-todo', '@notlm/demo-crm', '@notlm/demo'] as const;
