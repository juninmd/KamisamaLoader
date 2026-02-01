// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../test-utils';
import Skeleton from '../../../src/components/Skeleton';

describe('Skeleton', () => {
    it('should render', () => {
        const { container } = renderWithProviders(<Skeleton />);
        expect(container.firstChild).toHaveClass('animate-pulse');
        expect(container.firstChild).toHaveClass('glass-panel');
    });
});
