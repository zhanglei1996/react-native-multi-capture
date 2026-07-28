import type {
  MultiCaptureLocale,
  MultiCaptureStrings,
  MultiCaptureTheme,
} from './types';

export const zhCNStrings: MultiCaptureStrings = {
  photoMode: '照片',
  videoMode: '视频',
  done: '完成',
  cancel: '关闭',
  retake: '重拍',
  openSettings: '去开启权限',
  permissionTitle: '需要相机权限',
  cameraPermissionMessage: '请开启相机权限，以便拍摄照片和视频',
  microphonePermissionMessage: '请开启麦克风权限，以便录制带声音的视频',
  cameraAndMicrophonePermissionMessage:
    '请开启相机和麦克风权限，以便拍摄照片和视频',
  requestPermission: '继续授权',
  cameraUnavailable: '当前设备没有可用的相机',
  processing: '照片处理中，请稍候',
  stoppingRecording: '正在保存视频…',
  maxReached: '已达到拍摄数量上限',
  capturePhoto: '拍照',
  startRecording: '开始录像',
  stopRecording: '停止录像',
  switchCamera: '切换摄像头',
  flash: '闪光灯',
  openLibrary: '打开相册',
  selectFromLibrary: '相册选择',
  removeAsset: '删除拍摄内容',
  flashEnabled: '已开启闪光灯',
  flashDisabled: '已关闭闪光灯',
  previewAsset: '预览拍摄内容',
  closePreview: '关闭预览',
  previewLoadFailed: '无法加载此文件',
};

export const enStrings: MultiCaptureStrings = {
  photoMode: 'PHOTO',
  videoMode: 'VIDEO',
  done: 'Done',
  cancel: 'Close',
  retake: 'Retake',
  openSettings: 'Open settings',
  permissionTitle: 'Camera access required',
  cameraPermissionMessage: 'Allow camera access to capture photos and videos.',
  microphonePermissionMessage:
    'Allow microphone access to record video with sound.',
  cameraAndMicrophonePermissionMessage:
    'Allow camera and microphone access to capture media.',
  requestPermission: 'Continue',
  cameraUnavailable: 'No camera is available on this device.',
  processing: 'Processing…',
  stoppingRecording: 'Saving video…',
  maxReached: 'Capture limit reached',
  capturePhoto: 'Capture photo',
  startRecording: 'Start recording',
  stopRecording: 'Stop recording',
  switchCamera: 'Switch camera',
  flash: 'Flash',
  openLibrary: 'Open photo library',
  selectFromLibrary: 'Choose from library',
  removeAsset: 'Remove capture',
  flashEnabled: 'Flash enabled',
  flashDisabled: 'Flash disabled',
  previewAsset: 'Preview capture',
  closePreview: 'Close preview',
  previewLoadFailed: 'Unable to load this file',
};

export const multiCaptureLocales: Record<
  MultiCaptureLocale,
  MultiCaptureStrings
> = {
  'zh-CN': zhCNStrings,
  'en': enStrings,
};

/** Chinese is intentionally the default to match the original CountCamera UI. */
export const defaultStrings = zhCNStrings;

export const defaultTheme: MultiCaptureTheme = {
  backgroundColor: '#000000',
  overlayColor: 'rgba(0,0,0,0.7)',
  textColor: '#FFFFFF',
  mutedTextColor: '#C9CDD4',
  accentColor: '#6AA1FF',
  dangerColor: '#F53F3F',
  borderColor: 'rgba(255,255,255,0.78)',
  focusColor: '#FFB601',
};
