import { useRef } from 'react';
import { Modal, View } from 'react-native';
import { MultiCaptureCamera } from './MultiCaptureCamera';
import type { MultiCaptureCameraRef, MultiCaptureModalProps } from './types';

export function MultiCaptureModal({
  visible,
  modalProps,
  style,
  ...cameraProps
}: MultiCaptureModalProps) {
  const cameraRef = useRef<MultiCaptureCameraRef>(null);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      hardwareAccelerated
      presentationStyle="fullScreen"
      statusBarTranslucent
      {...modalProps}
      onRequestClose={() => void cameraRef.current?.requestClose()}
      visible={visible}
    >
      <View style={{ flex: 1 }}>
        <MultiCaptureCamera {...cameraProps} ref={cameraRef} style={style} />
      </View>
    </Modal>
  );
}
