export { MultiCaptureCamera } from './MultiCaptureCamera';
export { MultiCaptureModal } from './MultiCaptureModal';
export {
  appendWithinLimit,
  canReserveCapture,
  formatDuration,
  normalizeCaptureAsset,
  toFilePath,
  toFileUri,
} from './core/assets';
export {
  defaultStrings,
  defaultTheme,
  enStrings,
  multiCaptureLocales,
  zhCNStrings,
} from './defaults';
export type {
  CaptureAsset,
  CaptureAssetInput,
  CaptureAssetType,
  CaptureCameraPosition,
  CaptureCameraProps,
  CaptureCloseContext,
  CaptureFlashMode,
  CaptureLibraryContext,
  CaptureMediaType,
  CaptureMode,
  CaptureRenderAssetContext,
  MultiCaptureCameraProps,
  MultiCaptureCameraRef,
  MultiCaptureError,
  MultiCaptureErrorCode,
  MultiCaptureLocale,
  MultiCaptureModalProps,
  MultiCaptureStrings,
  MultiCaptureTheme,
} from './types';
