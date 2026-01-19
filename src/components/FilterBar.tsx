import React, { useState } from 'react';
import { X, ChevronDown, Calendar, TrendingUp, Eye, Heart, Download } from 'lucide-react';

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
                    <button
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        className="flex items-center space-x-2 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                    >
                        <span>Category</span>
                        <ChevronDown size={16} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showCategoryDropdown && (
                        <div className="absolute top-full mt-2 left-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                            {availableCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.name)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${activeFilters.categories.includes(cat.name) ? 'text-blue-400 bg-blue-600/20' : 'text-gray-300'
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
                    <button
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        className="flex items-center space-x-2 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                    >
                        {currentSort && <currentSort.icon size={16} />}
                        <span>{currentSort?.label}</span>
                        <ChevronDown size={16} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showSortDropdown && (
                        <div className="absolute top-full mt-2 left-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 min-w-[180px]">
                            {sortOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setSortBy(option.value)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors flex items-center space-x-2 ${activeFilters.sortBy === option.value ? 'text-blue-400 bg-blue-600/20' : 'text-gray-300'
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
                    <button
                        onClick={() => setShowDateDropdown(!showDateDropdown)}
                        className="flex items-center space-x-2 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                    >
                        <Calendar size={16} />
                        <span>{currentDate?.label}</span>
                        <ChevronDown size={16} className={`transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showDateDropdown && (
                        <div className="absolute top-full mt-2 left-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 min-w-[150px]">
                            {dateOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setDateRange(option.value)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${activeFilters.dateRange === option.value ? 'text-blue-400 bg-blue-600/20' : 'text-gray-300'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Filters */}
                <div className="flex items-center space-x-2 border-l border-white/10 pl-3 ml-1">
                    <button
                        onClick={() => onFilterChange({ ...activeFilters, nsfw: !activeFilters.nsfw })}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${activeFilters.nsfw ? 'bg-red-600/20 border-red-500/50 text-red-300' : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5'}`}
                    >
                        NSFW
                    </button>
                    <button
                        onClick={() => onFilterChange({ ...activeFilters, zeroSpark: !activeFilters.zeroSpark })}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${activeFilters.zeroSpark ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-300' : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5'}`}
                    >
                        ZeroSpark
                    </button>
                    <button
                        onClick={() => onFilterChange({ ...activeFilters, colorZ: !activeFilters.colorZ })}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${activeFilters.colorZ ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5'}`}
                    >
                        ColorZ
                    </button>
                </div>

                {/* Clear All */}
                {hasActiveFilters && (
                    <button
                        onClick={clearAll}
                        className="flex items-center space-x-2 bg-red-600/20 border border-red-500/30 rounded-xl px-4 py-2 text-sm text-red-300 hover:bg-red-600/40 transition-colors"
                    >
                        <X size={16} />
                        <span>Clear All</span>
                    </button>
                )}
            </div>

            {/* Active Filter Chips */}
            {activeFilters.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {activeFilters.categories.map(category => (
                        <div
                            key={category}
                            className="flex items-center space-x-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-3 py-1 text-sm text-blue-300 animate-in fade-in duration-200"
                        >
                            <span>{category}</span>
                            <button
                                onClick={() => removeCategory(category)}
                                className="hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FilterBar;
