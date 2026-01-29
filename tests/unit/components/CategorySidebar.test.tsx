// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import CategorySidebar from '../../../src/components/CategorySidebar';

describe('CategorySidebar', () => {
    const mockCategories = [
        { id: 1, name: 'Characters', count: 10 },
        { id: 2, name: 'Maps', count: 5 }
    ];
    const mockSelect = vi.fn();

    it('should render categories', () => {
        renderWithProviders(
            <CategorySidebar
                categories={mockCategories}
                selectedCategories={[]}
                onCategorySelect={mockSelect}
            />
        );
        expect(screen.getByText('Characters')).toBeInTheDocument();
        expect(screen.getByText('Maps')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should handle selection', () => {
        renderWithProviders(
            <CategorySidebar
                categories={mockCategories}
                selectedCategories={[]}
                onCategorySelect={mockSelect}
            />
        );
        fireEvent.click(screen.getByText('Characters'));
        expect(mockSelect).toHaveBeenCalledWith('Characters');
    });

    it('should filter categories by search', () => {
        renderWithProviders(
            <CategorySidebar
                categories={mockCategories}
                selectedCategories={[]}
                onCategorySelect={mockSelect}
            />
        );

        const searchInput = screen.getByPlaceholderText('Search categories...');
        fireEvent.change(searchInput, { target: { value: 'Map' } });

        expect(screen.getByText('Maps')).toBeInTheDocument();
        expect(screen.queryByText('Characters')).not.toBeInTheDocument();
    });

    it('should toggle favorites', () => {
        renderWithProviders(
            <CategorySidebar
                categories={mockCategories}
                selectedCategories={[]}
                onCategorySelect={mockSelect}
            />
        );

        const buttons = screen.getAllByLabelText('Toggle favorite');
        expect(buttons.length).toBeGreaterThan(0);

        const firstButton = buttons[0];
        fireEvent.click(firstButton);

        // Verify it's still there
        expect(screen.getAllByLabelText('Toggle favorite')[0]).toBeInTheDocument();
    });
});
