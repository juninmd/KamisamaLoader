// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { ModCard } from '../../../src/components/mods/ModCard';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, onClick }: any) => (
            <div className={className} onClick={onClick}>{children}</div>
        )
    }
}));

const mockMod: any = {
    id: '1',
    name: 'Test Mod',
    author: 'Test Author',
    version: '1.0',
    description: 'A test mod',
    iconUrl: 'http://example.com/icon.png',
    category: 'Skins'
};

describe('ModCard', () => {
    it('renders mod information', () => {
        render(<ModCard mod={mockMod} />);
        expect(screen.getByText('Test Mod')).toBeDefined();
        expect(screen.getByText('Test Author')).toBeDefined();
        expect(screen.getByText('Skins')).toBeDefined();
    });

    it('shows download button when not installed', () => {
        render(<ModCard mod={mockMod} isInstalled={false} />);
        expect(screen.getByText('Download')).toBeDefined();
    });

    it('calls onInstall when download clicked', () => {
        const onInstall = vi.fn();
        render(<ModCard mod={mockMod} isInstalled={false} onInstall={onInstall} />);
        fireEvent.click(screen.getByText('Download'));
        expect(onInstall).toHaveBeenCalledWith(mockMod);
    });

    it('shows active badge when installed and enabled', () => {
        const localMod = { ...mockMod, isEnabled: true };
        render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} />);
        expect(screen.getByText('Active')).toBeDefined();
        expect(screen.getByText('Disable')).toBeDefined();
    });

    it('shows installed badge when installed and disabled', () => {
        const localMod = { ...mockMod, isEnabled: false };
        render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} />);
        expect(screen.getByText('Installed')).toBeDefined();
        expect(screen.getByText('Enable')).toBeDefined();
    });

    it('calls onToggle when enable/disable clicked', () => {
        const onToggle = vi.fn();
        const localMod = { ...mockMod, isEnabled: false };
        render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} onToggle={onToggle} />);
        fireEvent.click(screen.getByText('Enable'));
        expect(onToggle).toHaveBeenCalledWith(mockMod.id);
    });

    it('shows update badge if update available', () => {
        const localMod = { ...mockMod, hasUpdate: true };
        render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} onUpdate={vi.fn()} />);
        expect(screen.getByText('Update')).toBeDefined();
    });
});
