import {
  defaultStrings,
  enStrings,
  multiCaptureLocales,
  zhCNStrings,
} from '../defaults';

describe('built-in locales', () => {
  it('uses Chinese as the default interface language', () => {
    expect(defaultStrings).toBe(zhCNStrings);
    expect(defaultStrings.photoMode).toBe('照片');
    expect(defaultStrings.videoMode).toBe('视频');
    expect(defaultStrings.done).toBe('完成');
  });

  it('exposes complete Chinese and English locale presets', () => {
    expect(multiCaptureLocales['zh-CN']).toBe(zhCNStrings);
    expect(multiCaptureLocales.en).toBe(enStrings);
    expect(Object.keys(enStrings).sort()).toEqual(
      Object.keys(zhCNStrings).sort()
    );
  });
});
