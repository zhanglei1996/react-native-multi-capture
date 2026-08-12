# react-native-multi-capture

[简体中文](README.md) | [English](README.en.md)

A React Native multi-capture photo and video camera built on VisionCamera 5.
It is designed for inspections, work orders, evidence collection, attachments,
and other workflows that collect several media files in one session.

The component includes permission states, a system library picker, a latest
photo thumbnail, photo/video previews, capture limits, recording state, and a
final batch confirmation flow. The host only controls visibility and handles
the resulting files.

[Installation](#installation) · [Platform setup](#platform-setup) ·
[Quick start](#quick-start) · [Core props](#core-props) ·
[Advanced usage](#advanced-usage) · [Compatibility](#compatibility)

## Features

- Continuous photo capture with synchronous slot reservation and serialized
  native camera calls.
- `photo`, `video`, and `mixed` media modes.
- Built-in multi-select system library picker that respects the remaining limit
  and allowed media type.
- Full-screen photo/video preview with paging and direct completion, plus asset
  deletion from the thumbnail tray.
- Latest system photo as the library button thumbnail, with an icon fallback
  when read access is unavailable.
- Complete camera/microphone permission, permanently denied, and unavailable
  device states.
- Native BlurView camera switching that fades out after the new session starts.
- Tap to focus, native pinch zoom, flash control, and video duration/file-size
  limits.
- Built-in Chinese and English strings with theme, copy, thumbnail, and media
  processing extension points.
- Both a screen component and a controlled full-screen `Modal` component.

## Demo

| Screenshot | Animated demo (click for MP4) |
| --- | --- |
| <img src="https://raw.githubusercontent.com/zhanglei1996/react-native-multi-capture/main/docs/media/demo-cover.webp" alt="React Native Multi Capture screen" width="300" /> | [<img src="https://raw.githubusercontent.com/zhanglei1996/react-native-multi-capture/main/docs/media/demo.gif" alt="React Native Multi Capture demo" width="300" />](https://github.com/zhanglei1996/react-native-multi-capture/blob/main/docs/media/demo.mp4) |

The GIF plays directly in GitHub README. Click it to open the approximately
21-second MP4.

## Installation

```bash
yarn add react-native-multi-capture \
  @react-native-camera-roll/camera-roll \
  @react-native-community/blur \
  react-native-image-picker \
  react-native-vision-camera \
  react-native-nitro-modules \
  react-native-nitro-image \
  react-native-video@7.0.0-beta.10
```

Using npm:

```bash
npm install react-native-multi-capture \
  @react-native-camera-roll/camera-roll \
  @react-native-community/blur \
  react-native-image-picker \
  react-native-vision-camera \
  react-native-nitro-modules \
  react-native-nitro-image \
  react-native-video@7.0.0-beta.10
```

Install the iOS native dependencies:

```bash
npx pod-install
```

> `react-native-video` v7 is currently beta, but its Media3 version is
> compatible with VisionCamera 5. Rebuild the app after changing native
> dependencies or permissions; Metro reloads cannot install native changes.

## Platform setup

### iOS

Add the required keys to the host application's `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Capture photos and videos for work attachments</string>
<key>NSMicrophoneUsageDescription</key>
<string>Record sound in videos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Select photos and videos from the photo library</string>
```

- `NSCameraUsageDescription`: required.
- `NSMicrophoneUsageDescription`: required only when `enableAudio` is `true`.
- `NSPhotoLibraryUsageDescription`: used for library selection and the latest
  photo thumbnail.

### Android

Add the permissions you use to
`android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission
  android:name="android.permission.READ_EXTERNAL_STORAGE"
  android:maxSdkVersion="32" />
```

- `CAMERA`: required.
- `RECORD_AUDIO`: required only when `enableAudio` is `true`.
- Image read permission is used only for the latest-photo thumbnail. If it is
  denied, the component falls back to its default icon and the system Photo
  Picker still works.
- If Android `minSdkVersion < 30` and the project does not already include
  `androidx.activity:activity:1.9+`, enable the Photo Picker backport described
  by `react-native-image-picker`.

When `enableHaptics` is enabled without a custom `onHapticFeedback`, also add:

```xml
<uses-permission android:name="android.permission.VIBRATE" />
```

## Quick start

The controlled full-screen `MultiCaptureModal` is the recommended entry point:

```tsx
import { useState } from 'react';
import { Button } from 'react-native';
import {
  MultiCaptureModal,
  type CaptureAsset,
} from 'react-native-multi-capture';

export function WorkOrderCamera() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button title="Capture attachments" onPress={() => setVisible(true)} />

      <MultiCaptureModal
        visible={visible}
        mediaType="mixed"
        maxAssets={12}
        maxVideoDuration={30}
        onDone={async (assets: readonly CaptureAsset[]) => {
          await uploadWorkOrderFiles(assets);
          setVisible(false);
        }}
        onCancel={() => setVisible(false)}
      />
    </>
  );
}
```

`onDone` may return a Promise. Conflicting actions are locked while completion
is in progress. `enableAudio` defaults to `false`; pass it explicitly when
recorded video should include sound.

## Built-in flows

### Library picker and preview

The library entry point is enabled by default; no `openLibrary` adapter is
required:

- The system picker is configured from `mediaType` and the remaining limit.
- A successful selection automatically opens the full-screen preview.
- Photos use `contain`; videos autoplay and expose native playback controls.
- Swipe horizontally to inspect all assets in the current session.
- Complete the entire session directly from the preview header.
- Library selection remains available when camera permission is denied or no
  camera device exists.

Use `enableLibraryPicker={false}` to hide the library entry point and
`enablePreview={false}` to disable the built-in preview. If the host already
has a media viewer, provide `onPreviewAsset` to take over preview navigation.

### Permission states

`autoRequestPermissions` defaults to `true`. Required permissions are requested
on the first mount. A permanently denied state displays an Open Settings action.
Microphone access becomes required only when audio recording is enabled.

### Preventing accidental dismissal

Connect your own confirmation UI through `onRequestClose`:

```tsx
<MultiCaptureModal
  visible={visible}
  onRequestClose={async ({ assets, isBusy }) => {
    if (isBusy) return false;
    if (assets.length === 0) return true;
    return showDiscardConfirm();
  }}
  onDone={handleDone}
  onCancel={() => setVisible(false)}
/>
```

Without `onRequestClose`, dismissal is allowed while idle and rejected while
capture or processing work is active.

### Language and theme

The camera UI defaults to Chinese. Select the built-in English locale with:

```tsx
<MultiCaptureModal locale="en" {...props} />
```

Override individual strings or colors:

```tsx
<MultiCaptureModal
  strings={{ done: 'Submit' }}
  theme={{ accentColor: '#4F8CFF' }}
  {...props}
/>
```

`zhCNStrings`, `enStrings`, `multiCaptureLocales`, and `defaultTheme` are also
exported for applications that need a shared configuration.

## Core props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `maxAssets` | `number` | `10` | Shared limit for completed and pending assets |
| `mediaType` | `'photo' \| 'video' \| 'mixed'` | `'photo'` | Allowed media types |
| `initialMode` | `'photo' \| 'video'` | `'photo'` | Initial mixed-mode tab; forced to video in video mode |
| `initialCameraPosition` | `'front' \| 'back'` | `'back'` | Initial camera device |
| `initialAssets` | `CaptureAssetInput[]` | `[]` | Assets present at session start |
| `enableAudio` | `boolean` | `false` | Record audio with video |
| `enablePreview` | `boolean` | `true` | Built-in photo/video preview |
| `enableLibraryPicker` | `boolean` | `true` | System library entry and latest thumbnail |
| `enableHaptics` | `boolean` | `false` | RN Vibration shutter feedback |
| `maxVideoDuration` | `number` | - | Maximum seconds per video |
| `maxVideoFileSize` | `number` | - | Maximum bytes per video |
| `openLibrary` | `function` | - | Override the built-in system picker |
| `processAsset` | `function` | - | Serialize processing for captured/selected assets |
| `onPreviewAsset` | `function` | - | Replace the built-in preview |
| `onAssetsChange` | `function` | - | Called after assets are added or removed |
| `onDone` | `function` | required | Completion callback; may be async |
| `onCancel` | `function` | required | Dismissal callback |
| `onRequestClose` | `function` | - | Dismissal guard |
| `onError` | `function` | - | Structured recoverable errors |
| `locale` | `'zh-CN' \| 'en'` | `'zh-CN'` | Built-in UI locale |
| `strings` | `Partial<MultiCaptureStrings>` | - | Copy overrides |
| `theme` | `Partial<MultiCaptureTheme>` | dark | Color overrides |

See the [English API reference](docs/API.en.md) for every prop and exported
type.

## Result data

```ts
interface CaptureAsset {
  id: string;
  uri: string;
  path: string;
  type: 'photo' | 'video';
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  metadata?: Readonly<Record<string, unknown>>;
}
```

VisionCamera capture results are temporary files. This package does not move or
delete them; the host owns persistence, relocation, and cleanup after upload.
Video `duration` is an approximate value tracked by the component. Populate
exact metadata in `processAsset` when required.

## Advanced usage

### Compression, watermarking, or upload preparation

`processAsset` runs before an asset becomes visible and shares the serialized
photo capture chain:

```tsx
<MultiCaptureModal
  processAsset={async (asset) => {
    if (asset.type !== 'photo') return asset;

    const compressed = await compressPhoto(asset.path);
    return {
      ...asset,
      path: compressed.path,
      uri: `file://${compressed.path}`,
      size: compressed.size,
    };
  }}
  {...props}
/>
```

### Replacing the system library picker

If the host already has a custom media source, return normalized
`CaptureAssetInput` values from `openLibrary`:

```tsx
<MultiCaptureModal
  openLibrary={async ({ remaining, mediaType }) => {
    const picked = await yourPicker({ limit: remaining, mediaType });
    if (picked.cancelled) return null;

    return picked.files.map((file) => ({
      uri: file.uri,
      type: file.kind === 'video' ? 'video' : 'photo',
      fileName: file.name,
      mimeType: file.mimeType,
      size: file.size,
      width: file.width,
      height: file.height,
    }));
  }}
  {...props}
/>
```

Custom results still pass through media-type filtering, capture limits,
`processAsset`, and the configured preview flow.

### Using the camera as a screen

```tsx
import { MultiCaptureCamera } from 'react-native-multi-capture';

export function CameraScreen() {
  return (
    <MultiCaptureCamera
      mediaType="photo"
      maxAssets={20}
      onDone={(assets) => navigation.navigate('Upload', { assets })}
      onCancel={() => navigation.goBack()}
    />
  );
}
```

## Concurrency and lifecycle guarantees

1. A shutter press reserves a slot synchronously, so rapid taps cannot exceed
   `maxAssets`.
2. Photo capture and `processAsset` share one Promise chain; native photo calls
   do not overlap.
3. `onDone` waits for the photo chain. Recording, library selection, camera
   switching, and completion are mutually exclusive.
4. Every video uses a fresh VisionCamera Recorder.
5. The camera pauses while previewing and while the application is backgrounded.
6. Unmount cancels active recording and prevents asynchronous state updates.

## Compatibility

| Package/platform | Supported range |
| --- | --- |
| React Native | `>= 0.79`; example uses `0.86.2` |
| React | `>= 19`; example uses `19.2.3` |
| react-native-vision-camera | `>= 5.0 < 6`; example uses `5.2.0` |
| react-native-video | `>= 7.0.0-beta.10 < 8` |
| react-native-image-picker | `>= 8.2.1 < 9` |
| @react-native-camera-roll/camera-roll | `>= 7.10.2 < 8` |
| @react-native-community/blur | `>= 4.4 < 5` |
| iOS | `>= 15.1` |
| New Architecture | Supported; enabled in the example |

VisionCamera 4 and 5 expose incompatible APIs; this package supports
VisionCamera 5 only. VisionCamera 5 uses Nitro-generated Swift/C++ bridges, so
validate the host application's Xcode, NDK, and React Native combination.

## Migrating from CountCamera

| Previous concept | New API |
| --- | --- |
| `maxFiles` | `maxAssets` |
| `mediaType="any"` | `mediaType="mixed"` |
| `cameraMode="multiple"` | Continuous capture is the default |
| `cameraMode="single"` | `maxAssets={1}` |
| `defaultCameraPos` | `initialCameraPosition` |
| `onSuccess` | `onDone` |
| ImageCropPicker | Built-in system picker; override with `openLibrary` |
| `compressPhoto` | `processAsset` |
| Reanimated / Gesture Handler | RN Animated / VisionCamera native gestures |
| `openCountCamera()` | Controlled `MultiCaptureModal` |

Barcode scanning from the previous component is intentionally separate and no
scanner dependency is bundled.

## Running the example

```bash
corepack yarn install

# iOS
cd example
bundle install
bundle exec pod install --project-directory=ios
cd ..
corepack yarn example ios

# Android
corepack yarn example android
```

Camera capture must be tested on a physical device. Simulators are suitable for
permission states and other non-camera UI only.

## Development checks

```bash
corepack yarn lint
corepack yarn typecheck
corepack yarn test
corepack yarn prepare
corepack yarn pack:check
```

See [Architecture](docs/ARCHITECTURE.md) for implementation details.

## License

MIT
