# react-native-multi-capture

一个面向现场作业场景的 React Native 连续拍照 / 录像组件。它基于
VisionCamera 5，重点解决快速连拍、数量限制、在途任务串行化、权限、录像状态和
最终批量确认，同时保持运行时依赖尽可能少。

## 真机演示

[![React Native Multi Capture 真机演示](https://raw.githubusercontent.com/zhanglei1996/react-native-multi-capture/main/docs/media/demo-cover.png)](https://github.com/zhanglei1996/react-native-multi-capture/blob/main/docs/media/demo.mp4)

点击图片播放 19 秒真机录屏。演示包含连续拍照、录像、缩略图以及照片 / 视频全屏预览。

## 设计目标

- 连续点击快门时，立即预占数量并串行执行原生拍照，避免并发调用相机。
- 同时支持 `photo`、`video`、`mixed` 三种模式。
- 相册、压缩、水印、上传前处理全部通过适配器注入，不强绑具体三方库。
- 动画只使用 React Native 自带的 `Animated`。
- UI 不依赖图标库、手势库或安全区库；视频预览仅使用
  `react-native-video`。
- 默认中文，内置 `zh-CN` / `en` 两套文案，也允许逐项覆盖。
- 还原旧 CountCamera 的 4:3 取景、原始图标、对焦框、快门形变、缩略图进出场、
  模式切换和录像控制层动画。
- 提供组件模式和全屏 `Modal` 模式，完整导出 TypeScript 类型。
- example 是真实的 React Native CLI iOS / Android 工程。

## 兼容性

截至 2026-07-29：

| 项目                       | 范围                                           |
| -------------------------- | ---------------------------------------------- |
| React Native               | `>= 0.79`；example 使用 `0.86.2`               |
| React                      | `>= 19`；example 使用 `19.2.3`                 |
| react-native-vision-camera | `>= 5.0 < 6`；example 使用 `5.2.0`             |
| react-native-video         | `>= 7.0.0-beta.10 < 8`；用于内置视频预览       |
| iOS                        | `>= 15.1`；RN 0.86 example / CI 使用 Xcode 26  |
| Android                    | 跟随 React Native 与 VisionCamera 5 的平台要求 |
| New Architecture           | 支持；example 使用当前 RN 默认架构             |

React Native 0.85 和 0.86 是编写本版本时的上游活跃版本。较旧 RN
版本即使满足 peer range，也应在应用自己的原生构建环境中验证。VisionCamera 4
的 API 与 5 不兼容，本库不通过运行时判断同时兼容两个大版本。

VisionCamera 5 使用 Nitro 生成的 Swift / C++ bridge。RN 0.86 example 的 iOS
构建基线是 Xcode 26；Xcode 16.2 的 `swift-frontend` 会在这些生成代码上崩溃。

## 安装

```bash
yarn add react-native-multi-capture \
  react-native-vision-camera \
  react-native-nitro-modules \
  react-native-nitro-image \
  react-native-video@7.0.0-beta.10
```

或：

```bash
npm install react-native-multi-capture \
  react-native-vision-camera \
  react-native-nitro-modules \
  react-native-nitro-image \
  react-native-video@7.0.0-beta.10
```

`react-native-video` v7 当前仍为 beta，但它与 VisionCamera 5 使用的 Media3
版本兼容；v6 在 Android 上可能与 VisionCamera 5 产生 Media3 ABI 冲突。

iOS 安装 Pods：

```bash
npx pod-install
```

### iOS 权限

在应用的 `Info.plist` 中添加：

```xml
<key>NSCameraUsageDescription</key>
<string>用于拍摄现场照片和视频</string>
<key>NSMicrophoneUsageDescription</key>
<string>用于录制带声音的视频</string>
```

如果不启用带声音录像，可不配置麦克风权限，并保持 `enableAudio={false}`。

### Android 权限

在 `android/app/src/main/AndroidManifest.xml` 中添加：

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

组件只返回 VisionCamera 临时目录内的文件，不需要存储权限。相册适配器若有额外权限
要求，请按所选相册库的说明配置。

若启用 `enableHaptics` 且未传入自定义 `onHapticFeedback`，还需声明：

```xml
<uses-permission android:name="android.permission.VIBRATE" />
```

`enableHaptics` 默认关闭，避免组件在宿主未声明震动权限时产生原生异常。

修改权限或原生依赖后需要重新编译 App，Metro 热更新不能完成原生安装。

## 最小用法

推荐使用受控的全屏 Modal：

```tsx
import { useState } from 'react';
import {
  MultiCaptureModal,
  type CaptureAsset,
} from 'react-native-multi-capture';

export function WorkOrderCamera() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button title="拍摄" onPress={() => setVisible(true)} />

      <MultiCaptureModal
        visible={visible}
        maxAssets={12}
        mediaType="photo"
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

`onDone` 可以返回 Promise。执行期间组件会锁定冲突操作，避免重复提交。

## 照片 + 视频

```tsx
<MultiCaptureModal
  visible={visible}
  mediaType="mixed"
  enableAudio
  maxAssets={8}
  maxVideoDuration={30}
  onDone={handleDone}
  onCancel={handleCancel}
/>
```

`enableAudio` 默认为 `false`，因此纯拍照场景不会请求麦克风权限。

## 中文与国际化

默认不需要配置即为中文：

```tsx
<MultiCaptureModal visible={visible} ... />
```

切换内置英文：

```tsx
<MultiCaptureModal visible={visible} locale="en" ... />
```

业务可以在任一语言基础上覆盖个别文案：

```tsx
<MultiCaptureModal
  visible={visible}
  locale="zh-CN"
  strings={{ done: '提交' }}
  ...
/>
```

也可以导入 `zhCNStrings`、`enStrings` 或 `multiCaptureLocales`，构建自己的语言包。

## 照片与视频预览

拍摄完成后点击底部缩略图即可进入内置全屏预览：

- 照片使用 `contain` 模式查看，可左右滑动切换本次拍摄的所有文件。
- 视频进入页面后自动播放，并提供 iOS / Android 原生播放控制。
- 预览打开期间相机会暂停，关闭预览后自动恢复。

`enablePreview` 默认为 `true`。若宿主已有统一媒体预览器，可传
`onPreviewAsset`；此时点击缩略图会调用该回调，不再打开内置预览。

## 防误退

组件不内置业务风格的确认弹窗。通过 `onRequestClose` 决定是否允许关闭：

```tsx
<MultiCaptureModal
  visible={visible}
  onRequestClose={async ({ assets, isBusy }) => {
    if (isBusy) return false;
    if (assets.length === 0) return true;
    return await showDiscardConfirm();
  }}
  onCancel={() => setVisible(false)}
  onDone={handleDone}
/>
```

没有提供 `onRequestClose` 时，空闲状态允许关闭，拍摄或处理中的状态拒绝关闭。

## 相册适配器

本库不依赖任何 image picker。宿主应用把已有相册库转换为统一的数据结构即可：

```tsx
<MultiCaptureModal
  visible={visible}
  openLibrary={async ({ remaining, mediaType }) => {
    const picked = await yourPicker({
      limit: remaining,
      mediaType,
    });

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
  onDone={handleDone}
  onCancel={handleCancel}
/>
```

只有传入 `openLibrary` 时，界面才显示相册入口。

## 压缩、水印或上传前处理

`processAsset` 位于串行捕获链内部。处理完成前文件处于“在途”状态，不会提前允许
完成提交：

```tsx
<MultiCaptureModal
  visible={visible}
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
  onDone={handleDone}
  onCancel={handleCancel}
/>
```

库本身不删除原文件或处理后文件。上传成功后的持久化、移动与清理策略由宿主应用负责。

## 返回数据

```ts
interface CaptureAsset {
  id: string;
  uri: string; // 适合 React Native Image / 上传库
  path: string; // 去掉 file:// 的路径；非 file URI 会原样保留
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

VisionCamera 5 的 `capturePhotoToFile()` 和 Recorder 都返回临时文件路径。视频
`duration` 是组件记录的近似秒数；如上传接口需要精确媒体元数据，可在
`processAsset` 中用宿主已有的媒体工具补齐。

## 核心 Props

| Prop                    | 类型                            | 默认值    | 说明                               |
| ----------------------- | ------------------------------- | --------- | ---------------------------------- |
| `maxAssets`             | `number`                        | `10`      | 最终文件与在途文件的共同上限       |
| `mediaType`             | `'photo' \| 'video' \| 'mixed'` | `'photo'` | 可用媒体类型                       |
| `initialMode`           | `'photo' \| 'video'`            | `'photo'` | mixed 模式初始页签                 |
| `initialCameraPosition` | `'front' \| 'back'`             | `'back'`  | 初始摄像头                         |
| `enableAudio`           | `boolean`                       | `false`   | 录像是否录音                       |
| `enableHaptics`         | `boolean`                       | `false`   | 使用 RN Vibration 恢复快门轻触反馈 |
| `enablePreview`         | `boolean`                       | `true`    | 内置照片/视频全屏预览              |
| `maxVideoDuration`      | `number`                        | -         | 单段录像最大秒数                   |
| `openLibrary`           | `function`                      | -         | 可选相册适配器                     |
| `processAsset`          | `function`                      | -         | 串行文件处理适配器                 |
| `onPreviewAsset`        | `function`                      | -         | 覆盖内置预览并交给宿主媒体预览器   |
| `onAssetsChange`        | `function`                      | -         | 增删或处理完成时回调               |
| `onDone`                | `function`                      | 必填      | 完成回调，可异步                   |
| `onCancel`              | `function`                      | 必填      | 关闭回调                           |
| `onRequestClose`        | `function`                      | -         | 防误退判定                         |
| `onError`               | `function`                      | -         | 结构化错误回调                     |
| `locale`                | `'zh-CN' \| 'en'`               | `'zh-CN'` | 内置语言                           |
| `strings`               | `Partial<MultiCaptureStrings>`  | -         | 在当前语言上覆盖文案               |
| `theme`                 | `Partial<MultiCaptureTheme>`    | 深色      | 颜色覆盖                           |

完整接口见 [docs/API.zh-CN.md](docs/API.zh-CN.md)。

## 直接作为页面使用

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

组件会同时监听 Android 硬件返回键。若使用 `MultiCaptureModal`，Modal 的
`onRequestClose` 会通过组件 ref 进入同一关闭流程。

## 并发和状态保证

1. 点击快门时先同步增加 `pendingCount`，后续快速点击立即看到已占用名额。
2. 所有照片捕获与 `processAsset` 进入同一个 Promise 链，原生拍照不会并发。
3. `onDone` 会等待照片链完成；录像、相册选择和提交期间会锁定冲突操作。
4. 每段视频使用新的 VisionCamera Recorder，符合 V5 Recorder 只能使用一次的要求。
5. 卸载时会取消仍在录制的视频，并阻止异步结果继续更新 React 状态。

## 从旧 CountCamera 迁移

| 旧概念                       | 新 API                                   |
| ---------------------------- | ---------------------------------------- |
| `maxFiles`                   | `maxAssets`                              |
| `mediaType="any"`            | `mediaType="mixed"`                      |
| `cameraMode="multiple"`      | 默认就是连续拍摄                         |
| `cameraMode="single"`        | 使用 `maxAssets={1}`，在 `onDone` 中确认 |
| `defaultCameraPos`           | `initialCameraPosition`                  |
| `onSuccess`                  | `onDone`                                 |
| 内置 ImageCropPicker         | `openLibrary` 适配器                     |
| 内置 compressPhoto           | `processAsset` 适配器                    |
| Reanimated / Gesture Handler | RN Animated / VisionCamera 原生手势      |
| `openCountCamera()` 全局命令 | 受控 `MultiCaptureModal`                 |

旧组件中的条码识别属于独立能力。VisionCamera 5 已把扫码拆为单独包，因此本库没有
默认引入扫码依赖；业务需要时可在上层组合扫码流程。

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

相机功能必须在真机测试。模拟器可用于检查权限页和非相机 UI，但不能代表真实捕获。

## 开发验证

```bash
corepack yarn typecheck
corepack yarn lint
corepack yarn test
corepack yarn prepare
corepack yarn pack:check
```

架构和扩展点见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## License

MIT
