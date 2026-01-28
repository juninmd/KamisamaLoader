// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import FilterBar, { FilterState } from '../../../src/components/FilterBar';

describe('FilterBar', () => {
    const mockCategories = [{ id: 1, name: 'Cat1' }];
    const defaultFilters: FilterState = {
        categories: [],
        sortBy: 'downloads',
        order: 'desc',
        dateRange: 'all',
        nsfw: false,
        zeroSpark: false,
        colorZ: false
    };
    const mockChange = vi.fn();

    it('should render filter buttons', () => {
        renderWithProviders(
            <FilterBar
                availableCategories={mockCategories}
                activeFilters={defaultFilters}
                onFilterChange={mockChange}
            />
        );
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Most Downloaded')).toBeInTheDocument();
        expect(screen.getByText('All Time')).toBeInTheDocument();
    });

    it('should toggle boolean filters', () => {
        renderWithProviders(
            <FilterBar
                availableCategories={mockCategories}
                activeFilters={defaultFilters}
                onFilterChange={mockChange}
            />
        );

        fireEvent.click(screen.getByText('NSFW'));
        expect(mockChange).toHaveBeenCalledWith(expect.objectContaining({ nsfw: true }));

        fireEvent.click(screen.getByText('ZeroSpark'));
        expect(mockChange).toHaveBeenCalledWith(expect.objectContaining({ zeroSpark: true }));
    });

    it('should open sort dropdown', () => {
        renderWithProviders(
            <FilterBar
                availableCategories={mockCategories}
                activeFilters={defaultFilters}
                onFilterChange={mockChange}
            />
        );

        fireEvent.click(screen.getByText('Most Downloaded')); // The button label
        expect(screen.getByText('Most Liked')).toBeInTheDocument(); // Option in dropdown

        fireEvent.click(screen.getByText('Most Liked'));
        expect(mockChange).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'likes' }));
    });

    it('should handle date range dropdown', () => {
        renderWithProviders(
            <FilterBar
                availableCategories={mockCategories}
                activeFilters={defaultFilters}
                onFilterChange={mockChange}
            />
        );

        fireEvent.click(screen.getByText('All Time'));
        expect(screen.getByText('Last Week')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Last Week'));
        expect(mockChange).toHaveBeenCalledWith(expect.objectContaining({ dateRange: 'week' }));
    });

    it('should toggle categories', () => {
        renderWithProviders(
            <FilterBar
                availableCategories={mockCategories}
                activeFilters={defaultFilters}
                onFilterChange={mockChange}
            />
        );

        fireEvent.click(screen.getByText('Category'));
        fireEvent.click(screen.getByText('Cat1'));

        // Add
        expect(mockChange).toHaveBeenCalledWith(expect.objectContaining({
            categories: expect.arrayContaining(['Cat1'])
        }));
    });

    it('should remove category via chip', () => {
        renderWithProviders(
            <FilterBar
                availableCategories={mockCategories}
                activeFilters={{ ...defaultFilters, categories: ['Cat1'] }}
                onFilterChange={mockChange}
            />
        );

        // Find chip remove button
        // Chips are rendered as "Cat1" text with an X button next to it.
        // The X icon inside button.
        const removeBtns = screen.getAllByRole('button');
        // We can look for the specific button.
        // Better: look for Cat1 text container

        // The chip code:
        // <div ...> <span>{category}</span> <button onClick...> <X /> </button> </div>

        const catChip = screen.getByText('Cat1');
        // The X button is the next sibling or we can find it by role within the container if we had one.
        // Given the structure <div><span>Text</span><button><X/></button></div>
        // nextElementSibling is the button.
        const removeBtn = catChip.nextElementSibling;

        expect(removeBtn).toBeInTheDocument();
        fireEvent.click(removeBtn!);
        expect(mockChange).toHaveBeenCalledWith(expect.objectContaining({ categories: [] }));
    });

    it('should clear all filters', () => {
        renderWithProviders(
            <FilterBar
                availableCategories={mockCategories}
                activeFilters={{ ...defaultFilters, categories: ['Cat1'] }}
                onFilterChange={mockChange}
            />
        );

        fireEvent.click(screen.getByText('Clear All'));
        expect(mockChange).toHaveBeenCalledWith(expect.objectContaining({
            categories: [],
            sortBy: 'downloads',
            dateRange: 'all'
        }));
    });
});
