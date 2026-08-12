# API 参考

[简体中文](API.zh-CN.md) | [English](API.en.md)

## MultiCaptureModal

`MultiCaptureModal` 是推荐入口。它使用 React Native 原生 `Modal` 包装
`MultiCaptureCamera`，并把 Android 返回键导向同一关闭流程。

```tsx
<MultiCaptureModal
  visible={visible}
  onDone={handleDone}
  onCancel={handleCancel}
/>
```

除 `visible`、`modalProps` 外，它接受 `MultiCaptureCamera` 的全部属性。

### Modal 专属属性

| 属性         | 类型                    | 说明                                                 |
| ------------ | ----------------------- | ---------------------------------------------------- |
| `visible`    | `boolean`               | 由宿主控制显示 / 隐藏；为 `false` 时相机子树不会挂载 |
| `modalProps` | `Omit<ModalProps, ...>` | 透传给 RN Modal 的安全属性                           |

`presentationStyle` 固定为 `fullScreen`，`onRequestClose` 由组件接管。

## MultiCaptureCamera

### 拍摄配置

| 属性                    | 类型                            | 默认值    | 说明                               |
| ----------------------- | ------------------------------- | --------- | ---------------------------------- |
| `maxAssets`             | `number`                        | `10`      | 文件与在途任务的总上限，最小值为 1 |
| `mediaType`             | `'photo' \| 'video' \| 'mixed'` | `'photo'` | 捕获类型                           |
| `initialMode`           | `'photo' \| 'video'`            | `'photo'` | mixed 初始页签；video 模式固定为 video |
| `initialCameraPosition` | `'front' \| 'back'`             | `'back'`  | 初始相机                           |
| `initialAssets`         | `readonly CaptureAssetInput[]`  | `[]`      | 会话已有文件                       |
| `enableAudio`           | `boolean`                       | `false`   | 录像录音；开启后麦克风权限变为必需 |
| `isActive`              | `boolean`                       | `true`    | 额外的相机会话开关                 |
| `maxVideoDuration`      | `number`                        | -         | 单段视频最大秒数                   |
| `maxVideoFileSize`      | `number`                        | -         | 单段视频最大字节数                 |
| `showFlashControl`      | `boolean`                       | `true`    | 后置设备有闪光灯时显示控制         |
| `showCaptureCount`      | `boolean`                       | `false`   | 顶部显示当前数量 / 上限            |
| `enableZoomGesture`     | `boolean`                       | `true`    | VisionCamera 原生缩放手势          |
| `enableTapToFocus`      | `boolean`                       | `true`    | 设备支持时启用点按对焦和对焦框动画 |
| `enableHaptics`         | `boolean`                       | `false`   | 快门按下/抬起时触发轻震动          |
| `enablePreview`         | `boolean`                       | `true`    | 点击缩略图打开内置全屏媒体预览     |
| `enableLibraryPicker`   | `boolean`                       | `true`    | 显示内置系统相册选择入口           |

Android 使用内置震动时，宿主必须声明
`<uses-permission android:name="android.permission.VIBRATE" />`。也可传
`onHapticFeedback` 接入宿主已有的触觉反馈实现，此时组件不会调用 RN
`Vibration`。

组件还会监听 AppState。只有 `isActive`、App 在前台、权限通过并且设备存在时，
VisionCamera Session 才保持 active。

### VisionCamera 配置

| 属性                   | 类型                                                      | 说明                                 |
| ---------------------- | --------------------------------------------------------- | ------------------------------------ |
| `photoOutputOptions`   | `Partial<PhotoOutputOptions>`                             | 传给 `usePhotoOutput`                |
| `videoOutputOptions`   | `Partial<VideoOutputOptions>`                             | 传给 `useVideoOutput`                |
| `photoCaptureSettings` | `CapturePhotoSettings \| (flash) => CapturePhotoSettings` | 每次拍照设置                         |
| `recorderSettings`     | `RecorderSettings`                                        | 每段录像创建 Recorder 时使用         |
| `cameraProps`          | `CaptureCameraProps`                                      | 受控透传的 Camera 配置和生命周期回调 |

组件固定管理 `device`、`outputs`、`isActive`、手势和 Camera error；这些关键字段
不能通过 `cameraProps` 覆盖。

`maxVideoDuration` / `maxVideoFileSize` 的优先级高于 `recorderSettings` 中的同名字段。

### 权限

| 属性                     | 类型      | 默认值 | 说明                     |
| ------------------------ | --------- | ------ | ------------------------ |
| `autoRequestPermissions` | `boolean` | `true` | 首次挂载自动请求必要权限 |

权限被永久拒绝后，权限页会调用 `Linking.openSettings()`。权限页仍保留内置相册入口；
用户可以不授权摄像头，直接选择照片或视频、进入预览并完成提交。

相册按钮会尝试读取系统相册最新一张照片作为缩略图。iOS 使用
`NSPhotoLibraryUsageDescription`；Android 33+ 使用 `READ_MEDIA_IMAGES`，旧版本使用
`READ_EXTERNAL_STORAGE`。拒绝该读取权限只会回退到默认图标，系统选择器仍可使用。

### 相册选择与适配器

#### openLibrary

默认无需传入。组件使用系统照片选择器，根据 `remaining` 限制多选数量，选择完成后
自动进入内置预览。`enableLibraryPicker={false}` 会隐藏所有相册入口。

如果宿主已有定制相册，可通过 `openLibrary` 覆盖默认选择器：

```ts
type OpenLibrary = (context: {
  assets: readonly CaptureAsset[];
  remaining: number;
  mediaType: 'photo' | 'video' | 'mixed';
}) => Promise<readonly CaptureAssetInput[] | null>;
```

- `null` 表示用户取消；未传 `openLibrary` 时使用内置系统选择器。
- 超过 `remaining` 的结果会被截断并报告 `limit-reached`。
- 与 `mediaType` 不一致的文件会被忽略。
- 每个相册文件也会经过 `processAsset`。

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

适合压缩、水印、补全尺寸、计算 hash 或移动到应用目录。抛错时该文件不会加入结果，
并触发 `asset-processing-failed`。

### 回调

| 属性               | 类型                                       | 说明                       |
| ------------------ | ------------------------------------------ | -------------------------- |
| `onAssetsChange`   | `(assets) => void`                         | 成功增加或删除文件后调用   |
| `onDone`           | `(assets) => void \| Promise<void>`        | 必填；照片链完成后调用     |
| `onCancel`         | `(assets) => void`                         | 必填；关闭被允许后调用     |
| `onRequestClose`   | `(context) => boolean \| Promise<boolean>` | 返回是否允许关闭           |
| `onError`          | `(error: MultiCaptureError) => void`       | 所有可恢复错误             |
| `onHapticFeedback` | `() => void`                               | 自定义快门触觉反馈         |
| `onPreviewAsset`   | `(asset, index) => void`                   | 覆盖内置预览并交给宿主预览 |

`onDone` 抛错或 reject 时会触发 `completion-failed`，组件保持打开。

默认预览支持照片与视频，并可左右滑动查看本次拍摄的全部文件。视频使用系统播放控件，
顶部“完成”可以直接提交当前文件集合；打开预览时相机会暂停，关闭后恢复。设置
`enablePreview={false}` 可关闭内置预览；传入 `onPreviewAsset` 时，该回调优先于
内置预览。

### UI 定制

| 属性          | 类型                           | 说明                        |
| ------------- | ------------------------------ | --------------------------- |
| `locale`      | `'zh-CN' \| 'en'`              | 默认 `zh-CN`                |
| `strings`     | `Partial<MultiCaptureStrings>` | 覆盖当前语言中的部分文案    |
| `theme`       | `Partial<MultiCaptureTheme>`   | 覆盖颜色 token              |
| `renderAsset` | `(context) => ReactElement`    | 自定义底部缩略图内容        |
| `style`       | `StyleProp<ViewStyle>`         | 根容器样式                  |
| `testID`      | `string`                       | 默认 `multi-capture-camera` |

`renderAsset` 只替换卡片内部内容，删除按钮和布局仍由组件维护。

组件导出 `zhCNStrings`、`enStrings` 和 `multiCaptureLocales`。`strings`
优先级最高，适合接入 i18next、react-intl 或宿主自己的文案系统。

## Imperative Ref

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

普通业务优先使用内置 UI 和声明式回调。Ref 主要用于自定义外层导航、硬件按键或自动化。

## CaptureAssetInput

至少提供 `path` 或 `uri`，并提供 `type`：

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

缺少 `id`、`fileName` 或 `mimeType` 时，组件根据路径和类型生成安全默认值。

## MultiCaptureError

```ts
interface MultiCaptureError {
  code: MultiCaptureErrorCode;
  message: string;
  cause?: unknown;
}
```

错误码：

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

权限页本身会显示状态；系统拒绝权限时不反复弹出 request。
