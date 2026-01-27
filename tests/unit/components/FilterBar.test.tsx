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
});
