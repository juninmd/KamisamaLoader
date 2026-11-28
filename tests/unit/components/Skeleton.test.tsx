// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../test-utils';
import Skeleton from '../../../src/components/Skeleton';

describe('Skeleton', () => {
    it('renders the Sonido shimmer inside the app surface', () => {
        const { container } = renderWithProviders(<Skeleton />);
        expect(container.firstChild).toHaveClass('glass-panel');
        const shimmer = container.querySelector('.sn-skeleton');
        expect(shimmer).toBeInTheDocument();
        expect(shimmer).toHaveAttribute('aria-busy', 'true');
    });
});
