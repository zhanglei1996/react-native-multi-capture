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
  onRequest: () => void;
  onClose: () => void;
  onOpenLibrary?: () => void;
  strings: MultiCaptureStrings;
  theme: MultiCaptureTheme;
}

export function PermissionState({
  message,
  canRequest,
  isRequesting,
  onRequest,
  onClose,
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

      {onOpenLibrary ? (
        <SafeAreaView style={styles.bottomSafeArea}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.openLibrary}
            onPress={onOpenLibrary}
            style={[styles.libraryButton, { borderColor: theme.accentColor }]}
          >
            <Text style={[styles.libraryText, { color: theme.accentColor }]}>
              {strings.selectFromLibrary}
            </Text>
          </Pressable>
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
    alignItems: 'center',
    paddingBottom: 30,
  },
  libraryButton: {
    width: 156.5,
    height: 49,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryText: {
    fontSize: 17,
    fontWeight: '400',
  },
});
