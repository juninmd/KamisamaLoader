// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderWithProviders, act } from '../test-utils';
import Skeleton from '../../../src/components/Skeleton';

describe('Skeleton', () => {
    it('should render', async () => {
        let container: HTMLElement;
        await act(async () => {
             const result = renderWithProviders(<Skeleton />);
             container = result.container;
        });

        // @ts-ignore
        expect(container!.firstChild).toHaveClass('animate-pulse');
        // @ts-ignore
        expect(container!.firstChild).toHaveClass('glass-panel');
    });
});
