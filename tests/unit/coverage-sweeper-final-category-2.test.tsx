/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import CategorySidebar from '../../src/components/CategorySidebar';

vi.mock('lucide-react', () => {
    const MockIcon = () => <div data-testid="icon" />;
    return {
        Folder: MockIcon, Star: MockIcon, Search: MockIcon, Plus: MockIcon, ChevronDown: MockIcon, Package: MockIcon,
        Music: MockIcon, User: MockIcon, Image: MockIcon, Map: MockIcon, Gamepad2: MockIcon, Palette: MockIcon, Wrench: MockIcon
    };
});

describe('CategorySidebar remaining line 132', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('should fire onSelect on a favorite category', () => {
        localStorage.setItem('favoriteCategories', JSON.stringify(['Audio']));
        const onCategorySelectSpy = vi.fn();

        render(
            <CategorySidebar
                categories={[{ id: 1, name: 'Audio', modCount: 5 }]}
                selectedCategories={[]}
                onCategorySelect={onCategorySelectSpy}
            />
        );

        // find the favorite block. There should be two "Audio" texts, one in favorites, one in all.
        // the button has the class "w-full text-left"
        const audioButtons = screen.getAllByText('Audio');
        expect(audioButtons.length).toBeGreaterThan(0);

        // click the first one which should be the favorite
        fireEvent.click(audioButtons[0]);

        expect(onCategorySelectSpy).toHaveBeenCalledWith('Audio');
    });
});
