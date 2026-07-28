import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { MultiCaptureTheme } from '../types';

export interface FocusPoint {
  x: number;
  y: number;
  sequence: number;
}

interface FocusBoxProps {
  point?: FocusPoint;
  containerWidth: number;
  containerHeight: number;
  theme: MultiCaptureTheme;
  size?: number;
}

export function FocusBox({
  point,
  containerWidth,
  containerHeight,
  theme,
  size = 100,
}: FocusBoxProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1.3)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const position = useMemo(() => {
    if (!point) return { left: 0, top: 0 };
    return {
      left: Math.max(0, Math.min(point.x - size / 2, containerWidth - size)),
      top: Math.max(0, Math.min(point.y - size / 2, containerHeight - size)),
    };
  }, [containerHeight, containerWidth, point, size]);

  useEffect(() => {
    if (!point) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    opacity.stopAnimation();
    scale.stopAnimation();
    opacity.setValue(0);
    scale.setValue(1.3);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    timerRef.current = setTimeout(() => {
      opacity.setValue(0);
      scale.setValue(1.3);
    }, 2000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [opacity, point, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.box,
        position,
        {
          width: size,
          height: size,
          borderColor: theme.focusColor,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View
        style={[
          styles.horizontalTick,
          styles.leftTick,
          { backgroundColor: theme.focusColor },
        ]}
      />
      <View
        style={[
          styles.horizontalTick,
          styles.rightTick,
          { backgroundColor: theme.focusColor },
        ]}
      />
      <View
        style={[
          styles.verticalTick,
          styles.topTick,
          { backgroundColor: theme.focusColor },
        ]}
      />
      <View
        style={[
          styles.verticalTick,
          styles.bottomTick,
          { backgroundColor: theme.focusColor },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
  },
  horizontalTick: {
    position: 'absolute',
    top: 47,
    width: 10,
    height: 2,
  },
  verticalTick: {
    position: 'absolute',
    left: 47,
    width: 2,
    height: 10,
  },
  leftTick: {
    left: 0,
  },
  rightTick: {
    right: 0,
  },
  topTick: {
    top: 0,
  },
  bottomTick: {
    bottom: 0,
  },
});
