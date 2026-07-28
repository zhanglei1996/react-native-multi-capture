# MultiCaptureExample

这是 `react-native-multi-capture` 的真实 React Native CLI 测试工程。

- React Native 0.86.2
- VisionCamera 5.2.0
- iOS / Android 权限已配置
- 覆盖纯拍照和照片 + 录像两种入口
- 默认中文界面，并开启快门轻触反馈
- 展示原 CountCamera 图标、4:3 照片取景、对焦框和录像动画
- 点击拍摄缩略图可全屏预览照片或播放视频
- 演示异步防误退与最终文件列表

从仓库根目录安装：

```bash
corepack yarn install
```

iOS：

```bash
cd example
bundle install
bundle exec pod install --project-directory=ios
cd ..
corepack yarn example ios
```

RN 0.86 / VisionCamera 5 的本 example 与 CI 使用 Xcode 26。Xcode 16.2 的
Swift 编译器会在 Nitro 生成的 Swift / C++ bridge 上崩溃。

Android：

```bash
corepack yarn example android
```

请使用真机验证拍照、录像、前后摄像头和系统权限流程。
