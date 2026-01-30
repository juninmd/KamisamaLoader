// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../../src/App';
import { renderWithProviders } from '../test-utils';

// Mock child components
vi.mock('../../../src/pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));
vi.mock('../../../src/pages/Mods', () => ({ default: () => <div>Mods Page</div> }));
vi.mock('../../../src/pages/Settings', () => ({ default: () => <div>Settings Page</div> }));

// Mock Layout to allow triggering navigation
vi.mock('../../../src/layouts/MainLayout', () => ({
    default: ({ children, onNavigate }: any) => (
        <div>
            <button onClick={() => onNavigate('dashboard')}>Go Dashboard</button>
            <button onClick={() => onNavigate('mods')}>Go Mods</button>
            <button onClick={() => onNavigate('settings')}>Go Settings</button>
            <button onClick={() => onNavigate('unknown')}>Go Unknown</button>
            {children}
        </div>
    )
}));

// Mock Contexts - we want to ensure they render children
vi.mock('../../../src/components/SettingsContext', () => ({
    SettingsProvider: ({ children }: any) => <div data-testid="settings-provider">{children}</div>
}));
vi.mock('../../../src/components/ToastContext', () => ({
    ToastProvider: ({ children }: any) => <div data-testid="toast-provider">{children}</div>
}));

describe('App', () => {
    it('renders providers', () => {
        render(<App />);
        expect(screen.getByTestId('settings-provider')).toBeInTheDocument();
        expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
    });

    it('renders Dashboard by default', () => {
        render(<App />);
        expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    it('navigates to Mods', () => {
        render(<App />);
        fireEvent.click(screen.getByText('Go Mods'));
        expect(screen.getByText('Mods Page')).toBeInTheDocument();
    });

    it('navigates to Settings', () => {
        render(<App />);
        fireEvent.click(screen.getByText('Go Settings'));
        expect(screen.getByText('Settings Page')).toBeInTheDocument();
    });

    it('navigates to Dashboard via Home alias or explicit', () => {
        render(<App />);
        fireEvent.click(screen.getByText('Go Mods')); // move away
        fireEvent.click(screen.getByText('Go Dashboard'));
        expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    it('renders Dashboard on unknown route', () => {
        render(<App />);
        fireEvent.click(screen.getByText('Go Unknown'));
        expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
});
