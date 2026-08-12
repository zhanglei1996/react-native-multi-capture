import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'react-native-video';
import { cameraIcons } from '../icons';
import type {
  CaptureAsset,
  MultiCaptureStrings,
  MultiCaptureTheme,
} from '../types';

interface AssetPreviewProps {
  assets: readonly CaptureAsset[];
  initialIndex: number;
  strings: MultiCaptureStrings;
  theme: MultiCaptureTheme;
  visible: boolean;
  onClose: () => void;
  onDone?: () => void;
  isCompleting?: boolean;
  testID: string;
}

interface PreviewPageProps {
  asset: CaptureAsset;
  active: boolean;
  height: number;
  strings: MultiCaptureStrings;
  textColor: string;
  width: number;
}

interface VideoPreviewPageProps {
  active: boolean;
  asset: CaptureAsset;
  onError: () => void;
}

function VideoPreviewPage({ active, asset, onError }: VideoPreviewPageProps) {
  const player = useVideoPlayer({ uri: asset.uri }, (videoPlayer) => {
    videoPlayer.disableAudioSessionManagement = true;
    videoPlayer.ignoreSilentSwitchMode = 'ignore';
    videoPlayer.playInBackground = false;
    videoPlayer.playWhenInactive = false;
  });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, player]);

  useEffect(() => {
    const subscription = player.addEventListener('onError', onError);
    return () => subscription.remove();
  }, [onError, player]);

  return (
    <VideoView
      controls={active}
      player={player}
      resizeMode="contain"
      style={styles.media}
      testID={`multi-capture-video-preview-${asset.id}`}
    />
  );
}

function PreviewPage({
  asset,
  active,
  height,
  strings,
  textColor,
  width,
}: PreviewPageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [asset.id]);

  return (
    <View
      accessibilityLabel={strings.previewAsset}
      style={[styles.page, { height, width }]}
    >
      {failed ? (
        <Text style={[styles.errorText, { color: textColor }]}>
          {strings.previewLoadFailed}
        </Text>
      ) : asset.type === 'photo' ? (
        <Image
          accessibilityIgnoresInvertColors
          onError={() => setFailed(true)}
          resizeMode="contain"
          source={{ uri: asset.uri }}
          style={styles.media}
        />
      ) : (
        <VideoPreviewPage
          active={active}
          asset={asset}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

export function AssetPreview({
  assets,
  initialIndex,
  strings,
  theme,
  visible,
  onClose,
  onDone,
  isCompleting = false,
  testID,
}: AssetPreviewProps) {
  const { height, width } = useWindowDimensions();
  const listRef = useRef<FlatList<CaptureAsset>>(null);
  const safeInitialIndex = Math.min(
    Math.max(0, initialIndex),
    Math.max(0, assets.length - 1)
  );
  const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);

  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(safeInitialIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        animated: false,
        index: safeInitialIndex,
      });
    });
  }, [safeInitialIndex, visible, width]);

  const updateCurrentIndex = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(Math.min(Math.max(0, nextIndex), assets.length - 1));
  };

  if (assets.length === 0) return null;

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent={Platform.OS === 'android'}
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
      visible={visible}
    >
      <StatusBar
        backgroundColor={theme.backgroundColor}
        barStyle="light-content"
        hidden={false}
        translucent={Platform.OS === 'android'}
      />
      <View
        style={[styles.root, { backgroundColor: theme.backgroundColor }]}
        testID={`${testID}-preview`}
      >
        <FlatList
          data={assets}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            index,
            length: width,
            offset: width * index,
          })}
          horizontal
          initialNumToRender={1}
          initialScrollIndex={safeInitialIndex}
          keyExtractor={(asset) => asset.id}
          maxToRenderPerBatch={3}
          onMomentumScrollEnd={updateCurrentIndex}
          onScrollToIndexFailed={({ index }) => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToOffset({
                animated: false,
                offset: index * width,
              });
            });
          }}
          pagingEnabled
          ref={listRef}
          renderItem={({ item, index }) => (
            <PreviewPage
              active={visible && currentIndex === index}
              asset={item}
              height={height}
              strings={strings}
              textColor={theme.textColor}
              width={width}
            />
          )}
          showsHorizontalScrollIndicator={false}
          windowSize={3}
        />

        <SafeAreaView pointerEvents="box-none" style={styles.headerSafeArea}>
          <View
            style={[
              styles.header,
              {
                backgroundColor: theme.overlayColor,
                paddingTop:
                  Platform.OS === 'android'
                    ? (StatusBar.currentHeight ?? 0)
                    : 0,
              },
            ]}
          >
            <Pressable
              accessibilityLabel={strings.closePreview}
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={styles.closeButton}
              testID={`${testID}-preview-close`}
            >
              <Image source={cameraIcons.close} style={styles.closeIcon} />
            </Pressable>
            <Text style={[styles.counter, { color: theme.textColor }]}>
              {currentIndex + 1}/{assets.length}
            </Text>
            {onDone ? (
              <Pressable
                accessibilityLabel={strings.done}
                accessibilityRole="button"
                disabled={isCompleting}
                hitSlop={10}
                onPress={onDone}
                style={styles.actionButton}
                testID={`${testID}-preview-done`}
              >
                <Text
                  style={[
                    styles.doneText,
                    {
                      color: theme.accentColor,
                      opacity: isCompleting ? 0.62 : 1,
                    },
                  ]}
                >
                  {strings.done}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.actionButton} />
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    fontSize: 15,
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 56,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    minWidth: 56,
    height: 60,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 16,
    height: 16,
  },
  counter: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
