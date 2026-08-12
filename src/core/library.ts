import type { Asset as ImagePickerAsset } from 'react-native-image-picker';
import type { CaptureAssetInput, CaptureAssetType } from '../types';

function inferAssetType(asset: ImagePickerAsset): CaptureAssetType {
  if (asset.type?.startsWith('video/')) return 'video';
  if (typeof asset.duration === 'number') return 'video';
  if (/\.(mov|mp4|m4v|avi|webm)$/iu.test(asset.fileName ?? asset.uri ?? '')) {
    return 'video';
  }
  return 'photo';
}

export function imagePickerAssetToCaptureInput(
  asset: ImagePickerAsset
): CaptureAssetInput | undefined {
  if (!asset.uri) return undefined;
  const type = inferAssetType(asset);
  return {
    uri: asset.uri,
    type,
    fileName: asset.fileName,
    mimeType: asset.type,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    size: asset.fileSize,
    metadata: {
      source: 'library',
      ...(asset.originalPath ? { originalPath: asset.originalPath } : {}),
    },
  };
}
