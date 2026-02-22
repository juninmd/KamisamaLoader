import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCategories } from '../../electron/gamebanana.js';

// Mock getAPICache to avoid hitting real cache logic or errors
vi.mock('../../electron/api-cache.js', () => ({
  getAPICache: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('GameBanana API Final Gaps', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty array if fetchCategories returns non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const categories = await fetchCategories(12345);
    expect(categories).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should return empty array if fetchCategories throws an error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const categories = await fetchCategories(12345);
    expect(categories).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching categories:', expect.any(Error));
  });
});
