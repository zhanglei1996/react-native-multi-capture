import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  MultiCaptureModal,
  type CaptureAsset,
  type CaptureCloseContext,
  type CaptureMediaType,
  type MultiCaptureError,
} from 'react-native-multi-capture';

export default function App() {
  const [visible, setVisible] = useState(false);
  const [mediaType, setMediaType] = useState<CaptureMediaType>('photo');
  const [assets, setAssets] = useState<readonly CaptureAsset[]>([]);
  const [lastError, setLastError] = useState<string>();

  const openCamera = (nextMediaType: CaptureMediaType) => {
    setLastError(undefined);
    setMediaType(nextMediaType);
    setVisible(true);
  };

  const confirmClose = ({
    assets: currentAssets,
    isBusy,
  }: CaptureCloseContext): Promise<boolean> =>
    new Promise((resolve) => {
      if (isBusy) {
        Alert.alert('请稍候', '当前拍摄内容仍在处理中。');
        resolve(false);
        return;
      }
      if (currentAssets.length === 0) {
        resolve(true);
        return;
      }
      Alert.alert(
        '放弃本次拍摄？',
        '点击“完成”前，当前拍摄内容不会被保留。',
        [
          {
            text: '继续拍摄',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: '放弃',
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });

  const handleError = (error: MultiCaptureError) => {
    setLastError(`${error.code}: ${error.message}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>示例项目</Text>
        <Text style={styles.title}>React Native Multi Capture</Text>
        <Text style={styles.subtitle}>
          基于 VisionCamera 5 的连续拍照与录像组件。
        </Text>

        <View style={styles.actions}>
          <ActionButton label="连续拍照" onPress={() => openCamera('photo')} />
          <ActionButton
            label="照片 + 视频"
            onPress={() => openCamera('mixed')}
            secondary
          />
        </View>

        {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>上次拍摄结果</Text>
          <Text style={styles.resultCount}>{assets.length} 个文件</Text>
        </View>
        <View style={styles.results}>
          {assets.length === 0 ? (
            <Text style={styles.empty}>完成一次拍摄后，文件会显示在这里。</Text>
          ) : (
            assets.map((asset) => (
              <View key={asset.id} style={styles.resultCard}>
                {asset.type === 'photo' ? (
                  <Image
                    source={{ uri: asset.uri }}
                    style={styles.resultImage}
                  />
                ) : (
                  <View style={styles.videoResult}>
                    <Text style={styles.videoIcon}>▶</Text>
                  </View>
                )}
                <View style={styles.resultMeta}>
                  <Text numberOfLines={1} style={styles.fileName}>
                    {asset.fileName}
                  </Text>
                  <Text style={styles.fileType}>{asset.mimeType}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <MultiCaptureModal
        enableAudio={mediaType !== 'photo'}
        enableHaptics
        initialCameraPosition="back"
        maxAssets={8}
        maxVideoDuration={30}
        mediaType={mediaType}
        openLibrary={async () => {
          Alert.alert(
            '相册适配器',
            '组件本身不绑定图片选择库；请通过 openLibrary 接入项目已有的相册选择器。'
          );
          return null;
        }}
        onCancel={() => setVisible(false)}
        onDone={(nextAssets) => {
          setAssets(nextAssets);
          setVisible(false);
        }}
        onError={handleError}
        onRequestClose={confirmClose}
        visible={visible}
      />
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionButton, secondary && styles.actionButtonSecondary]}
    >
      <Text
        style={[
          styles.actionButtonText,
          secondary && styles.actionButtonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  eyebrow: {
    color: '#3976E8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 24,
  },
  title: {
    color: '#13161B',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    color: '#5F6672',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  actions: {
    gap: 12,
    marginTop: 28,
  },
  actionButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#3976E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#B9C2D0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: '#273143',
  },
  error: {
    color: '#B42318',
    backgroundColor: '#FEE4E2',
    padding: 12,
    borderRadius: 10,
    marginTop: 18,
    fontSize: 13,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 36,
    marginBottom: 12,
  },
  resultTitle: {
    color: '#20252E',
    fontSize: 18,
    fontWeight: '700',
  },
  resultCount: {
    color: '#737B88',
    fontSize: 13,
  },
  results: {
    gap: 10,
  },
  empty: {
    color: '#737B88',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    lineHeight: 20,
  },
  resultCard: {
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultImage: {
    width: 52,
    height: 52,
    borderRadius: 9,
    backgroundColor: '#E5E9F0',
  },
  videoResult: {
    width: 52,
    height: 52,
    borderRadius: 9,
    backgroundColor: '#20252E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: {
    color: '#FFFFFF',
    fontSize: 19,
    marginLeft: 3,
  },
  resultMeta: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    color: '#20252E',
    fontSize: 14,
    fontWeight: '600',
  },
  fileType: {
    color: '#737B88',
    fontSize: 12,
    marginTop: 4,
  },
});
