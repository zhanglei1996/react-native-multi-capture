# react-native-multi-capture

[简体中文](README.md) | [English](README.en.md)

基于 VisionCamera 5 的 React Native 连续拍照 / 录像组件，适合巡检、工单、取证、
附件采集等需要“一次拍摄多个文件”的场景。

组件内置相机权限页、系统相册选择、最新照片缩略图、照片 / 视频预览、数量限制、
录像状态和最终批量确认；宿主只需控制显示状态并处理最终文件。

[安装](#安装) · [平台配置](#平台配置) · [快速开始](#快速开始) ·
[核心 Props](#核心-props) · [高级用法](#高级用法) · [兼容性](#兼容性)

## 功能概览

- 连续拍照，快速点击时自动预占名额并串行调用原生相机。
- 支持 `photo`、`video`、`mixed` 三种媒体模式。
- 内置系统相册多选，自动遵守剩余文件数量和媒体类型。
- 内置照片 / 视频全屏预览，可左右滑动并直接完成提交；缩略图列表支持删除。
- 相册按钮显示系统相册最新照片；没有读取权限时回退到默认图标。
- 完整的相机 / 麦克风权限请求、永久拒绝和无可用设备页面。
- 前后镜头切换使用原生 BlurView，在新相机会话启动后平滑淡出。
- 支持点按对焦、原生缩放手势、闪光灯、录像时长与文件大小限制。
- 内置中文和英文文案，支持主题、文案、缩略图与业务处理流程覆盖。
- 提供页面组件和受控全屏 `Modal` 两种使用方式。

## 真机演示

| 界面截图 | 动态演示（点击打开 MP4） |
| --- | --- |
| <img src="https://raw.githubusercontent.com/zhanglei1996/react-native-multi-capture/main/docs/media/demo-cover.webp" alt="React Native Multi Capture 连拍界面" width="300" /> | [<img src="https://raw.githubusercontent.com/zhanglei1996/react-native-multi-capture/main/docs/media/demo.gif" alt="React Native Multi Capture 动态演示" width="300" />](https://github.com/zhanglei1996/react-native-multi-capture/blob/main/docs/media/demo.mp4) |

GIF 可直接在 GitHub README 中预览；点击动态演示可打开约 21 秒的 MP4。

## 安装

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

使用 npm：

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

iOS 安装原生依赖：

```bash
npx pod-install
```

> `react-native-video` v7 当前仍为 beta，但它与 VisionCamera 5 使用的 Media3
> 版本兼容。修改任何原生依赖或权限后都需要重新编译 App，Metro 热更新无法完成
> 原生安装。

## 平台配置

### iOS

在宿主应用的 `Info.plist` 中按需添加：

```xml
<key>NSCameraUsageDescription</key>
<string>用于拍摄现场照片和视频</string>
<key>NSMicrophoneUsageDescription</key>
<string>用于录制带声音的视频</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>用于从相册选择照片和视频</string>
```

- `NSCameraUsageDescription`：必需。
- `NSMicrophoneUsageDescription`：仅在 `enableAudio` 为 `true` 时需要。
- `NSPhotoLibraryUsageDescription`：用于相册选择和读取最新照片缩略图。

### Android

在 `android/app/src/main/AndroidManifest.xml` 中按需添加：

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission
  android:name="android.permission.READ_EXTERNAL_STORAGE"
  android:maxSdkVersion="32" />
```

- `CAMERA`：必需。
- `RECORD_AUDIO`：仅在 `enableAudio` 为 `true` 时需要。
- 图片读取权限只用于显示最新照片缩略图。用户拒绝后会显示默认图标，不影响系统
  Photo Picker。
- Android `minSdkVersion < 30` 且项目没有 `androidx.activity:activity:1.9+` 时，
  需要按 `react-native-image-picker` 文档启用 Photo Picker backport。

若启用 `enableHaptics` 且没有传入 `onHapticFeedback`，还需声明：

```xml
<uses-permission android:name="android.permission.VIBRATE" />
```

## 快速开始

推荐使用受控的全屏 `MultiCaptureModal`：

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
      <Button title="拍摄附件" onPress={() => setVisible(true)} />

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

`onDone` 可以返回 Promise。提交期间组件会锁定冲突操作，避免重复提交。
`enableAudio` 默认为 `false`；需要录制声音时显式传入 `enableAudio`。

## 内置交互

### 相册选择与预览

相册入口默认开启，不需要传 `openLibrary`：

- 根据 `mediaType` 和剩余数量配置系统选择器。
- 选择结束后自动进入内置全屏预览。
- 照片使用 `contain` 模式显示；视频自动播放并提供系统控制条。
- 可以左右滑动查看本次会话的全部文件。
- 预览顶部可直接完成提交。
- 摄像头无权限或设备没有可用相机时，仍可从相册选择并完成提交。

传入 `enableLibraryPicker={false}` 可隐藏相册入口；传入
`enablePreview={false}` 可关闭内置预览。宿主已有媒体查看器时，可以使用
`onPreviewAsset` 接管预览。

### 权限页面

`autoRequestPermissions` 默认为 `true`。首次进入会请求必要权限；永久拒绝后显示
“去开启权限”并打开系统设置。开启录音时，麦克风权限也会成为必要权限。

### 防误退

通过 `onRequestClose` 接入宿主自己的确认弹窗：

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

没有提供 `onRequestClose` 时，空闲状态允许关闭，拍摄或处理中拒绝关闭。

### 中文、英文与主题

界面默认使用中文。切换内置英文：

```tsx
<MultiCaptureModal locale="en" {...props} />
```

覆盖部分文案或颜色：

```tsx
<MultiCaptureModal
  strings={{ done: '提交' }}
  theme={{ accentColor: '#4F8CFF' }}
  {...props}
/>
```

也可以导入 `zhCNStrings`、`enStrings`、`multiCaptureLocales` 和
`defaultTheme` 构建自己的配置。

## 核心 Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `maxAssets` | `number` | `10` | 已完成文件与在途任务的共同上限 |
| `mediaType` | `'photo' \| 'video' \| 'mixed'` | `'photo'` | 可用媒体类型 |
| `initialMode` | `'photo' \| 'video'` | `'photo'` | mixed 模式初始页签；video 模式固定为 video |
| `initialCameraPosition` | `'front' \| 'back'` | `'back'` | 初始摄像头 |
| `initialAssets` | `CaptureAssetInput[]` | `[]` | 会话初始文件 |
| `enableAudio` | `boolean` | `false` | 录像是否录音 |
| `enablePreview` | `boolean` | `true` | 内置照片 / 视频预览 |
| `enableLibraryPicker` | `boolean` | `true` | 系统相册入口与最新照片缩略图 |
| `enableHaptics` | `boolean` | `false` | 使用 RN Vibration 提供快门触觉反馈 |
| `maxVideoDuration` | `number` | - | 单段录像最大秒数 |
| `maxVideoFileSize` | `number` | - | 单段录像最大字节数 |
| `openLibrary` | `function` | - | 覆盖内置系统选择器 |
| `processAsset` | `function` | - | 串行处理捕获或选择的文件 |
| `onPreviewAsset` | `function` | - | 使用宿主预览器代替内置预览 |
| `onAssetsChange` | `function` | - | 文件增加或删除后的回调 |
| `onDone` | `function` | 必填 | 完成回调，可异步 |
| `onCancel` | `function` | 必填 | 关闭回调 |
| `onRequestClose` | `function` | - | 防误退判定 |
| `onError` | `function` | - | 结构化错误回调 |
| `locale` | `'zh-CN' \| 'en'` | `'zh-CN'` | 内置语言 |
| `strings` | `Partial<MultiCaptureStrings>` | - | 文案覆盖 |
| `theme` | `Partial<MultiCaptureTheme>` | 深色 | 颜色覆盖 |

完整接口见 [中文 API 参考](docs/API.zh-CN.md)。

## 返回数据

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

VisionCamera 捕获结果位于临时目录。库不会自动移动或删除这些文件；上传后的持久化、
移动和清理策略由宿主负责。视频 `duration` 是组件记录的近似秒数，如需精确元数据，
可在 `processAsset` 中补齐。

## 高级用法

### 压缩、水印或上传前处理

`processAsset` 会在文件加入列表前执行，并与拍照任务串行：

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

### 覆盖系统相册选择器

宿主已有定制相册时，可以通过 `openLibrary` 返回统一的 `CaptureAssetInput`：

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

自定义结果同样经过媒体类型过滤、数量限制、`processAsset` 和预览流程。

### 直接作为页面使用

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

## 并发与生命周期保证

1. 快门按下时同步预占数量，连续点击不会突破 `maxAssets`。
2. 拍照和 `processAsset` 共用串行 Promise 链，不会并发调用原生拍照。
3. `onDone` 等待照片处理链结束；录像、相册选择、镜头切换和提交会互斥。
4. 每段视频使用新的 VisionCamera Recorder。
5. 预览或 App 进入后台时暂停相机，返回前台后按条件恢复。
6. 卸载时取消仍在录制的视频，并阻止异步结果继续更新状态。

## 兼容性

| 项目 | 支持范围 |
| --- | --- |
| React Native | `>= 0.79`；example 使用 `0.86.2` |
| React | `>= 19`；example 使用 `19.2.3` |
| react-native-vision-camera | `>= 5.0 < 6`；example 使用 `5.2.0` |
| react-native-video | `>= 7.0.0-beta.10 < 8` |
| react-native-image-picker | `>= 8.2.1 < 9` |
| @react-native-camera-roll/camera-roll | `>= 7.10.2 < 8` |
| @react-native-community/blur | `>= 4.4 < 5` |
| iOS | `>= 15.1` |
| New Architecture | 支持；example 使用 RN 默认新架构 |

VisionCamera 4 与 5 的 API 不兼容，本库仅支持 VisionCamera 5。VisionCamera 5
使用 Nitro 生成的 Swift / C++ bridge，请在宿主应用的 Xcode、NDK 和 React Native
组合中验证原生构建。

## 从旧 CountCamera 迁移

| 旧概念 | 新 API |
| --- | --- |
| `maxFiles` | `maxAssets` |
| `mediaType="any"` | `mediaType="mixed"` |
| `cameraMode="multiple"` | 默认连续拍摄 |
| `cameraMode="single"` | `maxAssets={1}` |
| `defaultCameraPos` | `initialCameraPosition` |
| `onSuccess` | `onDone` |
| ImageCropPicker | 内置系统选择器；`openLibrary` 可覆盖 |
| `compressPhoto` | `processAsset` |
| Reanimated / Gesture Handler | RN Animated / VisionCamera 原生手势 |
| `openCountCamera()` | 受控 `MultiCaptureModal` |

旧组件的条码识别属于独立能力，本库不默认引入扫码依赖。

## 运行 example

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

相机捕获必须在真机测试。模拟器只适合检查权限页和非相机 UI。

## 开发验证

```bash
corepack yarn lint
corepack yarn typecheck
corepack yarn test
corepack yarn prepare
corepack yarn pack:check
```

更多实现说明见 [架构文档](docs/ARCHITECTURE.md)。

## License

MIT
