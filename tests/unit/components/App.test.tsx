// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import App from '../../../src/App';
import { describe, it, expect, vi } from 'vitest';

// Mock child components to avoid deep rendering issues
vi.mock('../../../src/pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));
vi.mock('../../../src/pages/Mods', () => ({ default: () => <div>Mods Page</div> }));
vi.mock('../../../src/pages/Settings', () => ({ default: () => <div>Settings Page</div> }));

// Mock Layout
vi.mock('../../../src/layouts/MainLayout', () => ({
    default: ({ children }: any) => <div>{children}</div>
}));

// Mock Contexts
vi.mock('../../../src/components/SettingsContext', () => ({
    SettingsProvider: ({ children }: any) => <div>{children}</div>
}));
vi.mock('../../../src/components/ToastContext', () => ({
    ToastProvider: ({ children }: any) => <div>{children}</div>
}));

describe('App', () => {
    it('renders Dashboard by default', () => {
        render(<App />);
        expect(screen.getByText('Dashboard Page')).toBeDefined();
    });
});
