/** Logs only in Vite dev; no-op in production builds. */
const isDev = import.meta.env.DEV;

export function devLog(...args: unknown[]): void {
  if (isDev) {
    // eslint-disable-next-line no-console -- dev-only sink
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

export function devError(...args: unknown[]): void {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}
