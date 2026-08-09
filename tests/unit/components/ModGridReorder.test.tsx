// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModGrid } from '../../../src/components/mods/ModGrid';
import type { LocalMod } from '../../../shared/types';

vi.mock('../../../src/components/mods/ModCard', () => ({
    ModCard: ({ mod }: any) => <div data-testid={`card-${mod.id}`}>{mod.name}</div>
}));

const mods = [
    { id: 'a', name: 'Alpha', isEnabled: true, priority: 3 },
    { id: 'b', name: 'Beta', isEnabled: true, priority: 2 },
    { id: 'c', name: 'Gamma', isEnabled: true, priority: 1 },
] as unknown as LocalMod[];

const dragData = () => {
    const store = new Map<string, string>();
    return {
        types: ['application/x-kamisama-mod'],
        setData: (type: string, value: string) => store.set(type, value),
        getData: (type: string) => store.get(type) || '',
        effectAllowed: '',
        dropEffect: '',
    };
};

describe('ModGrid load order drag and drop', () => {
    const renderGrid = (onReorder?: (ids: string[]) => void) =>
        render(<ModGrid mods={mods as any} installedMods={mods} onReorder={onReorder} />);

    it('is only draggable when reordering is enabled', () => {
        renderGrid();
        expect(screen.queryByTestId('mod-drag-a')).toBeNull();

        renderGrid(vi.fn());
        expect(screen.getByTestId('mod-drag-a')).toBeTruthy();
    });

    it('moves the dragged mod to the drop position', () => {
        const onReorder = vi.fn();
        renderGrid(onReorder);
        const dataTransfer = dragData();

        fireEvent.dragStart(screen.getByTestId('mod-drag-c'), { dataTransfer });
        fireEvent.drop(screen.getByTestId('mod-drag-a'), { dataTransfer });

        expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b']);
    });

    it('ignores a drop on the dragged mod itself', () => {
        const onReorder = vi.fn();
        renderGrid(onReorder);
        const dataTransfer = dragData();

        fireEvent.dragStart(screen.getByTestId('mod-drag-b'), { dataTransfer });
        fireEvent.drop(screen.getByTestId('mod-drag-b'), { dataTransfer });

        expect(onReorder).not.toHaveBeenCalled();
    });

    it('ignores drops that carry no mod id, such as an installer file drop', () => {
        const onReorder = vi.fn();
        renderGrid(onReorder);

        fireEvent.drop(screen.getByTestId('mod-drag-a'), { dataTransfer: dragData() });

        expect(onReorder).not.toHaveBeenCalled();
    });
});
