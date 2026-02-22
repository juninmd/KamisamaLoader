// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FilterBar, { FilterState } from '../../../src/components/FilterBar.tsx';

describe('FilterBar Final Gaps', () => {
    const mockOnFilterChange = vi.fn();
    const defaultFilters: FilterState = {
        categories: [],
        sortBy: 'date',
        order: 'desc',
        dateRange: 'all',
        nsfw: false,
        zeroSpark: false,
        colorZ: false
    };

    it('should toggle NSFW filter', () => {
        render(
            <FilterBar
                availableCategories={[]}
                activeFilters={defaultFilters}
                onFilterChange={mockOnFilterChange}
            />
        );

        const nsfwButton = screen.getByRole('button', { name: /nsfw/i });
        fireEvent.click(nsfwButton);

        expect(mockOnFilterChange).toHaveBeenCalledWith({
            ...defaultFilters,
            nsfw: true
        });
    });

    it('should toggle ZeroSpark filter', () => {
        render(
            <FilterBar
                availableCategories={[]}
                activeFilters={defaultFilters}
                onFilterChange={mockOnFilterChange}
            />
        );

        const zeroSparkButton = screen.getByRole('button', { name: /zerospark/i });
        fireEvent.click(zeroSparkButton);

        expect(mockOnFilterChange).toHaveBeenCalledWith({
            ...defaultFilters,
            zeroSpark: true
        });
    });

    it('should toggle ColorZ filter', () => {
        render(
            <FilterBar
                availableCategories={[]}
                activeFilters={defaultFilters}
                onFilterChange={mockOnFilterChange}
            />
        );

        const colorZButton = screen.getByRole('button', { name: /colorz/i });
        fireEvent.click(colorZButton);

        expect(mockOnFilterChange).toHaveBeenCalledWith({
            ...defaultFilters,
            colorZ: true
        });
    });

    it('should remove category when X is clicked', () => {
        const filtersWithCategory: FilterState = {
            ...defaultFilters,
            categories: ['TestCat']
        };

        render(
            <FilterBar
                availableCategories={[{ id: 1, name: 'TestCat' }]}
                activeFilters={filtersWithCategory}
                onFilterChange={mockOnFilterChange}
            />
        );

        // Find the tag for "TestCat"
        const tag = screen.getByText('TestCat');
        expect(tag).toBeInTheDocument();

        // The remove button is a sibling or child. It's an icon button.
        // It's inside the same div.
        // Let's find the button inside the chip.
        // The chip contains "TestCat" and a button with X icon.
        // We can look for the button inside the container that has "TestCat".

        // Actually, the button has an X icon. It might not have text.
        // Let's rely on the structure or class.
        // <button onClick={() => removeCategory(category)} ...> <X size={14} /> </button>

        // Let's just find all buttons and click the one that looks like a close button?
        // Or better, find the button inside the chip.

        const closeButtons = screen.getAllByRole('button');
        // The chip is rendered when categories.length > 0.
        // The close button is the one *next* to the text.

        // Let's traverse from the text.
        const chipText = screen.getByText('TestCat');
        const chipContainer = chipText.parentElement;
        const removeButton = chipContainer?.querySelector('button');

        expect(removeButton).toBeTruthy();
        fireEvent.click(removeButton!);

        expect(mockOnFilterChange).toHaveBeenCalledWith({
            ...filtersWithCategory,
            categories: []
        });
    });

    it('should toggle category via dropdown', () => {
        render(
            <FilterBar
                availableCategories={[{ id: 1, name: 'TestCat' }]}
                activeFilters={defaultFilters}
                onFilterChange={mockOnFilterChange}
            />
        );

        // Open Dropdown
        const dropdownBtn = screen.getByRole('button', { name: /Category/i });
        fireEvent.click(dropdownBtn);

        // Click Category
        const catBtn = screen.getByText('TestCat');
        fireEvent.click(catBtn);

        expect(mockOnFilterChange).toHaveBeenCalledWith({
            ...defaultFilters,
            categories: ['TestCat']
        });
    });

    it('should toggle category off via dropdown', () => {
        const filtersWithCat: FilterState = {
            ...defaultFilters,
            categories: ['TestCat']
        };

        render(
            <FilterBar
                availableCategories={[{ id: 1, name: 'TestCat' }]}
                activeFilters={filtersWithCat}
                onFilterChange={mockOnFilterChange}
            />
        );

        // Open Dropdown
        const dropdownBtn = screen.getByRole('button', { name: /Category/i });
        fireEvent.click(dropdownBtn);

        // Click Category (should remove it)
        // Use getByRole button to distinguish from the chip span
        const catBtn = screen.getByRole('button', { name: 'TestCat' });
        fireEvent.click(catBtn);

        expect(mockOnFilterChange).toHaveBeenCalledWith({
            ...filtersWithCat,
            categories: []
        });
    });

    it('should change sort order', () => {
        render(
            <FilterBar
                availableCategories={[]}
                activeFilters={defaultFilters}
                onFilterChange={mockOnFilterChange}
            />
        );

        // Open Dropdown (Default is "Most Recent" or similar based on sortBy prop, but button text might be icon + label)
        // sortOptions finds `activeFilters.sortBy`. default is 'date'. label is 'Most Recent'.
        const dropdownBtn = screen.getByRole('button', { name: /Most Recent/i });
        fireEvent.click(dropdownBtn);

        // Select 'Most Downloaded'
        const option = screen.getByText('Most Downloaded');
        fireEvent.click(option);

        expect(mockOnFilterChange).toHaveBeenCalledWith({
            ...defaultFilters,
            sortBy: 'downloads'
        });
    });

    it('should change date range', () => {
        render(
            <FilterBar
                availableCategories={[]}
                activeFilters={defaultFilters}
                onFilterChange={mockOnFilterChange}
            />
        );

        // Open Dropdown (Default 'all' -> 'All Time')
        const dropdownBtn = screen.getByRole('button', { name: /All Time/i });
        fireEvent.click(dropdownBtn);

        // Select 'Last Week'
        const option = screen.getByText('Last Week');
        fireEvent.click(option);

        expect(mockOnFilterChange).toHaveBeenCalledWith({
            ...defaultFilters,
            dateRange: 'week'
        });
    });

    it('should clear all filters', () => {
        const filtersWithStuff: FilterState = {
            ...defaultFilters,
            categories: ['Cat1'],
            nsfw: true
        };

        render(
            <FilterBar
                availableCategories={[]}
                activeFilters={filtersWithStuff}
                onFilterChange={mockOnFilterChange}
            />
        );

        const clearBtn = screen.getByRole('button', { name: /Clear All/i });
        fireEvent.click(clearBtn);

        expect(mockOnFilterChange).toHaveBeenCalledWith({
            categories: [],
            sortBy: 'downloads',
            order: 'desc',
            dateRange: 'all'
        });
    });
});
