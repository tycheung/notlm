/**
 * Save a Blob to disk.
 *
 * Always uses a unique filename (timestamp). That avoids Chrome’s broken
 * overwrite-via-download behavior and Excel file locks — we never replace an
 * existing open file.
 */

export type DownloadBlobResult =
  | { status: 'saved'; filename: string }
  | { status: 'cancelled' };

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
    excludeAcceptAllOption?: boolean;
  }) => Promise<FileSystemFileHandle>;
};

function acceptTypesForFilename(filename: string): Array<{
  description: string;
  accept: Record<string, string[]>;
}> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) {
    return [
      {
        description: 'CSV',
        accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
      },
    ];
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return [
      {
        description: 'HTML',
        accept: { 'text/html': ['.html', '.htm'] },
      },
    ];
  }
  return [];
}

async function assertBlobLooksDownloadable(blob: Blob): Promise<void> {
  if (!blob || blob.size <= 0) {
    throw new Error(
      'Download was empty. Try again, or sign in again if your session expired.'
    );
  }
  const type = (blob.type || '').toLowerCase();
  if (
    type.includes('application/json') ||
    type.includes('text/html') ||
    type.includes('application/problem')
  ) {
    let message = 'Download failed.';
    try {
      const text = await blob.text();
      const parsed = JSON.parse(text) as {
        error?: string;
        message?: string;
        detail?: unknown;
      };
      if (typeof parsed.error === 'string' && parsed.error.trim()) {
        message = parsed.error;
      } else if (typeof parsed.message === 'string' && parsed.message.trim()) {
        message = parsed.message;
      } else if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
        message = parsed.detail;
      }
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
}

/** Map low-level FS errors to a clear message. */
export function formatFileSaveError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  const raw =
    err instanceof Error && err.message
      ? err.message
      : typeof err === 'string'
        ? err
        : '';
  const lower = `${name} ${raw}`.toLowerCase();

  const looksLocked =
    name === 'NoModificationAllowedError' ||
    name === 'InvalidStateError' ||
    name === 'NotReadableError' ||
    /in use|being used|sharing|locked|access is denied|access denied|cannot access|ebusy|eperm|eacces|no modification|exclusive/i.test(
      lower
    );

  if (looksLocked) {
    return (
      'Could not save — that file is open in another program (often Excel). ' +
      'Close it, or keep the suggested new filename and save again.'
    );
  }

  if (name === 'NotAllowedError' || /permission|denied/i.test(lower)) {
    return 'Permission to save that file was denied. Choose a different location or allow write access.';
  }

  if (raw.trim()) return raw.trim();

  return 'Could not save the file. Try again with the suggested new filename.';
}

function uniqueFilename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    'T',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  if (dot <= 0) return `${filename}-${stamp}`;
  return `${filename.slice(0, dot)}-${stamp}${filename.slice(dot)}`;
}

function saveWithAnchorDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function writeToFileHandle(
  handle: FileSystemFileHandle,
  blob: Blob
): Promise<void> {
  let writable: FileSystemWritableFileStream;
  try {
    writable = await handle.createWritable({ keepExistingData: false });
  } catch (err) {
    throw new Error(formatFileSaveError(err));
  }
  try {
    await writable.write(await blob.arrayBuffer());
    await writable.close();
  } catch (err) {
    try {
      await writable.abort();
    } catch {
      /* ignore */
    }
    throw new Error(formatFileSaveError(err));
  }
}

/**
 * Open Save dialog (unique suggested name), load blob, write.
 * Never relies on overwriting a file that may be open in Excel.
 */
export async function downloadBlobFromLoader(
  filename: string,
  loadBlob: () => Promise<Blob>
): Promise<DownloadBlobResult> {
  const saveAs = uniqueFilename(filename);
  const w = window as SavePickerWindow;

  if (typeof w.showSaveFilePicker === 'function') {
    let handle: FileSystemFileHandle;
    try {
      handle = await w.showSaveFilePicker({
        suggestedName: saveAs,
        types: acceptTypesForFilename(filename),
        excludeAcceptAllOption: false,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { status: 'cancelled' };
      }
      const blob = await loadBlob();
      await assertBlobLooksDownloadable(blob);
      saveWithAnchorDownload(blob, saveAs);
      return { status: 'saved', filename: saveAs };
    }

    const blob = await loadBlob();
    await assertBlobLooksDownloadable(blob);
    await writeToFileHandle(handle, blob);
    return { status: 'saved', filename: handle.name || saveAs };
  }

  const blob = await loadBlob();
  await assertBlobLooksDownloadable(blob);
  saveWithAnchorDownload(blob, saveAs);
  return { status: 'saved', filename: saveAs };
}

/** Save an already-loaded blob (e.g. HTML report built client-side). */
export async function downloadBlob(
  blob: Blob,
  filename: string
): Promise<DownloadBlobResult> {
  return downloadBlobFromLoader(filename, async () => blob);
}
