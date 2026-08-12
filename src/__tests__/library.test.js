import { imagePickerAssetToCaptureInput } from '../core/library';

describe('built-in library picker helpers', () => {
  it('maps image-picker photos to capture inputs', () => {
    expect(
      imagePickerAssetToCaptureInput({
        uri: 'file:///tmp/photo.heic',
        type: 'image/heic',
        fileName: 'photo.heic',
        fileSize: 123,
        width: 1200,
        height: 900,
      })
    ).toEqual({
      uri: 'file:///tmp/photo.heic',
      type: 'photo',
      fileName: 'photo.heic',
      mimeType: 'image/heic',
      width: 1200,
      height: 900,
      duration: undefined,
      size: 123,
      metadata: { source: 'library' },
    });
  });

  it('detects videos when the picker omits a MIME type', () => {
    expect(
      imagePickerAssetToCaptureInput({
        uri: 'content://media/video/42',
        fileName: 'clip.mp4',
        duration: 3.5,
      })?.type
    ).toBe('video');
  });

  it('ignores picker entries without a URI', () => {
    expect(imagePickerAssetToCaptureInput({ fileName: 'missing.jpg' })).toBe(
      undefined
    );
  });
});
