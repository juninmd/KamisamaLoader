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
       const mod1 = 500;
       const mod2 = 1500;
       const mod3 = 1500000;
       const mod4 = 1500000000;
       const mod5 = 1500000000000;
       const sum = mod1 + mod2 + mod3 + mod4 + mod5;
       console.log(formatBytes(sum));
       expect(formatBytes(sum)).toBe('1.37 TB');
   });
});
