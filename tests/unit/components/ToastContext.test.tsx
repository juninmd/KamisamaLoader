// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, act } from '../test-utils';
import { useToast } from '../../../src/components/ToastContext';
import { useEffect } from 'react';

const TestComponent = () => {
    const { showToast } = useToast();
    return (
        <button onClick={() => showToast('Test Message', 'success')}>Show</button>
    );
};

describe('ToastContext', () => {
    it('should show toast', async () => {
        await act(async () => {
             renderWithProviders(<TestComponent />);
        });

        await act(async () => {
            screen.getByText('Show').click();
        });

        expect(await screen.findByText('Test Message')).toBeInTheDocument();
    });

    it('should auto dismiss', async () => {
        vi.useFakeTimers();
        await act(async () => {
             renderWithProviders(<TestComponent />);
        });

        await act(async () => {
            screen.getByText('Show').click();
        });

        // Use getBy instead of findBy to avoid async timer issues
        expect(screen.getByText('Test Message')).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });

        expect(screen.queryByText('Test Message')).not.toBeInTheDocument();
        vi.useRealTimers();
    });
});
