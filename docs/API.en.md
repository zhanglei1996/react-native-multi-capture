# API Reference

[简体中文](API.zh-CN.md) | [English](API.en.md)

## MultiCaptureModal

`MultiCaptureModal` is the recommended entry point. It wraps
`MultiCaptureCamera` in a native React Native `Modal` and routes the Android
back button through the same guarded close flow.

```tsx
<MultiCaptureModal
  visible={visible}
  onDone={handleDone}
  onCancel={handleCancel}
/>
```

It accepts every `MultiCaptureCamera` prop plus `visible` and `modalProps`.

### Modal-only props

| Prop | Type | Description |
| --- | --- | --- |
| `visible` | `boolean` | Controlled visibility; the camera subtree is unmounted when false |
| `modalProps` | `Omit<ModalProps, ...>` | Safe React Native Modal props |

`presentationStyle` is fixed to `fullScreen`, and the component owns
`onRequestClose`.

## MultiCaptureCamera

### Capture configuration

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `maxAssets` | `number` | `10` | Shared completed/pending limit; minimum 1 |
| `mediaType` | `'photo' \| 'video' \| 'mixed'` | `'photo'` | Allowed capture types |
| `initialMode` | `'photo' \| 'video'` | `'photo'` | Initial mixed-mode tab; forced to video in video mode |
| `initialCameraPosition` | `'front' \| 'back'` | `'back'` | Initial camera device |
| `initialAssets` | `readonly CaptureAssetInput[]` | `[]` | Existing session assets |
| `enableAudio` | `boolean` | `false` | Record video audio; makes microphone permission required |
| `isActive` | `boolean` | `true` | Additional session activity switch |
| `maxVideoDuration` | `number` | - | Maximum seconds per video |
| `maxVideoFileSize` | `number` | - | Maximum bytes per video |
| `showFlashControl` | `boolean` | `true` | Show flash when the back device supports it |
| `showCaptureCount` | `boolean` | `false` | Show current count and limit in the header |
| `enableZoomGesture` | `boolean` | `true` | VisionCamera native pinch zoom |
| `enableTapToFocus` | `boolean` | `true` | Tap focus and focus-box animation when supported |
| `enableHaptics` | `boolean` | `false` | Light shutter feedback |
| `enablePreview` | `boolean` | `true` | Built-in full-screen media preview |
| `enableLibraryPicker` | `boolean` | `true` | System library entry and latest thumbnail |

Android hosts using built-in haptics must declare `VIBRATE`. Provide
`onHapticFeedback` to use the host's own implementation instead.

The component also observes AppState. The VisionCamera session is active only
when `isActive` is true, the app is foregrounded, permissions are granted, and
a camera device exists.

### VisionCamera configuration

| Prop | Type | Description |
| --- | --- | --- |
| `photoOutputOptions` | `Partial<PhotoOutputOptions>` | Passed to `usePhotoOutput` |
| `videoOutputOptions` | `Partial<VideoOutputOptions>` | Passed to `useVideoOutput` |
| `photoCaptureSettings` | `CapturePhotoSettings \| (flash) => CapturePhotoSettings` | Per-photo settings |
| `recorderSettings` | `RecorderSettings` | Used to create each Recorder |
| `cameraProps` | `CaptureCameraProps` | Controlled Camera props and lifecycle callbacks |

The component owns `device`, `outputs`, `isActive`, gestures, and Camera error
handling; these keys cannot be replaced through `cameraProps`.

Top-level `maxVideoDuration` and `maxVideoFileSize` take precedence over the
same values in `recorderSettings`.

### Permissions

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `autoRequestPermissions` | `boolean` | `true` | Request required permissions on first mount |

Permanently denied camera/microphone states expose `Linking.openSettings()`.
The library button remains available so users can select and complete assets
without granting camera access.

The latest-photo thumbnail uses `NSPhotoLibraryUsageDescription` on iOS,
`READ_MEDIA_IMAGES` on Android 33+, and `READ_EXTERNAL_STORAGE` on older
Android versions. Denying this optional read access only restores the default
icon; the system picker continues to work.

### Library and processing adapters

#### openLibrary

No adapter is required by default. The component opens the system picker,
limits selection to `remaining`, and opens the configured preview after a
successful selection. `enableLibraryPicker={false}` hides every library entry.

Override the built-in picker with:

```ts
type OpenLibrary = (context: {
  assets: readonly CaptureAsset[];
  remaining: number;
  mediaType: 'photo' | 'video' | 'mixed';
}) => Promise<readonly CaptureAssetInput[] | null>;
```

- Return `null` when the user cancels.
- Results beyond `remaining` are truncated and report `limit-reached`.
- Assets incompatible with `mediaType` are ignored.
- Every accepted library asset also passes through `processAsset`.

#### processAsset

```ts
type ProcessAsset = (
  asset: CaptureAsset,
  context: {
    index: number;
    assets: readonly CaptureAsset[];
  }
) => Promise<CaptureAsset>;
```

Use it for compression, watermarks, dimensions, hashes, or relocation into
application-owned storage. A thrown error prevents that asset from being added
and reports `asset-processing-failed`.

### Callbacks

| Prop | Type | Description |
| --- | --- | --- |
| `onAssetsChange` | `(assets) => void` | Called after a successful addition or removal |
| `onDone` | `(assets) => void \| Promise<void>` | Required; called after the photo chain settles |
| `onCancel` | `(assets) => void` | Required; called after dismissal is allowed |
| `onRequestClose` | `(context) => boolean \| Promise<boolean>` | Return whether dismissal is allowed |
| `onError` | `(error: MultiCaptureError) => void` | Recoverable errors |
| `onHapticFeedback` | `() => void` | Host-provided shutter feedback |
| `onPreviewAsset` | `(asset, index) => void` | Replace built-in preview navigation |

If `onDone` throws or rejects, `completion-failed` is emitted and the component
stays mounted.

The built-in preview supports photos and videos with horizontal paging and
native video controls. The header completes the current asset set. The camera
pauses while previewing and resumes on close. `onPreviewAsset` takes precedence
over the built-in preview.

### UI customization

| Prop | Type | Description |
| --- | --- | --- |
| `locale` | `'zh-CN' \| 'en'` | Defaults to `zh-CN` |
| `strings` | `Partial<MultiCaptureStrings>` | Override selected localized strings |
| `theme` | `Partial<MultiCaptureTheme>` | Override color tokens |
| `renderAsset` | `(context) => ReactElement` | Replace thumbnail card content |
| `style` | `StyleProp<ViewStyle>` | Root container style |
| `testID` | `string` | Defaults to `multi-capture-camera` |

`renderAsset` replaces only card content; the component retains deletion and
layout behavior. `zhCNStrings`, `enStrings`, and `multiCaptureLocales` are
exported for integration with host localization systems.

## Imperative ref

```ts
interface MultiCaptureCameraRef {
  capture(): void;
  complete(): Promise<void>;
  requestClose(): Promise<void>;
  getAssets(): readonly CaptureAsset[];
}
```

```tsx
const cameraRef = useRef<MultiCaptureCameraRef>(null);

<MultiCaptureCamera ref={cameraRef} {...props} />;
```

Prefer the built-in UI and declarative callbacks for ordinary workflows. The
ref is intended for custom navigation, hardware buttons, or automation.

## CaptureAssetInput

Provide `path` or `uri` and a `type`:

```ts
type CaptureAssetInput = {
  id?: string;
  path?: string;
  uri?: string;
  type: 'photo' | 'video';
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  metadata?: Readonly<Record<string, unknown>>;
};
```

Safe defaults are generated when `id`, `fileName`, or `mimeType` is omitted.

## MultiCaptureError

```ts
interface MultiCaptureError {
  code: MultiCaptureErrorCode;
  message: string;
  cause?: unknown;
}
```

Error codes:

- `camera-unavailable`
- `permission-denied`
- `limit-reached`
- `photo-capture-failed`
- `recording-start-failed`
- `recording-stop-failed`
- `recording-failed`
- `asset-processing-failed`
- `library-picker-failed`
- `invalid-asset`
- `completion-failed`
- `close-failed`

Permission status is also rendered in the UI; denied system permissions are not
requested repeatedly.
