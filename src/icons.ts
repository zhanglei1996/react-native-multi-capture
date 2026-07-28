import type { ImageSourcePropType } from 'react-native';

export const cameraIcons = {
  close: require('../assets/CountCamera/icon_close.png') as ImageSourcePropType,
  fileClose:
    require('../assets/CountCamera/icon_file_close.png') as ImageSourcePropType,
  filePlay:
    require('../assets/CountCamera/icon_file_play.png') as ImageSourcePropType,
  noPermission:
    require('../assets/CountCamera/icon_no_permission.png') as ImageSourcePropType,
  photoDefault:
    require('../assets/CountCamera/icon_photo_default.png') as ImageSourcePropType,
  flashOff:
    require('../assets/CountCamera/icon_sgd_open.png') as ImageSourcePropType,
  flashOn:
    require('../assets/CountCamera/icon_sgd_close.png') as ImageSourcePropType,
  switchCamera:
    require('../assets/CountCamera/icon_toggle_camera.png') as ImageSourcePropType,
  videoPause:
    require('../assets/CountCamera/icon_video_pause.png') as ImageSourcePropType,
  videoPlay:
    require('../assets/CountCamera/icon_video_play.png') as ImageSourcePropType,
} as const;
