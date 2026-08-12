import type { ReactElement } from 'react';
import type {
  CapturePhotoSettings,
  Constraint,
  PhotoOutputOptions,
  PreviewImplementationMode,
  PreviewResizeMode,
  RecorderSettings,
  VideoOutputOptions,
} from 'react-native-vision-camera';
import type { ModalProps, StyleProp, ViewStyle } from 'react-native';

export type CaptureMediaType = 'photo' | 'video' | 'mixed';
export type CaptureAssetType = 'photo' | 'video';
export type CaptureMode = 'photo' | 'video';
export type CaptureFlashMode = 'off' | 'on' | 'auto';
export type CaptureCameraPosition = 'front' | 'back';
export type MultiCaptureLocale = 'zh-CN' | 'en';

export interface CaptureAsset {
  /** Stable identifier used by the asset tray. */
  id: string;
  /** `file://` URI suitable for React Native's Image component and uploads. */
  uri: string;
  /** Raw filesystem path without a URI scheme. */
  path: string;
  type: CaptureAssetType;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  /**
   * Arbitrary data supplied by a picker or `processAsset`.
   * The library never reads or mutates this value.
   */
  metadata?: Readonly<Record<string, unknown>>;
}

export type CaptureAssetInput = Omit<
  CaptureAsset,
  'id' | 'uri' | 'path' | 'fileName' | 'mimeType'
> & {
  id?: string;
  uri?: string;
  path?: string;
  fileName?: string;
  mimeType?: string;
};

export type MultiCaptureErrorCode =
  | 'camera-unavailable'
  | 'permission-denied'
  | 'limit-reached'
  | 'photo-capture-failed'
  | 'recording-start-failed'
  | 'recording-stop-failed'
  | 'recording-failed'
  | 'asset-processing-failed'
  | 'library-picker-failed'
  | 'invalid-asset'
  | 'completion-failed'
  | 'close-failed';

export interface MultiCaptureError {
  code: MultiCaptureErrorCode;
  message: string;
  cause?: unknown;
}

export interface CaptureLibraryContext {
  assets: readonly CaptureAsset[];
  remaining: number;
  mediaType: CaptureMediaType;
}

export interface CaptureCloseContext {
  assets: readonly CaptureAsset[];
  isBusy: boolean;
}

export interface CaptureRenderAssetContext {
  asset: CaptureAsset;
  index: number;
  remove: () => void;
}

export interface CaptureCameraProps {
  constraints?: Constraint[];
  resizeMode?: PreviewResizeMode;
  implementationMode?: PreviewImplementationMode;
  enableLowLightBoost?: boolean;
  enableSmoothAutoFocus?: boolean;
  enableDistortionCorrection?: boolean;
  mirrorMode?: 'auto' | 'on' | 'off';
  orientationSource?: 'device' | 'interface' | 'custom';
  onConfigured?: () => void;
  onStarted?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

export interface MultiCaptureStrings {
  photoMode: string;
  videoMode: string;
  done: string;
  cancel: string;
  retake: string;
  openSettings: string;
  permissionTitle: string;
  cameraPermissionMessage: string;
  microphonePermissionMessage: string;
  cameraAndMicrophonePermissionMessage: string;
  requestPermission: string;
  cameraUnavailable: string;
  processing: string;
  stoppingRecording: string;
  maxReached: string;
  capturePhoto: string;
  startRecording: string;
  stopRecording: string;
  switchCamera: string;
  flash: string;
  openLibrary: string;
  selectFromLibrary: string;
  removeAsset: string;
  flashEnabled: string;
  flashDisabled: string;
  previewAsset: string;
  closePreview: string;
  previewLoadFailed: string;
  libraryPickerFailed: string;
}

export interface MultiCaptureTheme {
  backgroundColor: string;
  overlayColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  dangerColor: string;
  borderColor: string;
  focusColor: string;
}

export interface MultiCaptureCameraProps {
  maxAssets?: number;
  mediaType?: CaptureMediaType;
  initialMode?: CaptureMode;
  initialCameraPosition?: CaptureCameraPosition;
  initialAssets?: readonly CaptureAssetInput[];
  enableAudio?: boolean;
  autoRequestPermissions?: boolean;
  isActive?: boolean;
  maxVideoDuration?: number;
  maxVideoFileSize?: number;
  showFlashControl?: boolean;
  showCaptureCount?: boolean;
  enableZoomGesture?: boolean;
  enableTapToFocus?: boolean;
  enableHaptics?: boolean;
  /** Enables the built-in full-screen photo/video preview. */
  enablePreview?: boolean;
  /** Shows the built-in system photo-library picker. */
  enableLibraryPicker?: boolean;
  photoOutputOptions?: Partial<PhotoOutputOptions>;
  videoOutputOptions?: Partial<VideoOutputOptions>;
  photoCaptureSettings?:
    | CapturePhotoSettings
    | ((flashMode: CaptureFlashMode) => CapturePhotoSettings);
  recorderSettings?: RecorderSettings;
  cameraProps?: CaptureCameraProps;
  /** Overrides the built-in system photo-library picker. */
  openLibrary?: (
    context: CaptureLibraryContext
  ) => Promise<readonly CaptureAssetInput[] | null>;
  /**
   * Optional compression/upload-preparation hook. It runs inside the serialized
   * capture queue before the asset becomes visible.
   */
  processAsset?: (
    asset: CaptureAsset,
    context: { index: number; assets: readonly CaptureAsset[] }
  ) => Promise<CaptureAsset>;
  onAssetsChange?: (assets: readonly CaptureAsset[]) => void;
  onDone: (assets: readonly CaptureAsset[]) => void | Promise<void>;
  onCancel: (assets: readonly CaptureAsset[]) => void;
  onRequestClose?: (context: CaptureCloseContext) => boolean | Promise<boolean>;
  onError?: (error: MultiCaptureError) => void;
  onHapticFeedback?: () => void;
  /**
   * Overrides the built-in preview when supplied.
   * Useful when the host already has a media viewer.
   */
  onPreviewAsset?: (asset: CaptureAsset, index: number) => void;
  renderAsset?: (context: CaptureRenderAssetContext) => ReactElement;
  locale?: MultiCaptureLocale;
  strings?: Partial<MultiCaptureStrings>;
  theme?: Partial<MultiCaptureTheme>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface MultiCaptureCameraRef {
  capture: () => void;
  complete: () => Promise<void>;
  requestClose: () => Promise<void>;
  getAssets: () => readonly CaptureAsset[];
}

export interface MultiCaptureModalProps extends Omit<
  MultiCaptureCameraProps,
  'style'
> {
  visible: boolean;
  modalProps?: Omit<
    ModalProps,
    'visible' | 'onRequestClose' | 'children' | 'presentationStyle'
  >;
  style?: StyleProp<ViewStyle>;
}
