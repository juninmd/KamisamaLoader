import React, { useState } from 'react';
import { X, ChevronDown, Calendar, TrendingUp, Eye, Heart, Download } from 'lucide-react';
import { Badge, Button } from '@juninmd/sonido';

export interface FilterState {
    categories: string[];
    sortBy: 'downloads' | 'views' | 'likes' | 'date' | 'name';
    order: 'asc' | 'desc';
    dateRange: 'week' | 'month' | 'year' | 'all';
    nsfw?: boolean;
    zeroSpark?: boolean;
    colorZ?: boolean;
}

interface FilterBarProps {
    availableCategories: Array<{ id: number; name: string }>;
    activeFilters: FilterState;
    onFilterChange: (filters: FilterState) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
    availableCategories,
    activeFilters,
    onFilterChange
}) => {
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showDateDropdown, setShowDateDropdown] = useState(false);

    const toggleCategory = (category: string) => {
        const newCategories = activeFilters.categories.includes(category)
            ? activeFilters.categories.filter(c => c !== category)
            : [...activeFilters.categories, category];

        onFilterChange({ ...activeFilters, categories: newCategories });
    };

    const removeCategory = (category: string) => {
        onFilterChange({
            ...activeFilters,
            categories: activeFilters.categories.filter(c => c !== category)
        });
    };

    const setSortBy = (sortBy: FilterState['sortBy']) => {
        onFilterChange({ ...activeFilters, sortBy });
        setShowSortDropdown(false);
    };

    const setDateRange = (dateRange: FilterState['dateRange']) => {
        onFilterChange({ ...activeFilters, dateRange });
        setShowDateDropdown(false);
    };

    const clearAll = () => {
        onFilterChange({
            categories: [],
            sortBy: 'downloads',
            order: 'desc',
            dateRange: 'all'
        });
    };

    const hasActiveFilters = activeFilters.categories.length > 0 || activeFilters.dateRange !== 'all';

    const sortOptions = [
        { value: 'downloads' as const, label: 'Most Downloaded', icon: Download },
        { value: 'likes' as const, label: 'Most Liked', icon: Heart },
        { value: 'views' as const, label: 'Most Viewed', icon: Eye },
        { value: 'date' as const, label: 'Most Recent', icon: Calendar },
        { value: 'name' as const, label: 'Alphabetical', icon: TrendingUp }
    ];

    const dateOptions = [
        { value: 'week' as const, label: 'Last Week' },
        { value: 'month' as const, label: 'Last Month' },
        { value: 'year' as const, label: 'Last Year' },
        { value: 'all' as const, label: 'All Time' }
    ];

    const currentSort = sortOptions.find(s => s.value === activeFilters.sortBy);
    const currentDate = dateOptions.find(d => d.value === activeFilters.dateRange);

    return (
        <div className="flex flex-col space-y-3 mb-4">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Category Filter */}
                <div className="relative">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        iconEnd={<ChevronDown size={16} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />}
                    >
                        Category
                    </Button>

                    {showCategoryDropdown && (
                        <div className="absolute top-full mt-2 left-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                            {availableCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.name)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${activeFilters.categories.includes(cat.name) ? 'text-primary bg-primary/20' : 'text-gray-300'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sort By */}
                <div className="relative">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        iconStart={currentSort ? <currentSort.icon size={16} /> : undefined}
                        iconEnd={<ChevronDown size={16} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />}
                    >
                        {currentSort?.label}
                    </Button>

                    {showSortDropdown && (
                        <div className="absolute top-full mt-2 left-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 min-w-[180px]">
                            {sortOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setSortBy(option.value)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors flex items-center space-x-2 ${activeFilters.sortBy === option.value ? 'text-primary bg-primary/20' : 'text-gray-300'
                                        }`}
                                >
                                    <option.icon size={16} />
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Date Range */}
                <div className="relative">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowDateDropdown(!showDateDropdown)}
                        iconStart={<Calendar size={16} />}
                        iconEnd={<ChevronDown size={16} className={`transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />}
                    >
                        {currentDate?.label}
                    </Button>

                    {showDateDropdown && (
                        <div className="absolute top-full mt-2 left-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 min-w-[150px]">
                            {dateOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setDateRange(option.value)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${activeFilters.dateRange === option.value ? 'text-primary bg-primary/20' : 'text-gray-300'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Filters */}
                <div className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                    <Button
                        size="xs"
                        variant={activeFilters.nsfw ? 'danger' : 'secondary'}
                        appearance={activeFilters.nsfw ? 'solid' : 'outline'}
                        onClick={() => onFilterChange({ ...activeFilters, nsfw: !activeFilters.nsfw })}
                    >
                        NSFW
                    </Button>
                    <Button
                        size="xs"
                        variant={activeFilters.zeroSpark ? 'secondary' : 'ghost'}
                        appearance="outline"
                        onClick={() => onFilterChange({ ...activeFilters, zeroSpark: !activeFilters.zeroSpark })}
                        className={activeFilters.zeroSpark ? 'text-yellow-300 border-yellow-500/50 bg-yellow-600/20' : ''}
                    >
                        ZeroSpark
                    </Button>
                    <Button
                        size="xs"
                        variant={activeFilters.colorZ ? 'secondary' : 'ghost'}
                        appearance="outline"
                        onClick={() => onFilterChange({ ...activeFilters, colorZ: !activeFilters.colorZ })}
                        className={activeFilters.colorZ ? 'text-purple-300 border-purple-500/50 bg-purple-600/20' : ''}
                    >
                        ColorZ
                    </Button>
                </div>

                {/* Clear All */}
                {hasActiveFilters && (
                    <Button
                        variant="danger"
                        appearance="outline"
                        size="sm"
                        iconStart={<X size={16} />}
                        onClick={clearAll}
                    >
                        Clear All
                    </Button>
                )}
            </div>

            {/* Active Filter Chips */}
            {activeFilters.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {activeFilters.categories.map(category => (
                        <Badge
                            key={category}
                            tone="violet"
                            appearance="soft"
                            className="gap-2 animate-in fade-in duration-200"
                        >
                            <span>{category}</span>
                            <button
                                type="button"
                                aria-label={`Remove ${category}`}
                                onClick={() => removeCategory(category)}
                                className="hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FilterBar;
