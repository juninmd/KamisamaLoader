// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import MainLayout from '../../src/layouts/MainLayout';
import { useSettings } from '../../src/components/SettingsContext';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';

// Mock context
vi.mock('../../src/components/SettingsContext', () => ({
    useSettings: vi.fn(),
    SettingsProvider: ({ children }: any) => <div>{children}</div>
}));

describe('MainLayout Gaps', () => {
    it('should render correctly without background image', () => {
        (useSettings as any).mockReturnValue({
            settings: { backgroundImage: undefined }
        });

        const { container } = render(
            <MainLayout activePage="dashboard" onNavigate={vi.fn()}>
                <div>Content</div>
            </MainLayout>
        );

        // Assert the style is empty object {} (or specifically lacks backgroundImage)
        const layoutDiv = container.firstChild as HTMLElement;
        expect(layoutDiv.style.backgroundImage).toBe('');
    });
});
