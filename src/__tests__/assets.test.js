import {
  appendWithinLimit,
  canReserveCapture,
  formatDuration,
  normalizeCaptureAsset,
  toFilePath,
  toFileUri,
} from '../core/assets';

describe('capture asset helpers', () => {
  it('normalizes file paths for rendering and upload metadata', () => {
    const asset = normalizeCaptureAsset({
      path: '/tmp/captures/photo.jpg',
      type: 'photo',
    });

    expect(asset.uri).toBe('file:///tmp/captures/photo.jpg');
    expect(asset.path).toBe('/tmp/captures/photo.jpg');
    expect(asset.fileName).toBe('photo.jpg');
    expect(asset.mimeType).toBe('image/jpeg');
    expect(asset.id).toMatch(/^photo-/);
  });

  it('preserves existing URI schemes', () => {
    expect(toFileUri('content://media/123')).toBe('content://media/123');
    expect(toFilePath('file:///tmp/video.mp4')).toBe('/tmp/video.mp4');
  });

  it('never appends beyond the configured limit', () => {
    const first = normalizeCaptureAsset({
      id: 'one',
      path: '/tmp/one.jpg',
      type: 'photo',
    });
    const second = normalizeCaptureAsset({
      id: 'two',
      path: '/tmp/two.jpg',
      type: 'photo',
    });
    const third = normalizeCaptureAsset({
      id: 'three',
      path: '/tmp/three.jpg',
      type: 'photo',
    });

    expect(appendWithinLimit([first], [second, third], 2)).toEqual([
      first,
      second,
    ]);
  });

  it('counts pending native work when reserving a capture', () => {
    expect(canReserveCapture(2, 1, 4)).toBe(true);
    expect(canReserveCapture(2, 2, 4)).toBe(false);
  });

  it('formats short and long recording durations', () => {
    expect(formatDuration(5.9)).toBe('00:05');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('rejects assets without a path or URI', () => {
    expect(() =>
      normalizeCaptureAsset({
        type: 'photo',
      })
    ).toThrow('Capture assets require either a path or uri.');
  });
});
