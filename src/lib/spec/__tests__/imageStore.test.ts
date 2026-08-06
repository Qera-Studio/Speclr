import { loadImageStore, saveSlotImage, removeSlotImage, IMAGE_STORE_KEY } from '../imageStore';

describe('imageStore', () => {
  beforeEach(() => localStorage.clear());

  it('returns an empty map when nothing is stored', () => {
    expect(loadImageStore()).toEqual({});
  });

  it('saves a slot image and reads it back', () => {
    const ok = saveSlotImage('favicon-32', 'data:image/png;base64,AAAA');
    expect(ok).toBe(true);
    expect(loadImageStore()).toEqual({ 'favicon-32': 'data:image/png;base64,AAAA' });
  });

  it('overwrites the image for an existing slot', () => {
    saveSlotImage('favicon-32', 'data:image/png;base64,AAAA');
    saveSlotImage('favicon-32', 'data:image/png;base64,BBBB');
    expect(loadImageStore()['favicon-32']).toBe('data:image/png;base64,BBBB');
  });

  it('removes a slot image', () => {
    saveSlotImage('favicon-32', 'data:image/png;base64,AAAA');
    saveSlotImage('og-image', 'data:image/png;base64,CCCC');
    removeSlotImage('favicon-32');
    expect(loadImageStore()).toEqual({ 'og-image': 'data:image/png;base64,CCCC' });
  });

  it('returns false and preserves existing images when a write exceeds quota', () => {
    saveSlotImage('favicon-32', 'data:image/png;base64,AAAA');
    // Simulate quota exhaustion on the next setItem.
    const original = Storage.prototype.setItem;
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new DOMException('quota', 'QuotaExceededError');
      throw err;
    });

    const ok = saveSlotImage('og-image', 'data:image/png;base64,HUGE');
    expect(ok).toBe(false);

    spy.mockRestore();
    Storage.prototype.setItem = original;
    // The previously-stored image is untouched.
    expect(loadImageStore()).toEqual({ 'favicon-32': 'data:image/png;base64,AAAA' });
  });

  it('tolerates malformed JSON by returning an empty map', () => {
    localStorage.setItem(IMAGE_STORE_KEY, '{not json');
    expect(loadImageStore()).toEqual({});
  });
});
