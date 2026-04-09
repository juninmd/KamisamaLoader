import { describe, it, expect } from 'vitest';

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

describe('formatBytes gaps', () => {
   it('should format all sizes', () => {
       expect(formatBytes(0)).toBe('0 Bytes');
       expect(formatBytes(500)).toBe('500 Bytes');
       expect(formatBytes(1500)).toBe('1.46 KB');
       expect(formatBytes(1500000)).toBe('1.43 MB');
       expect(formatBytes(1500000000)).toBe('1.4 GB');
       expect(formatBytes(1500000000000, -1)).toBe('1 TB'); // Negative decimals logic
   });
});
