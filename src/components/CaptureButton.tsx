import { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Vibration,
} from 'react-native';
import type { CaptureMode, MultiCaptureTheme } from '../types';

interface CaptureButtonProps {
  mode: CaptureMode;
  isRecording: boolean;
  disabled: boolean;
  enableHaptics: boolean;
  onPress: () => void;
  onHapticFeedback?: () => void;
  theme: MultiCaptureTheme;
  accessibilityLabel: string;
  testID?: string;
}

export function CaptureButton({
  mode,
  isRecording,
  disabled,
  enableHaptics,
  onPress,
  onHapticFeedback,
  theme,
  accessibilityLabel,
  testID,
}: CaptureButtonProps) {
  const pressProgress = useRef(new Animated.Value(0)).current;
  const recordingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(recordingProgress, {
      toValue: isRecording ? 1 : 0,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [isRecording, recordingProgress]);

  const animatePress = (pressed: boolean) => {
    Animated.timing(pressProgress, {
      toValue: pressed ? 1 : 0,
      duration: 100,
      useNativeDriver: false,
    }).start();
    if (!enableHaptics || disabled) return;
    if (onHapticFeedback) {
      onHapticFeedback();
    } else if (Platform.OS === 'android') {
      Vibration.vibrate(8);
    }
  };

  const photoSize = pressProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [52, 44],
  });
  const videoSize = Animated.add(
    Animated.multiply(
      recordingProgress,
      Animated.add(24, Animated.multiply(pressProgress, -4))
    ),
    Animated.multiply(
      Animated.add(1, Animated.multiply(recordingProgress, -1)),
      Animated.add(52, Animated.multiply(pressProgress, -8))
    )
  );
  const videoRadius = recordingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 6],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.outer,
          {
            borderColor: theme.textColor,
            opacity: disabled ? 0.52 : 1,
          },
        ]}
      >
        <Animated.View
          style={{
            width: mode === 'photo' ? photoSize : videoSize,
            height: mode === 'photo' ? photoSize : videoSize,
            borderRadius: mode === 'photo' ? 60 : videoRadius,
            backgroundColor:
              mode === 'photo' ? theme.textColor : theme.dangerColor,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 68,
    height: 68,
    borderRadius: 68,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
