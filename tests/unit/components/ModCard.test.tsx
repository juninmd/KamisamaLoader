// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { ModCard } from '../../../src/components/mods/ModCard';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, onClick, onContextMenu, layoutId }: any) => (
            <div className={className} onClick={onClick} onContextMenu={onContextMenu} data-layoutid={layoutId}>{children}</div>
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

    it('calls onUpdate when update button clicked', () => {
         const onUpdate = vi.fn();
         const localMod = { ...mockMod, hasUpdate: true };
         render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} onUpdate={onUpdate} />);
         // Find button by class or hierarchy.
         // Logic: It's the only button with glassy variant green color logic?
         // Or finding button containing RefreshCw not easy via text.
         // Let's rely on finding all buttons.
         // 1. Enable/Disable
         // 2. Update
         // 3. Trash
         const buttons = screen.getAllByRole('button');
         fireEvent.click(buttons[1]);
         expect(onUpdate).toHaveBeenCalledWith(localMod);
    });

    it('calls onSelect when card clicked', () => {
         const onSelect = vi.fn();
         render(<ModCard mod={mockMod} onSelect={onSelect} />);
         const card = screen.getByText('Test Mod').closest('div');
         fireEvent.click(card!);
         expect(onSelect).toHaveBeenCalledWith(mockMod);
    });

    it('renders and calls priority buttons', () => {
         const onPriorityChange = vi.fn();
         const localMod = { ...mockMod, isEnabled: true, priority: 5 };
         render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} onPriorityChange={onPriorityChange} />);

         expect(screen.getByText('Prio: 5')).toBeInTheDocument();

         const buttons = screen.getAllByRole('button');
         // Enable, Up, Down, Trash
         // If update not present.
         // 0: Disable
         // 1: Up
         // 2: Down
         // 3: Trash

         // Click Up
         fireEvent.click(buttons[1]);
         expect(onPriorityChange).toHaveBeenCalledWith('1', 'up');

         // Click Down
         fireEvent.click(buttons[2]);
         expect(onPriorityChange).toHaveBeenCalledWith('1', 'down');
    });

    it('calls onUninstall', () => {
         const onUninstall = vi.fn();
         const localMod = { ...mockMod, isEnabled: false };
         render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} onUninstall={onUninstall} />);

         const buttons = screen.getAllByRole('button');
         // Enable, Trash (last)
         const trashBtn = buttons[buttons.length - 1];
         fireEvent.click(trashBtn);
         expect(onUninstall).toHaveBeenCalledWith('1');
    });

    it('renders NSFW badge', () => {
         render(<ModCard mod={{ ...mockMod, isNsfw: true }} />);
         expect(screen.getByText('NSFW')).toBeInTheDocument();
    });

    it('renders download/like stats', () => {
         render(<ModCard mod={{ ...mockMod, downloadCount: 1500, likeCount: 20, dateAdded: 1600000000 }} />);
         expect(screen.getByText('1.5k')).toBeInTheDocument();
         expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('renders images', () => {
         render(<ModCard mod={{ ...mockMod, images: ['img.jpg'] }} />);
         const img = screen.getByAltText('Test Mod') as HTMLImageElement;
         expect(img.src).toContain('img.jpg');
    });
});
