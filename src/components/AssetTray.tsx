import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'react-native-video';
import { cameraIcons } from '../icons';
import type {
  CaptureAsset,
  CaptureRenderAssetContext,
  MultiCaptureStrings,
  MultiCaptureTheme,
} from '../types';

interface AssetTrayProps {
  assets: readonly CaptureAsset[];
  pendingCount: number;
  theme: MultiCaptureTheme;
  strings: MultiCaptureStrings;
  onRemove: (id: string) => void;
  onPreviewAsset?: (asset: CaptureAsset, index: number) => void;
  renderAsset?: (context: CaptureRenderAssetContext) => React.ReactElement;
}

interface AssetThumbnailProps {
  asset: CaptureAsset;
  index: number;
  theme: MultiCaptureTheme;
  strings: MultiCaptureStrings;
  onRemove: () => void;
  onPreview?: () => void;
  renderAsset?: (context: CaptureRenderAssetContext) => React.ReactElement;
}

function VideoThumbnail({
  asset,
  backgroundColor,
}: {
  asset: CaptureAsset;
  backgroundColor: string;
}) {
  const player = useVideoPlayer({ uri: asset.uri }, (videoPlayer) => {
    videoPlayer.disableAudioSessionManagement = true;
    videoPlayer.muted = true;
    videoPlayer.playInBackground = false;
    videoPlayer.playWhenInactive = false;
  });

  return (
    <VideoView
      keepScreenAwake={false}
      player={player}
      pointerEvents="none"
      resizeMode="cover"
      style={{ width: '100%', height: '100%', backgroundColor }}
      surfaceType="texture"
    />
  );
}

function AssetThumbnail({
  asset,
  index,
  theme,
  strings,
  onRemove,
  onPreview,
  renderAsset,
}: AssetThumbnailProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const remove = () => {
    if (isRemoving) return;
    setIsRemoving(true);
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onRemove();
    });
  };

  return (
    <Animated.View
      style={[
        styles.assetOuter,
        {
          opacity: progress,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="imagebutton"
        disabled={!onPreview}
        onPress={onPreview}
        style={styles.asset}
      >
        {renderAsset ? (
          renderAsset({ asset, index, remove })
        ) : asset.type === 'photo' ? (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={{ uri: asset.uri }}
            style={styles.preview}
          />
        ) : (
          <View style={styles.videoPreview}>
            <VideoThumbnail
              asset={asset}
              backgroundColor={theme.backgroundColor}
            />
            <Image source={cameraIcons.filePlay} style={styles.playIcon} />
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${strings.removeAsset} ${index + 1}`}
        hitSlop={8}
        onPress={remove}
        style={styles.remove}
      >
        <Image source={cameraIcons.fileClose} style={styles.removeIcon} />
      </Pressable>
    </Animated.View>
  );
}

export function AssetTray({
  assets,
  pendingCount,
  theme,
  strings,
  onRemove,
  onPreviewAsset,
  renderAsset,
}: AssetTrayProps) {
  if (assets.length === 0 && pendingCount === 0) {
    return null;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {assets.map((asset, index) => (
        <AssetThumbnail
          asset={asset}
          index={index}
          key={asset.id}
          onPreview={
            onPreviewAsset ? () => onPreviewAsset(asset, index) : undefined
          }
          onRemove={() => onRemove(asset.id)}
          renderAsset={renderAsset}
          strings={strings}
          theme={theme}
        />
      ))}
      {Array.from({ length: pendingCount }, (_, index) => (
        <View
          accessibilityLabel={strings.processing}
          key={`pending-${index}`}
          style={[
            styles.pending,
            {
              backgroundColor: theme.overlayColor,
            },
          ]}
        >
          <Text style={[styles.pendingText, { color: theme.textColor }]}>
            …
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 10,
  },
  assetOuter: {
    width: 36,
    height: 36,
    borderRadius: 6,
    position: 'relative',
    marginRight: 18,
  },
  asset: {
    width: 36,
    height: 36,
    borderRadius: 6,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    position: 'absolute',
    width: 14,
    height: 14,
  },
  remove: {
    position: 'absolute',
    right: -7,
    top: -7,
    width: 16,
    height: 16,
  },
  removeIcon: {
    width: 16,
    height: 16,
  },
  pending: {
    width: 36,
    height: 36,
    marginRight: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {
    fontSize: 20,
    lineHeight: 22,
    marginTop: -5,
  },
});
