// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '../../../src/components/ToastContext';

// Helper component to use the hook
const TestComponent = () => {
    const { showToast } = useToast();
    return (
        <button onClick={() => showToast('Test Message', 'success')}>
            Show Toast
        </button>
    );
};

describe('ToastContext', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows toast when called', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText('Show Toast'));
        expect(screen.getByText('Test Message')).toBeInTheDocument();
    });

    it('auto dismisses when the Sonido drain animation ends', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText('Show Toast'));
        expect(screen.getByText('Test Message')).toBeInTheDocument();

        // Sonido toasts dismiss on the CSS drain animation, not on a timer.
        const drain = document.querySelector('.sn-toast__drain') as HTMLElement;
        expect(drain).toBeTruthy();
        act(() => {
            fireEvent.animationEnd(drain);
        });

        expect(screen.queryByText('Test Message')).not.toBeInTheDocument();
    });

    it('allows manual dismissal', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText('Show Toast'));
        expect(screen.getByText('Test Message')).toBeInTheDocument();

        // Find the close button (SVG inside a button usually)
        // We'll rely on the button role which Toast should have
        const closeButtons = screen.getAllByRole('button');
        // The last one is likely the toast close button (since the first is 'Show Toast')
        const closeButton = closeButtons[closeButtons.length - 1];

        fireEvent.click(closeButton);

        expect(screen.queryByText('Test Message')).not.toBeInTheDocument();
    });

    it('throws error if used outside provider', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => render(<TestComponent />)).toThrow('useToast must be used within a ToastProvider');

        consoleSpy.mockRestore();
    });
});
