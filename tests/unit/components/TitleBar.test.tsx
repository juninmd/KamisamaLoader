// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import TitleBar from '../../../src/components/TitleBar';

describe('TitleBar', () => {
    it('should render and handle window controls', () => {
        renderWithProviders(<TitleBar />);

        const buttons = screen.getAllByRole('button');
        // 3 buttons: minimize, maximize, close
        expect(buttons).toHaveLength(3);

        fireEvent.click(buttons[0]); // Minimize
        expect(window.electronAPI.minimize).toHaveBeenCalled();

        fireEvent.click(buttons[1]); // Maximize
        expect(window.electronAPI.maximize).toHaveBeenCalled();

        fireEvent.click(buttons[2]); // Close
        expect(window.electronAPI.close).toHaveBeenCalled();
    });
});
