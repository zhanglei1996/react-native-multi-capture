# Architecture

## Dependency boundary

Runtime peers are limited to React, React Native, VisionCamera 5's required
Nitro packages, and the built-in preview player:

- `react`
- `react-native`
- `react-native-vision-camera`
- `react-native-nitro-modules`
- `react-native-nitro-image`
- `react-native-video`

There is no bundled picker, filesystem, compressor, icon set, safe-area
package, gesture handler, or animation runtime. Hosts can replace the built-in
preview through `onPreviewAsset`.

## Capture flow

```text
press shutter
  -> reserve pending slot synchronously
  -> append work to captureChainRef
  -> capturePhotoToFile()
  -> optional processAsset()
  -> append normalized CaptureAsset
  -> release pending slot
```

The synchronous reservation is separate from the Promise chain. This matters
because several taps can be received before React commits the first render.
The ref-backed count still enforces `maxAssets` immediately.

## State ownership

`MultiCaptureCamera` owns session-local state:

- normalized assets;
- pending capture reservations;
- current media mode and camera position;
- photo flash mode;
- Recorder lifecycle;
- permission and AppState-derived activity;
- completion, picker, and recoverable error UI.

The host owns:

- whether a Modal is visible;
- upload and persistence;
- discard confirmation;
- media-library selection;
- compression, watermarking and metadata enrichment;
- cleanup of temporary files.

## Video lifecycle

Recorder instances are single-use in VisionCamera 5. Each recording follows:

```text
idle -> starting -> recording -> stopping -> processing -> idle
```

Automatic duration or size limits enter the same finalization callback as a
manual stop. The asset is not committed until `processAsset` resolves.

## Lifecycle safety

- `MultiCaptureModal` does not mount the camera subtree while `visible` is false.
- Camera activity is `prop isActive && AppState active && permissions && device`.
- Android hardware back uses the same `requestClose()` method as Modal close.
- Unmount cancels an active Recorder and stops timers.
- Asynchronous captures check the mounted ref before committing React state.
- Completion waits for the serialized photo chain.

## Extension strategy

Features that would otherwise add native dependencies are adapters:

- `openLibrary` for any image/video picker;
- `processAsset` for compression, watermarks or file relocation;
- `renderAsset` for custom thumbnails or video preview;
- `cameraProps`, output options and recorder settings for supported
  VisionCamera tuning.

This keeps the core stable while allowing application-specific infrastructure
to remain in the application.
