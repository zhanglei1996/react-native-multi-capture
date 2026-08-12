import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { BlurView } from '@react-native-community/blur';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  usePhotoOutput,
  useVideoOutput,
} from 'react-native-vision-camera';
import type {
  CameraOutput,
  CameraRef,
  Recorder,
  RecordingFinishedReason,
} from 'react-native-vision-camera';
import { AssetPreview } from './components/AssetPreview';
import { AssetTray } from './components/AssetTray';
import { CaptureButton } from './components/CaptureButton';
import { FocusBox, type FocusPoint } from './components/FocusBox';
import { PermissionState } from './components/PermissionState';
import {
  appendWithinLimit,
  canReserveCapture,
  normalizeCaptureAsset,
} from './core/assets';
import {
  AssetProcessingFailure,
  createMultiCaptureError,
  getErrorMessage,
} from './core/errors';
import { imagePickerAssetToCaptureInput } from './core/library';
import { defaultTheme, multiCaptureLocales } from './defaults';
import { cameraIcons } from './icons';
import { useAppActive } from './hooks/useAppActive';
import type {
  CaptureAsset,
  CaptureAssetInput,
  CaptureFlashMode,
  CaptureMode,
  MultiCaptureCameraProps,
  MultiCaptureCameraRef,
} from './types';

type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping';

function formatRecordingDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function getInitialMode(
  mediaType: MultiCaptureCameraProps['mediaType'],
  initialMode: CaptureMode | undefined
): CaptureMode {
  if (mediaType === 'video') return 'video';
  if (mediaType === 'photo') return 'photo';
  return initialMode ?? 'photo';
}

function normalizeInitialAssets(
  inputs: readonly CaptureAssetInput[] | undefined
): CaptureAsset[] {
  if (!inputs) return [];
  const assets: CaptureAsset[] = [];
  for (const input of inputs) {
    try {
      assets.push(normalizeCaptureAsset(input));
    } catch {
      // Invalid initial data is ignored so a camera screen never crashes on mount.
    }
  }
  return assets;
}

function MultiCaptureCameraImpl(
  {
    maxAssets: maxAssetsProp = 10,
    mediaType = 'photo',
    initialMode,
    initialCameraPosition = 'back',
    initialAssets,
    enableAudio = false,
    autoRequestPermissions = true,
    isActive = true,
    maxVideoDuration,
    maxVideoFileSize,
    showFlashControl = true,
    showCaptureCount = false,
    enableZoomGesture = true,
    enableTapToFocus = true,
    enableHaptics = false,
    enablePreview = true,
    enableLibraryPicker = true,
    photoOutputOptions,
    videoOutputOptions,
    photoCaptureSettings,
    recorderSettings,
    cameraProps,
    openLibrary,
    processAsset,
    onAssetsChange,
    onDone,
    onCancel,
    onRequestClose,
    onError,
    onHapticFeedback,
    onPreviewAsset,
    renderAsset,
    locale = 'zh-CN',
    strings: stringOverrides,
    theme: themeOverrides,
    style,
    testID = 'multi-capture-camera',
  }: MultiCaptureCameraProps,
  ref: React.ForwardedRef<MultiCaptureCameraRef>
) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const maxAssets = Math.max(1, Math.floor(maxAssetsProp));
  const strings = useMemo(
    () => ({ ...multiCaptureLocales[locale], ...stringOverrides }),
    [locale, stringOverrides]
  );
  const theme = useMemo(
    () => ({ ...defaultTheme, ...themeOverrides }),
    [themeOverrides]
  );
  const [assets, setAssets] = useState<CaptureAsset[]>(() =>
    normalizeInitialAssets(initialAssets).slice(0, maxAssets)
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [mode, setMode] = useState<CaptureMode>(() =>
    getInitialMode(mediaType, initialMode)
  );
  const [cameraPosition, setCameraPosition] = useState(initialCameraPosition);
  const [flashMode, setFlashMode] = useState<CaptureFlashMode>('off');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isPickingLibrary, setIsPickingLibrary] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [deviceLookupComplete, setDeviceLookupComplete] = useState(false);
  const [focusPoint, setFocusPoint] = useState<FocusPoint>();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [libraryThumbnailUri, setLibraryThumbnailUri] = useState<string>();
  const [headerAreaHeight, setHeaderAreaHeight] = useState(
    60 + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0)
  );
  const [footerHeight, setFooterHeight] = useState(156);

  const assetsRef = useRef(assets);
  const pendingCountRef = useRef(0);
  const captureChainRef = useRef<Promise<void>>(Promise.resolve());
  const recorderRef = useRef<Recorder | undefined>(undefined);
  const recordingReservationRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const switchTransitionTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const switchInFlightRef = useRef(false);
  const switchRevealStartedRef = useRef(false);
  const closeInFlightRef = useRef(false);
  const cameraUnavailableReportedRef = useRef(false);
  const permissionDeniedReportedRef = useRef(false);
  const libraryPermissionRequestedRef = useRef(false);
  const mountedRef = useRef(true);
  const cameraRef = useRef<CameraRef>(null);
  const callbacksRef = useRef({
    onAssetsChange,
    onDone,
    onCancel,
    onRequestClose,
    onError,
    processAsset,
  });
  callbacksRef.current = {
    onAssetsChange,
    onDone,
    onCancel,
    onRequestClose,
    onError,
    processAsset,
  };

  const rootTranslateY = useRef(new Animated.Value(screenHeight)).current;
  const controlsOpacity = useRef(new Animated.Value(0)).current;
  const modeProgress = useRef(
    new Animated.Value(
      getInitialMode(mediaType, initialMode) === 'video' ? 1 : 0
    )
  ).current;
  const recordingControlsProgress = useRef(new Animated.Value(0)).current;
  const recordingBadgeProgress = useRef(new Animated.Value(0)).current;
  const switchBlurOpacity = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const messageScale = useRef(new Animated.Value(0.94)).current;

  const appIsActive = useAppActive();
  const device = useCameraDevice(cameraPosition);
  const alternativePosition = cameraPosition === 'back' ? 'front' : 'back';
  const alternativeDevice = useCameraDevice(alternativePosition);
  const cameraPermission = useCameraPermission();
  const microphonePermission = useMicrophonePermission();
  const needsMicrophone = enableAudio && mediaType !== 'photo';
  const hasRequiredPermissions =
    cameraPermission.hasPermission &&
    (!needsMicrophone || microphonePermission.hasPermission);

  const photoOutput = usePhotoOutput(photoOutputOptions);
  const videoOutput = useVideoOutput({
    ...videoOutputOptions,
    enableAudio,
    fileType: videoOutputOptions?.fileType ?? 'mp4',
  });
  const outputs = useMemo(() => {
    const next: CameraOutput[] = [];
    if (mediaType !== 'video') next.push(photoOutput);
    if (mediaType !== 'photo') next.push(videoOutput);
    return next;
  }, [mediaType, photoOutput, videoOutput]);

  const isRecording = recordingState === 'recording';
  const isRecordingBusy = recordingState !== 'idle';
  const isBusy =
    pendingCount > 0 ||
    isRecordingBusy ||
    isCompleting ||
    isPickingLibrary ||
    isSwitchingCamera;
  const isAtLimit = assets.length + pendingCount >= maxAssets;

  const refreshLibraryThumbnail = useCallback(async () => {
    if (!enableLibraryPicker) return;
    try {
      if (Platform.OS === 'android') {
        const permission =
          Number(Platform.Version) >= 33
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        let granted = await PermissionsAndroid.check(permission);
        if (!granted && !libraryPermissionRequestedRef.current) {
          libraryPermissionRequestedRef.current = true;
          granted =
            (await PermissionsAndroid.request(permission)) ===
            PermissionsAndroid.RESULTS.GRANTED;
        }
        if (!granted) return;
      }
      const result = await CameraRoll.getPhotos({
        assetType: 'Photos',
        first: 1,
      });
      const uri = result.edges[0]?.node.image.uri;
      if (mountedRef.current && uri) setLibraryThumbnailUri(uri);
    } catch {
      // The thumbnail is optional. The system picker still works when the user
      // grants limited access or declines full photo-library access.
    }
  }, [enableLibraryPicker]);

  useEffect(() => {
    if (!appIsActive || !hasRequiredPermissions) return;
    void refreshLibraryThumbnail();
  }, [appIsActive, hasRequiredPermissions, refreshLibraryThumbnail]);

  const showMessage = useCallback(
    (message: string) => {
      if (!mountedRef.current) return;
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
      setStatusMessage(message);
      messageOpacity.stopAnimation();
      messageScale.stopAnimation();
      messageOpacity.setValue(0);
      messageScale.setValue(0.94);
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(messageScale, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
      messageTimerRef.current = setTimeout(() => {
        Animated.timing(messageOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && mountedRef.current) setStatusMessage(undefined);
        });
      }, 2600);
    },
    [messageOpacity, messageScale]
  );

  const animateDismiss = useCallback(
    () =>
      new Promise<void>((resolve) => {
        Animated.timing(rootTranslateY, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: false,
        }).start(() => resolve());
      }),
    [rootTranslateY, screenHeight]
  );

  const emitError = useCallback(
    (
      code: Parameters<typeof createMultiCaptureError>[0],
      message: string,
      cause?: unknown
    ) => {
      showMessage(message);
      callbacksRef.current.onError?.(
        createMultiCaptureError(code, message, cause)
      );
    },
    [showMessage]
  );

  const commitAssets = useCallback((nextAssets: CaptureAsset[]) => {
    assetsRef.current = nextAssets;
    if (!mountedRef.current) return;
    setAssets(nextAssets);
    callbacksRef.current.onAssetsChange?.(nextAssets);
  }, []);

  const updatePendingCount = useCallback((change: number) => {
    pendingCountRef.current = Math.max(0, pendingCountRef.current + change);
    if (mountedRef.current) {
      setPendingCount(pendingCountRef.current);
    }
  }, []);

  const processCapturedAsset = useCallback(
    async (asset: CaptureAsset): Promise<CaptureAsset> => {
      const processor = callbacksRef.current.processAsset;
      if (!processor) return asset;
      try {
        const processed = await processor(asset, {
          index: assetsRef.current.length,
          assets: assetsRef.current,
        });
        return normalizeCaptureAsset(processed);
      } catch (error) {
        throw new AssetProcessingFailure(error);
      }
    },
    []
  );

  const reserveCapture = useCallback((): boolean => {
    if (
      !canReserveCapture(
        assetsRef.current.length,
        pendingCountRef.current,
        maxAssets
      )
    ) {
      emitError('limit-reached', strings.maxReached);
      return false;
    }
    updatePendingCount(1);
    return true;
  }, [emitError, maxAssets, strings.maxReached, updatePendingCount]);

  const capturePhoto = useCallback(() => {
    if (!cameraStarted || !hasRequiredPermissions || isRecordingBusy) {
      return;
    }
    if (!reserveCapture()) return;

    const task = async () => {
      try {
        const configuredSettings =
          typeof photoCaptureSettings === 'function'
            ? photoCaptureSettings(flashMode)
            : photoCaptureSettings;
        const result = await photoOutput.capturePhotoToFile(
          {
            flashMode,
            enableShutterSound: true,
            ...configuredSettings,
          },
          {}
        );
        let asset = normalizeCaptureAsset({
          path: result.filePath,
          type: 'photo',
        });
        asset = await processCapturedAsset(asset);
        if (mountedRef.current) {
          commitAssets(
            appendWithinLimit(assetsRef.current, [asset], maxAssets)
          );
        }
      } catch (error) {
        if (mountedRef.current) {
          emitError(
            error instanceof AssetProcessingFailure
              ? 'asset-processing-failed'
              : 'photo-capture-failed',
            getErrorMessage(error),
            error instanceof AssetProcessingFailure ? error.cause : error
          );
        }
      } finally {
        updatePendingCount(-1);
      }
    };

    captureChainRef.current = captureChainRef.current.then(task, task);
  }, [
    cameraStarted,
    commitAssets,
    emitError,
    flashMode,
    hasRequiredPermissions,
    isRecordingBusy,
    maxAssets,
    photoCaptureSettings,
    photoOutput,
    processCapturedAsset,
    reserveCapture,
    updatePendingCount,
  ]);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = undefined;
    }
  }, []);

  const releaseRecordingReservation = useCallback(() => {
    if (!recordingReservationRef.current) return;
    recordingReservationRef.current = false;
    updatePendingCount(-1);
  }, [updatePendingCount]);

  const handleRecordingFailure = useCallback(
    (error: unknown) => {
      clearRecordingTimer();
      recorderRef.current = undefined;
      releaseRecordingReservation();
      if (mountedRef.current) {
        setRecordingState('idle');
        setRecordingSeconds(0);
        emitError('recording-failed', getErrorMessage(error), error);
      }
    },
    [clearRecordingTimer, emitError, releaseRecordingReservation]
  );

  const finalizeRecording = useCallback(
    async (path: string, _reason: RecordingFinishedReason) => {
      const duration = recordingStartedAtRef.current
        ? (Date.now() - recordingStartedAtRef.current) / 1000
        : undefined;
      try {
        let asset = normalizeCaptureAsset({
          path,
          type: 'video',
          duration,
        });
        asset = await processCapturedAsset(asset);
        if (mountedRef.current) {
          commitAssets(
            appendWithinLimit(assetsRef.current, [asset], maxAssets)
          );
        }
      } catch (error) {
        if (mountedRef.current) {
          emitError(
            error instanceof AssetProcessingFailure
              ? 'asset-processing-failed'
              : 'recording-failed',
            getErrorMessage(error),
            error instanceof AssetProcessingFailure ? error.cause : error
          );
        }
      } finally {
        clearRecordingTimer();
        recorderRef.current = undefined;
        releaseRecordingReservation();
        if (mountedRef.current) {
          setRecordingState('idle');
          setRecordingSeconds(0);
        }
      }
    },
    [
      clearRecordingTimer,
      commitAssets,
      emitError,
      maxAssets,
      processCapturedAsset,
      releaseRecordingReservation,
    ]
  );

  const startRecording = useCallback(async () => {
    if (
      !cameraStarted ||
      !hasRequiredPermissions ||
      isRecordingBusy ||
      pendingCountRef.current > 0
    ) {
      return;
    }
    if (!reserveCapture()) return;
    recordingReservationRef.current = true;
    setRecordingState('starting');

    try {
      const recorder = await videoOutput.createRecorder({
        ...recorderSettings,
        maxDuration: maxVideoDuration ?? recorderSettings?.maxDuration,
        maxFileSize: maxVideoFileSize ?? recorderSettings?.maxFileSize,
      });
      recorderRef.current = recorder;
      await recorder.startRecording(
        (path, reason) => void finalizeRecording(path, reason),
        (error) => handleRecordingFailure(error)
      );
      if (!mountedRef.current) {
        await recorder.cancelRecording();
        return;
      }
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setRecordingState('recording');
      recordingTimerRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        setRecordingSeconds(
          Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)
        );
      }, 500);
    } catch (error) {
      clearRecordingTimer();
      recorderRef.current = undefined;
      releaseRecordingReservation();
      if (mountedRef.current) {
        setRecordingState('idle');
        setRecordingSeconds(0);
        emitError('recording-start-failed', getErrorMessage(error), error);
      }
    }
  }, [
    cameraStarted,
    clearRecordingTimer,
    emitError,
    finalizeRecording,
    handleRecordingFailure,
    hasRequiredPermissions,
    isRecordingBusy,
    maxVideoDuration,
    maxVideoFileSize,
    recorderSettings,
    releaseRecordingReservation,
    reserveCapture,
    videoOutput,
  ]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recordingState !== 'recording') return;
    setRecordingState('stopping');
    try {
      await recorder.stopRecording();
    } catch (error) {
      if (recorder.isRecording) {
        if (mountedRef.current) setRecordingState('recording');
      } else {
        clearRecordingTimer();
        recorderRef.current = undefined;
        releaseRecordingReservation();
        if (mountedRef.current) {
          setRecordingState('idle');
          setRecordingSeconds(0);
        }
      }
      emitError('recording-stop-failed', getErrorMessage(error), error);
    }
  }, [
    clearRecordingTimer,
    emitError,
    recordingState,
    releaseRecordingReservation,
  ]);

  const capture = useCallback(() => {
    if (mode === 'photo') {
      capturePhoto();
    } else if (isRecording) {
      void stopRecording();
    } else {
      void startRecording();
    }
  }, [capturePhoto, isRecording, mode, startRecording, stopRecording]);

  const complete = useCallback(async () => {
    if (
      isRecordingBusy ||
      isPickingLibrary ||
      isSwitchingCamera ||
      isCompleting
    ) {
      showMessage(
        recordingState === 'stopping'
          ? strings.stoppingRecording
          : strings.processing
      );
      return;
    }
    setIsCompleting(true);
    try {
      await captureChainRef.current;
      await animateDismiss();
      await callbacksRef.current.onDone([...assetsRef.current]);
    } catch (error) {
      Animated.timing(rootTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
      emitError('completion-failed', getErrorMessage(error), error);
    } finally {
      if (mountedRef.current) setIsCompleting(false);
    }
  }, [
    isCompleting,
    isPickingLibrary,
    isRecordingBusy,
    isSwitchingCamera,
    recordingState,
    animateDismiss,
    emitError,
    rootTranslateY,
    showMessage,
    strings.processing,
    strings.stoppingRecording,
  ]);

  const requestClose = useCallback(async () => {
    if (closeInFlightRef.current) return;
    closeInFlightRef.current = true;
    try {
      const busy =
        pendingCountRef.current > 0 ||
        recordingState !== 'idle' ||
        isPickingLibrary ||
        isSwitchingCamera ||
        isCompleting;
      const request = callbacksRef.current.onRequestClose;
      const allowed = request
        ? await request({
            assets: [...assetsRef.current],
            isBusy: busy,
          })
        : !busy;
      if (!allowed) {
        if (busy) showMessage(strings.processing);
        return;
      }
      if (recorderRef.current?.isRecording) {
        await recorderRef.current.cancelRecording();
        clearRecordingTimer();
        recorderRef.current = undefined;
        releaseRecordingReservation();
        if (mountedRef.current) {
          setRecordingState('idle');
          setRecordingSeconds(0);
        }
      }
      await animateDismiss();
      callbacksRef.current.onCancel([...assetsRef.current]);
    } catch (error) {
      emitError('close-failed', getErrorMessage(error), error);
    } finally {
      closeInFlightRef.current = false;
    }
  }, [
    clearRecordingTimer,
    animateDismiss,
    emitError,
    isCompleting,
    isPickingLibrary,
    isSwitchingCamera,
    recordingState,
    releaseRecordingReservation,
    showMessage,
    strings.processing,
  ]);

  const pickFromLibrary = useCallback(async () => {
    if (
      !enableLibraryPicker ||
      isBusy ||
      assetsRef.current.length >= maxAssets
    ) {
      return;
    }
    setIsPickingLibrary(true);
    let previewTarget: { asset: CaptureAsset; index: number } | undefined;
    try {
      const context = {
        assets: [...assetsRef.current],
        remaining: maxAssets - assetsRef.current.length,
        mediaType,
      } as const;
      const result = openLibrary
        ? await openLibrary(context)
        : await (async () => {
            const response = await launchImageLibrary({
              assetRepresentationMode: 'compatible',
              includeExtra: false,
              mediaType,
              presentationStyle: 'fullScreen',
              selectionLimit: context.remaining,
            });
            if (response.didCancel) return null;
            if (response.errorCode) {
              throw new Error(response.errorMessage || `${response.errorCode}`);
            }
            return (response.assets ?? [])
              .map(imagePickerAssetToCaptureInput)
              .filter((asset): asset is CaptureAssetInput => Boolean(asset));
          })();
      if (!result) return;

      const remaining = maxAssets - assetsRef.current.length;
      const firstNewIndex = assetsRef.current.length;
      const accepted: CaptureAsset[] = [];
      for (const input of result) {
        try {
          const asset = normalizeCaptureAsset(input);
          const isAllowed =
            mediaType === 'mixed' ||
            (mediaType === 'photo' && asset.type === 'photo') ||
            (mediaType === 'video' && asset.type === 'video');
          if (!isAllowed) continue;
          accepted.push(await processCapturedAsset(asset));
        } catch (error) {
          emitError(
            error instanceof AssetProcessingFailure
              ? 'asset-processing-failed'
              : 'invalid-asset',
            getErrorMessage(error),
            error instanceof AssetProcessingFailure ? error.cause : error
          );
        }
      }
      const nextAssets = appendWithinLimit(
        assetsRef.current,
        accepted,
        maxAssets
      );
      commitAssets(nextAssets);
      const firstNewAsset = nextAssets[firstNewIndex];
      if (firstNewAsset) {
        previewTarget = { asset: firstNewAsset, index: firstNewIndex };
      }
      if (accepted.length > remaining) {
        emitError('limit-reached', strings.maxReached);
      }
      void refreshLibraryThumbnail();
    } catch (error) {
      emitError('library-picker-failed', strings.libraryPickerFailed, error);
    } finally {
      if (mountedRef.current) {
        setIsPickingLibrary(false);
        if (previewTarget) {
          requestAnimationFrame(() => {
            if (!mountedRef.current || !previewTarget) return;
            if (onPreviewAsset) {
              onPreviewAsset(previewTarget.asset, previewTarget.index);
            } else if (enablePreview) {
              setPreviewIndex(previewTarget.index);
            }
          });
        }
      }
    }
  }, [
    commitAssets,
    enableLibraryPicker,
    enablePreview,
    emitError,
    isBusy,
    maxAssets,
    mediaType,
    onPreviewAsset,
    openLibrary,
    processCapturedAsset,
    refreshLibraryThumbnail,
    strings.libraryPickerFailed,
    strings.maxReached,
  ]);

  const requestPermissions = useCallback(async () => {
    if (isRequestingPermission) return;
    setIsRequestingPermission(true);
    try {
      if (
        !cameraPermission.hasPermission &&
        cameraPermission.canRequestPermission
      ) {
        await cameraPermission.requestPermission();
      }
      if (
        needsMicrophone &&
        !microphonePermission.hasPermission &&
        microphonePermission.canRequestPermission
      ) {
        await microphonePermission.requestPermission();
      }
    } finally {
      if (mountedRef.current) setIsRequestingPermission(false);
    }
  }, [
    cameraPermission,
    isRequestingPermission,
    microphonePermission,
    needsMicrophone,
  ]);

  const removeAsset = useCallback(
    (id: string) => {
      if (isBusy) {
        showMessage(strings.processing);
        return;
      }
      commitAssets(assetsRef.current.filter((asset) => asset.id !== id));
    },
    [commitAssets, isBusy, showMessage, strings.processing]
  );

  const previewAsset = useCallback(
    (asset: CaptureAsset, index: number) => {
      if (onPreviewAsset) {
        onPreviewAsset(asset, index);
        return;
      }
      if (enablePreview) setPreviewIndex(index);
    },
    [enablePreview, onPreviewAsset]
  );

  const setCaptureMode = useCallback(
    (nextMode: CaptureMode) => {
      if (isBusy || mode === nextMode) return;
      setMode(nextMode);
    },
    [isBusy, mode]
  );

  const cycleFlash = useCallback(() => {
    setFlashMode((current) => {
      const next = current === 'off' ? 'on' : 'off';
      showMessage(next === 'on' ? strings.flashEnabled : strings.flashDisabled);
      return next;
    });
  }, [showMessage, strings.flashDisabled, strings.flashEnabled]);

  const finishCameraSwitch = useCallback(() => {
    if (switchTransitionTimerRef.current) {
      clearTimeout(switchTransitionTimerRef.current);
      switchTransitionTimerRef.current = undefined;
    }
    switchInFlightRef.current = false;
    switchRevealStartedRef.current = false;
    switchBlurOpacity.stopAnimation();
    switchBlurOpacity.setValue(0);
    if (mountedRef.current) setIsSwitchingCamera(false);
  }, [switchBlurOpacity]);

  const revealCameraSwitch = useCallback(() => {
    if (!switchInFlightRef.current || switchRevealStartedRef.current) return;
    switchRevealStartedRef.current = true;
    if (switchTransitionTimerRef.current) {
      clearTimeout(switchTransitionTimerRef.current);
      switchTransitionTimerRef.current = undefined;
    }
    Animated.timing(switchBlurOpacity, {
      toValue: 0,
      duration: 210,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(finishCameraSwitch);
  }, [finishCameraSwitch, switchBlurOpacity]);

  const switchCamera = useCallback(() => {
    if (isBusy || switchInFlightRef.current || !alternativeDevice) return;
    switchInFlightRef.current = true;
    switchRevealStartedRef.current = false;
    setIsSwitchingCamera(true);
    switchBlurOpacity.stopAnimation();
    switchBlurOpacity.setValue(0);
    Animated.timing(switchBlurOpacity, {
      toValue: 1,
      duration: 90,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !mountedRef.current) {
        finishCameraSwitch();
        return;
      }
      setCameraPosition(alternativePosition);
      // Prefer the real camera-session start signal. Some devices do not emit
      // it during a device swap, so the short fallback still guarantees that
      // controls unlock and the blur is removed.
      switchTransitionTimerRef.current = setTimeout(revealCameraSwitch, 280);
    });
  }, [
    alternativeDevice,
    alternativePosition,
    finishCameraSwitch,
    isBusy,
    revealCameraSwitch,
    switchBlurOpacity,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      capture,
      complete,
      requestClose,
      getAssets: () => [...assetsRef.current],
    }),
    [capture, complete, requestClose]
  );

  useEffect(() => {
    Animated.timing(rootTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [rootTranslateY]);

  useEffect(() => {
    // Reveal controls after the initial session starts, then keep them visible.
    // Device swaps can emit `onStopped` without a matching `onStarted`.
    if (!cameraStarted) return;
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [cameraStarted, controlsOpacity]);

  useEffect(() => {
    Animated.timing(modeProgress, {
      toValue: mode === 'video' ? 1 : 0,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [mode, modeProgress]);

  useEffect(() => {
    Animated.timing(recordingControlsProgress, {
      toValue: isRecording ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    Animated.timing(recordingBadgeProgress, {
      toValue: isRecording ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isRecording, recordingBadgeProgress, recordingControlsProgress]);

  useEffect(() => {
    if (mediaType === 'photo') setMode('photo');
    if (mediaType === 'video') setMode('video');
  }, [mediaType]);

  useEffect(() => {
    if (
      autoRequestPermissions &&
      (!cameraPermission.hasPermission ||
        (needsMicrophone && !microphonePermission.hasPermission))
    ) {
      void requestPermissions();
    }
  }, [
    autoRequestPermissions,
    cameraPermission.hasPermission,
    microphonePermission.hasPermission,
    needsMicrophone,
    requestPermissions,
  ]);

  useEffect(() => {
    if (!hasRequiredPermissions) return;
    if (device) {
      setDeviceLookupComplete(true);
      cameraUnavailableReportedRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDeviceLookupComplete(true);
      if (!cameraUnavailableReportedRef.current) {
        cameraUnavailableReportedRef.current = true;
        callbacksRef.current.onError?.(
          createMultiCaptureError(
            'camera-unavailable',
            strings.cameraUnavailable
          )
        );
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [device, hasRequiredPermissions, strings.cameraUnavailable]);

  useEffect(() => {
    if (hasRequiredPermissions) {
      permissionDeniedReportedRef.current = false;
      return;
    }
    const canRequest =
      cameraPermission.canRequestPermission ||
      (needsMicrophone && microphonePermission.canRequestPermission);
    if (!canRequest && !permissionDeniedReportedRef.current) {
      permissionDeniedReportedRef.current = true;
      callbacksRef.current.onError?.(
        createMultiCaptureError(
          'permission-denied',
          !cameraPermission.hasPermission
            ? strings.cameraPermissionMessage
            : strings.microphonePermissionMessage
        )
      );
    }
  }, [
    cameraPermission.canRequestPermission,
    cameraPermission.hasPermission,
    hasRequiredPermissions,
    microphonePermission.canRequestPermission,
    needsMicrophone,
    strings.cameraPermissionMessage,
    strings.microphonePermissionMessage,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        void requestClose();
        return true;
      }
    );
    return () => subscription.remove();
  }, [requestClose]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      clearRecordingTimer();
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      if (switchTransitionTimerRef.current) {
        clearTimeout(switchTransitionTimerRef.current);
      }
      switchInFlightRef.current = false;
      switchBlurOpacity.stopAnimation();
      if (recorderRef.current?.isRecording) {
        void recorderRef.current.cancelRecording().catch(() => {});
      }
    },
    [clearRecordingTimer, switchBlurOpacity]
  );

  const permissionMessage = !cameraPermission.hasPermission
    ? needsMicrophone && !microphonePermission.hasPermission
      ? strings.cameraAndMicrophonePermissionMessage
      : strings.cameraPermissionMessage
    : strings.microphonePermissionMessage;
  const canRequestPermission =
    cameraPermission.canRequestPermission ||
    (needsMicrophone && microphonePermission.canRequestPermission);
  const cameraIsActive =
    isActive &&
    appIsActive &&
    previewIndex === null &&
    hasRequiredPermissions &&
    Boolean(device);
  const captureDisabled =
    !cameraStarted ||
    isCompleting ||
    isPickingLibrary ||
    isSwitchingCamera ||
    recordingState === 'starting' ||
    recordingState === 'stopping' ||
    (isAtLimit && !isRecording);
  const photoPreviewHeight = (screenWidth / 3) * 4;
  const visiblePreviewHeight =
    mode === 'photo' ? photoPreviewHeight : screenHeight;
  const cameraTop = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [headerAreaHeight, 0],
  });
  const cameraHeight = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [photoPreviewHeight, screenHeight],
  });
  const controlsVisibility = recordingControlsProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const headerTranslateY = recordingControlsProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -headerAreaHeight],
  });
  const footerTranslateY = recordingControlsProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, footerHeight],
  });
  const recordingBackground = recordingBadgeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', theme.dangerColor],
  });

  const handleCameraTouchEnd = (event: GestureResponderEvent) => {
    if (
      !enableTapToFocus ||
      !device?.supportsFocusMetering ||
      isRecordingBusy
    ) {
      return;
    }
    const { locationX: x, locationY: y } = event.nativeEvent;
    setFocusPoint((current) => ({
      x,
      y,
      sequence: (current?.sequence ?? 0) + 1,
    }));
    void cameraRef.current?.focusTo({ x, y }).catch(() => {});
  };

  const assetPreview = (
    <AssetPreview
      assets={assets}
      initialIndex={previewIndex ?? 0}
      isCompleting={isCompleting}
      onClose={() => setPreviewIndex(null)}
      onDone={() => void complete()}
      strings={strings}
      testID={testID}
      theme={theme}
      visible={previewIndex !== null}
    />
  );

  if (!hasRequiredPermissions) {
    return (
      <>
        <PermissionState
          canRequest={canRequestPermission}
          assetCount={assets.length}
          isCompleting={isCompleting}
          isRequesting={isRequestingPermission}
          message={permissionMessage}
          onClose={() => void requestClose()}
          onDone={() => void complete()}
          onOpenLibrary={
            enableLibraryPicker ? () => void pickFromLibrary() : undefined
          }
          onRequest={() => void requestPermissions()}
          strings={strings}
          theme={theme}
        />
        {assetPreview}
      </>
    );
  }

  if (!device) {
    return (
      <>
        <View
          style={[
            styles.unavailable,
            { backgroundColor: theme.backgroundColor },
          ]}
        >
          <Text style={[styles.unavailableText, { color: theme.textColor }]}>
            {deviceLookupComplete
              ? strings.cameraUnavailable
              : strings.processing}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void requestClose()}
            style={styles.unavailableClose}
          >
            <Text style={{ color: theme.accentColor }}>{strings.cancel}</Text>
          </Pressable>
          {enableLibraryPicker ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void pickFromLibrary()}
              style={[
                styles.unavailableLibrary,
                { borderColor: theme.accentColor },
              ]}
            >
              <Text style={{ color: theme.accentColor }}>
                {strings.selectFromLibrary}
              </Text>
            </Pressable>
          ) : null}
          {assets.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              disabled={isCompleting}
              onPress={() => void complete()}
              style={[
                styles.unavailableDone,
                {
                  backgroundColor: theme.accentColor,
                  opacity: isCompleting ? 0.62 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.textColor }}>
                {strings.done} ({assets.length})
              </Text>
            </Pressable>
          ) : null}
        </View>
        {assetPreview}
      </>
    );
  }

  return (
    <Animated.View
      style={[
        styles.root,
        { backgroundColor: theme.backgroundColor },
        style,
        { transform: [{ translateY: rootTranslateY }] },
      ]}
      testID={testID}
    >
      <StatusBar hidden />
      <Animated.View
        onTouchEnd={handleCameraTouchEnd}
        style={[
          styles.cameraWindow,
          {
            top: cameraTop,
            height: cameraHeight,
          },
        ]}
      >
        <Camera
          {...cameraProps}
          device={device}
          enableNativeTapToFocusGesture={false}
          enableNativeZoomGesture={enableZoomGesture}
          isActive={cameraIsActive}
          onConfigured={cameraProps?.onConfigured}
          onError={(error) => {
            cameraProps?.onError?.(error);
            emitError('camera-unavailable', getErrorMessage(error), error);
          }}
          onStarted={() => {
            setCameraStarted(true);
            if (switchInFlightRef.current) {
              requestAnimationFrame(revealCameraSwitch);
            }
            cameraProps?.onStarted?.();
          }}
          onStopped={() => {
            if (!cameraIsActive) setCameraStarted(false);
            cameraProps?.onStopped?.();
          }}
          outputs={outputs}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
        />
        <FocusBox
          containerHeight={visiblePreviewHeight}
          containerWidth={screenWidth}
          point={focusPoint}
          theme={theme}
        />
        {isSwitchingCamera ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { opacity: switchBlurOpacity }]}
          >
            <BlurView
              blurAmount={50}
              blurType="light"
              reducedTransparencyFallbackColor="white"
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[styles.controls, { opacity: controlsOpacity }]}
      >
        <Animated.View
          style={[
            styles.headerSafeArea,
            {
              backgroundColor: theme.overlayColor,
              paddingTop:
                Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
              opacity: controlsVisibility,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
          onLayout={(event) =>
            setHeaderAreaHeight(event.nativeEvent.layout.height)
          }
        >
          <SafeAreaView>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={strings.cancel}
                hitSlop={10}
                onPress={() => void requestClose()}
                style={styles.headerButton}
                testID={`${testID}-close`}
              >
                <Image source={cameraIcons.close} style={styles.closeIcon} />
              </Pressable>

              {showCaptureCount ? (
                <Text
                  style={[styles.countText, { color: theme.mutedTextColor }]}
                >
                  {assets.length + pendingCount}/{maxAssets}
                </Text>
              ) : null}

              {showFlashControl && device.hasFlash ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${strings.flash}: ${flashMode}`}
                  disabled={isBusy}
                  hitSlop={10}
                  onPress={cycleFlash}
                  style={styles.headerButton}
                  testID={`${testID}-flash`}
                >
                  <Image
                    source={
                      flashMode === 'off'
                        ? cameraIcons.flashOff
                        : cameraIcons.flashOn
                    }
                    style={styles.flashIcon}
                  />
                </Pressable>
              ) : (
                <View style={styles.headerButton} />
              )}
            </View>
          </SafeAreaView>
        </Animated.View>

        {mode === 'video' ? (
          <SafeAreaView pointerEvents="none" style={styles.recordingTimerSafe}>
            <Animated.View
              style={[
                styles.recordingBadge,
                { backgroundColor: recordingBackground },
              ]}
            >
              <Text style={[styles.recordingText, { color: theme.textColor }]}>
                {formatRecordingDuration(recordingSeconds)}
              </Text>
            </Animated.View>
          </SafeAreaView>
        ) : null}

        {statusMessage ? (
          <Animated.View
            accessibilityLiveRegion="polite"
            style={[
              styles.message,
              {
                backgroundColor: theme.overlayColor,
                opacity: messageOpacity,
                transform: [{ scale: messageScale }],
              },
            ]}
          >
            <Text style={styles.messageText}>{statusMessage}</Text>
          </Animated.View>
        ) : null}

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.footerSafeArea,
            {
              backgroundColor: theme.overlayColor,
              opacity: controlsVisibility,
              transform: [{ translateY: footerTranslateY }],
            },
          ]}
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        >
          <SafeAreaView>
            <View style={styles.footerContent}>
              {assets.length > 0 || pendingCount > 0 ? (
                <View style={styles.filesRow}>
                  <View style={styles.filesScroll}>
                    <AssetTray
                      assets={assets}
                      onPreviewAsset={
                        enablePreview || onPreviewAsset
                          ? previewAsset
                          : undefined
                      }
                      onRemove={removeAsset}
                      pendingCount={pendingCount}
                      renderAsset={renderAsset}
                      strings={strings}
                      theme={theme}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      isCompleting || isRecordingBusy || isPickingLibrary
                    }
                    onPress={() => void complete()}
                    style={[
                      styles.doneButton,
                      {
                        backgroundColor: theme.accentColor,
                        opacity:
                          isCompleting || isRecordingBusy || isPickingLibrary
                            ? 0.5
                            : 1,
                      },
                    ]}
                    testID={`${testID}-done`}
                  >
                    <Text style={[styles.doneText, { color: theme.textColor }]}>
                      {isCompleting ? strings.processing : strings.done}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.modeRow}>
                {(mediaType === 'mixed'
                  ? (['photo', 'video'] as const)
                  : ([mediaType] as readonly CaptureMode[])
                ).map((item) => (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: mode === item }}
                    disabled={isBusy}
                    key={item}
                    onPress={() => setCaptureMode(item)}
                    style={styles.modeButton}
                  >
                    <Text
                      style={[
                        styles.modeText,
                        {
                          color:
                            mode === item ? theme.accentColor : theme.textColor,
                        },
                      ]}
                    >
                      {item === 'photo' ? strings.photoMode : strings.videoMode}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.actionRow}>
                <View style={styles.sideAction}>
                  {enableLibraryPicker ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={strings.openLibrary}
                      disabled={isBusy || isAtLimit}
                      onPress={() => void pickFromLibrary()}
                      style={{ opacity: isBusy || isAtLimit ? 0.45 : 1 }}
                      testID={`${testID}-library`}
                    >
                      <Image
                        source={
                          libraryThumbnailUri
                            ? { uri: libraryThumbnailUri }
                            : cameraIcons.photoDefault
                        }
                        style={styles.libraryIcon}
                      />
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.shutterPlaceholder} />

                <View style={[styles.sideAction, styles.sideActionEnd]}>
                  {alternativeDevice ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={strings.switchCamera}
                      disabled={isBusy}
                      onPress={switchCamera}
                      style={{ opacity: isBusy ? 0.45 : 1 }}
                      testID={`${testID}-switch`}
                    >
                      <Image
                        source={cameraIcons.switchCamera}
                        style={styles.switchIcon}
                      />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>

        <SafeAreaView pointerEvents="box-none" style={styles.shutterSafeArea}>
          <View pointerEvents="box-none" style={styles.shutterWrap}>
            <CaptureButton
              accessibilityLabel={
                mode === 'photo'
                  ? strings.capturePhoto
                  : isRecording
                    ? strings.stopRecording
                    : strings.startRecording
              }
              disabled={captureDisabled}
              enableHaptics={enableHaptics}
              isRecording={isRecording}
              mode={mode}
              onHapticFeedback={onHapticFeedback}
              onPress={capture}
              testID={`${testID}-shutter`}
              theme={theme}
            />
          </View>
        </SafeAreaView>
      </Animated.View>

      {assetPreview}
    </Animated.View>
  );
}

export const MultiCaptureCamera = forwardRef(MultiCaptureCameraImpl);
MultiCaptureCamera.displayName = 'MultiCaptureCamera';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  cameraWindow: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  controls: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 12,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  flashIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  countText: {
    position: 'absolute',
    left: 70,
    right: 70,
    textAlign: 'center',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  recordingTimerSafe: {
    position: 'absolute',
    top: 0,
    left: 70,
    right: 70,
    zIndex: 14,
    alignItems: 'center',
  },
  recordingBadge: {
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  message: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    maxWidth: '84%',
    minHeight: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footerSafeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 12,
  },
  footerContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  filesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filesScroll: {
    flex: 1,
    marginRight: 10,
    overflow: 'hidden',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -10,
    marginTop: -10,
  },
  modeButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  modeText: {
    fontSize: 13,
    lineHeight: 18.5,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  sideAction: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sideActionEnd: {
    alignItems: 'flex-end',
  },
  libraryIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  switchIcon: {
    width: 28,
    height: 28,
  },
  shutterPlaceholder: {
    width: 68,
    height: 68,
  },
  shutterSafeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 14,
  },
  shutterWrap: {
    alignItems: 'center',
    paddingBottom: 38,
  },
  doneButton: {
    width: 58,
    height: 32,
    borderRadius: 6.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 17,
    fontWeight: '500',
  },
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  unavailableText: {
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  unavailableClose: {
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  unavailableLibrary: {
    height: 44,
    marginTop: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableDone: {
    height: 44,
    marginTop: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
