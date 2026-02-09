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
    });

    it('shows installed badge when installed and disabled', () => {
        const localMod = { ...mockMod, isEnabled: false };
        render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} />);
        expect(screen.getByText('Installed')).toBeDefined();
    });

    it('calls onToggle when switch clicked', () => {
        const onToggle = vi.fn();
        const localMod = { ...mockMod, isEnabled: false };
        render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} onToggle={onToggle} />);

        // Use Switch component interaction (checkbox)
        const switchEl = screen.getByRole('checkbox');
        fireEvent.click(switchEl);
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

         // Buttons: Update, Up, Down, Trash
         // Or just Update, Trash depending on context.
         // With Switch, there is no "Enable/Disable" button anymore.
         // The structure is: Switch (div), Update (Button), Priority (div > buttons), Trash (Button)

         // Find button by icon or order. The update button is the first *button* element if update is avail.
         const buttons = screen.getAllByRole('button');
         // But "Up/Down" are also buttons.

         // Let's assume Update is first button rendered in Footer (after Switch which is label/input).
         // Update button has class containing 'text-green-400' (from code inspection) or we can just try clicking.
         // Or look for svg.

         // Update button is rendered if hasUpdate && onUpdate.
         // Priority buttons are rendered if onPriorityChange.
         // Trash is always rendered.

         // In this test, onPriorityChange is undefined.
         // So: Switch, Update Button, Trash Button.
         fireEvent.click(buttons[0]); // First button should be Update
         expect(onUpdate).toHaveBeenCalledWith(localMod);
    });

    it('calls onSelect when card clicked', () => {
         const onSelect = vi.fn();
         render(<ModCard mod={mockMod} onSelect={onSelect} />);
         const card = screen.getByText('Test Mod').closest('div');
         // We need to click the motion.div or the Card itself.
         // Text 'Test Mod' is inside h3 -> div -> div -> CardContent -> Card -> motion.div
         // The click handler is on Card.
         fireEvent.click(screen.getByText('Test Mod'));
         expect(onSelect).toHaveBeenCalledWith(mockMod);
    });

    it('renders and calls priority buttons', () => {
         const onPriorityChange = vi.fn();
         const localMod = { ...mockMod, isEnabled: true, priority: 5 };
         render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} onPriorityChange={onPriorityChange} />);

         expect(screen.getByText('Prio: 5')).toBeInTheDocument();

         // Find buttons by title
         const upBtn = screen.getByTitle('Increase Priority (Move Up)');
         const downBtn = screen.getByTitle('Decrease Priority (Move Down)');

         // Click Up
         fireEvent.click(upBtn);
         expect(onPriorityChange).toHaveBeenCalledWith('1', 'up');

         // Click Down
         fireEvent.click(downBtn);
         expect(onPriorityChange).toHaveBeenCalledWith('1', 'down');
    });

    it('calls onUninstall', () => {
         const onUninstall = vi.fn();
         const localMod = { ...mockMod, isEnabled: false };
         render(<ModCard mod={mockMod} isInstalled={true} localMod={localMod} onUninstall={onUninstall} />);

         const trashBtn = screen.getByTitle('Uninstall');
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
