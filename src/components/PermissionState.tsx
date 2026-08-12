import {
  Image,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { cameraIcons } from '../icons';
import type { MultiCaptureStrings, MultiCaptureTheme } from '../types';

interface PermissionStateProps {
  message: string;
  canRequest: boolean;
  isRequesting: boolean;
  isCompleting?: boolean;
  assetCount?: number;
  onRequest: () => void;
  onClose: () => void;
  onDone?: () => void;
  onOpenLibrary?: () => void;
  strings: MultiCaptureStrings;
  theme: MultiCaptureTheme;
}

export function PermissionState({
  message,
  canRequest,
  isRequesting,
  isCompleting = false,
  assetCount = 0,
  onRequest,
  onClose,
  onDone,
  onOpenLibrary,
  strings,
  theme,
}: PermissionStateProps) {
  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundColor }]}>
      <SafeAreaView
        style={[
          styles.headerSafeArea,
          {
            backgroundColor: theme.overlayColor,
            paddingTop:
              Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.cancel}
            hitSlop={10}
            onPress={onClose}
            style={styles.headerButton}
          >
            <Image source={cameraIcons.close} style={styles.closeIcon} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        <Image
          source={cameraIcons.noPermission}
          style={styles.permissionIcon}
        />
        <Text style={[styles.message, { color: theme.mutedTextColor }]}>
          {message}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isRequesting}
          onPress={canRequest ? onRequest : () => void Linking.openSettings()}
        >
          <Text
            style={[
              styles.openSettings,
              {
                color: theme.accentColor,
                opacity: isRequesting ? 0.62 : 1,
              },
            ]}
          >
            {canRequest ? strings.requestPermission : strings.openSettings}
          </Text>
        </Pressable>
      </View>

      {onOpenLibrary || (assetCount > 0 && onDone) ? (
        <SafeAreaView style={styles.bottomSafeArea}>
          <View style={styles.bottomActions}>
            {onOpenLibrary ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={strings.openLibrary}
                disabled={isCompleting}
                onPress={onOpenLibrary}
                style={[
                  styles.bottomButton,
                  styles.libraryButton,
                  { borderColor: theme.accentColor },
                ]}
              >
                <Text
                  style={[styles.libraryText, { color: theme.accentColor }]}
                >
                  {strings.selectFromLibrary}
                </Text>
              </Pressable>
            ) : null}
            {assetCount > 0 && onDone ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={strings.done}
                disabled={isCompleting}
                onPress={onDone}
                style={[
                  styles.bottomButton,
                  styles.doneButton,
                  {
                    backgroundColor: theme.accentColor,
                    opacity: isCompleting ? 0.62 : 1,
                  },
                ]}
              >
                <Text style={[styles.libraryText, { color: theme.textColor }]}>
                  {strings.done} ({assetCount})
                </Text>
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerSafeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 2,
  },
  header: {
    height: 60,
    justifyContent: 'center',
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignSelf: 'flex-start',
  },
  closeIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  permissionIcon: {
    width: 200,
    height: 110,
    marginTop: 150,
  },
  message: {
    marginTop: 34,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  openSettings: {
    marginTop: 16,
    fontSize: 17,
    lineHeight: 24,
  },
  bottomSafeArea: {
    paddingBottom: 30,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  bottomButton: {
    flex: 1,
    maxWidth: 180,
    height: 49,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryButton: {
    borderWidth: 1,
  },
  doneButton: {
    paddingHorizontal: 12,
  },
  libraryText: {
    fontSize: 17,
    fontWeight: '400',
  },
});
