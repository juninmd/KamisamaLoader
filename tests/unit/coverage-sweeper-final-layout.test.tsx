/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import MainLayout from '../../src/layouts/MainLayout';
import { MockSettingsProvider } from './test-utils';

vi.mock('lucide-react', () => {
    return {
        LayoutDashboard: () => <div />,
        Package: () => <div />,
        Settings: () => <div />
    };
});

describe('MainLayout coverage', () => {
    it('should fall back to default opacity if none provided', () => {
        render(
            <MockSettingsProvider initialSettings={{ backgroundImage: 'url("test.jpg")', backgroundOpacity: undefined } as any}>
                <MainLayout activePage="dashboard" onNavigate={vi.fn()}>
                    <div>Child</div>
                </MainLayout>
            </MockSettingsProvider>
        );

        const overlay = document.querySelector('.bg-black.backdrop-blur-sm');
        expect(overlay).not.toBeNull();
        expect(overlay?.getAttribute('style')).toContain('opacity: 0.7');
    });
});
