// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, act } from '../test-utils';
import TitleBar from '../../../src/components/TitleBar';

describe('TitleBar', () => {
    it('should render and handle window controls', async () => {
        await act(async () => {
             renderWithProviders(<TitleBar />);
        });

        const buttons = screen.getAllByRole('button');
        // 3 buttons: minimize, maximize, close
        expect(buttons).toHaveLength(3);

        await act(async () => {
             fireEvent.click(buttons[0]); // Minimize
        });
        expect(window.electronAPI.minimize).toHaveBeenCalled();

        await act(async () => {
             fireEvent.click(buttons[1]); // Maximize
        });
        expect(window.electronAPI.maximize).toHaveBeenCalled();

        await act(async () => {
             fireEvent.click(buttons[2]); // Close
        });
        expect(window.electronAPI.close).toHaveBeenCalled();
    });
});
