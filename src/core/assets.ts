import type {
  CaptureAsset,
  CaptureAssetInput,
  CaptureAssetType,
} from '../types';

let nextAssetSequence = 0;

function getExtension(path: string): string | undefined {
  const cleanPath = path.split(/[?#]/u)[0] ?? path;
  const fileName = cleanPath.split('/').pop();
  const extension = fileName?.includes('.')
    ? fileName.split('.').pop()
    : undefined;
  return extension?.toLowerCase();
}

function defaultFileName(path: string, type: CaptureAssetType): string {
  const cleanPath = path.split(/[?#]/u)[0] ?? path;
  const candidate = cleanPath.split('/').pop();
  if (candidate) {
    return candidate;
  }
  return type === 'photo' ? 'capture.jpg' : 'capture.mp4';
}

function defaultMimeType(path: string, type: CaptureAssetType): string {
  const extension = getExtension(path);
  if (type === 'photo') {
    if (extension === 'png') return 'image/png';
    if (extension === 'heic' || extension === 'heif') return 'image/heic';
    return 'image/jpeg';
  }
  if (extension === 'mov') return 'video/quicktime';
  return 'video/mp4';
}

export function toFileUri(path: string): string {
  if (/^[a-z][a-z\d+.-]*:\/\//iu.test(path)) {
    return path;
  }
  return `file://${path}`;
}

export function toFilePath(uriOrPath: string): string {
  return uriOrPath.startsWith('file://')
    ? uriOrPath.slice('file://'.length)
    : uriOrPath;
}

export function createAssetId(prefix = 'capture'): string {
  nextAssetSequence += 1;
  return `${prefix}-${Date.now()}-${nextAssetSequence}`;
}

export function normalizeCaptureAsset(input: CaptureAssetInput): CaptureAsset {
  const source = input.path ?? input.uri;
  if (!source) {
    throw new Error('Capture assets require either a path or uri.');
  }

  const path = toFilePath(source);
  const uri = input.uri ? toFileUri(input.uri) : toFileUri(path);

  return {
    ...input,
    id: input.id ?? createAssetId(input.type),
    path,
    uri,
    fileName: input.fileName || defaultFileName(path, input.type),
    mimeType: input.mimeType || defaultMimeType(path, input.type),
  };
}

export function appendWithinLimit(
  current: readonly CaptureAsset[],
  incoming: readonly CaptureAsset[],
  maxAssets: number
): CaptureAsset[] {
  const remaining = Math.max(0, maxAssets - current.length);
  return [...current, ...incoming.slice(0, remaining)];
}

export function canReserveCapture(
  assetCount: number,
  pendingCount: number,
  maxAssets: number
): boolean {
  return assetCount + pendingCount < maxAssets;
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
