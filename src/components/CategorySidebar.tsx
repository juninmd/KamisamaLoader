import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, Star, Users, Palette, Map, Gamepad2, Music, Wrench, Sparkles, Package } from 'lucide-react';

export interface Category {
    id: number;
    name: string;
    count?: number;
}

interface CategorySidebarProps {
    categories: Category[];
    selectedCategories: string[];
    onCategorySelect: (category: string) => void;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
    categories,
    selectedCategories,
    onCategorySelect
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    // Load favorites from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('favoriteCategories');
        if (saved) {
            try {
                setFavorites(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load favorite categories:', e);
            }
        }
    }, []);

    // Save favorites to localStorage
    useEffect(() => {
        localStorage.setItem('favoriteCategories', JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = (categoryName: string) => {
        setFavorites(prev =>
            prev.includes(categoryName)
                ? prev.filter(c => c !== categoryName)
                : [...prev, categoryName]
        );
    };

    const getCategoryIcon = (categoryName: string) => {
        const name = categoryName.toLowerCase();
        if (name.includes('character') || name.includes('skin')) return Users;
        if (name.includes('map') || name.includes('stage')) return Map;
        if (name.includes('gameplay') || name.includes('mechanic')) return Gamepad2;
        if (name.includes('sound') || name.includes('music') || name.includes('audio')) return Music;
        if (name.includes('ui') || name.includes('hud')) return Palette;
        if (name.includes('tool') || name.includes('util')) return Wrench;
        if (name.includes('effect') || name.includes('visual')) return Sparkles;
        return Package;
    };

    const getCategoryColor = (categoryName: string) => {
        const name = categoryName.toLowerCase();
        if (name.includes('character') || name.includes('skin')) return 'text-purple-400 border-purple-500/30 bg-purple-600/10';
        if (name.includes('map') || name.includes('stage')) return 'text-green-400 border-green-500/30 bg-green-600/10';
        if (name.includes('gameplay')) return 'text-orange-400 border-orange-500/30 bg-orange-600/10';
        if (name.includes('sound') || name.includes('music')) return 'text-pink-400 border-pink-500/30 bg-pink-600/10';
        if (name.includes('ui')) return 'text-cyan-400 border-cyan-500/30 bg-cyan-600/10';
        if (name.includes('tool')) return 'text-yellow-400 border-yellow-500/30 bg-yellow-600/10';
        return 'text-gray-400 border-gray-500/30 bg-gray-600/10';
    };

    const filteredCategories = (categories || []).filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const favoriteCategories = filteredCategories.filter(cat => favorites.includes(cat.name));
    const regularCategories = filteredCategories.filter(cat => !favorites.includes(cat.name));

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed left-0 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-xl border border-white/10 border-l-0 rounded-r-xl p-3 text-gray-400 hover:text-white transition-colors z-40"
            >
                <ChevronRight size={20} />
            </button>
        );
    }

    return (
        <div className="w-64 flex-shrink-0 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4 overflow-y-auto max-h-[calc(100vh-200px)] animate-in slide-in-from-left duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Categories</h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronDown size={18} className="rotate-90" />
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
            </div>

            {/* Favorites Section */}
            {favoriteCategories.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2 px-2">
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Favorites</span>
                    </div>
                    <div className="space-y-1">
                        {favoriteCategories.map(cat => (
                            <CategoryItem
                                key={cat.id}
                                category={cat}
                                isSelected={selectedCategories.includes(cat.name)}
                                isFavorite={true}
                                icon={getCategoryIcon(cat.name)}
                                colorClass={getCategoryColor(cat.name)}
                                onSelect={() => onCategorySelect(cat.name)}
                                onToggleFavorite={() => toggleFavorite(cat.name)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* All Categories */}
            <div>
                <div className="flex items-center space-x-2 mb-2 px-2">
                    <Package size={14} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">All Categories</span>
                </div>
                <div className="space-y-1">
                    {regularCategories.map(cat => (
                        <CategoryItem
                            key={cat.id}
                            category={cat}
                            isSelected={selectedCategories.includes(cat.name)}
                            isFavorite={false}
                            icon={getCategoryIcon(cat.name)}
                            colorClass={getCategoryColor(cat.name)}
                            onSelect={() => onCategorySelect(cat.name)}
                            onToggleFavorite={() => toggleFavorite(cat.name)}
                        />
                    ))}
                </div>
            </div>

            {filteredCategories.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                    No categories found
                </div>
            )}
        </div>
    );
};

interface CategoryItemProps {
    category: Category;
    isSelected: boolean;
    isFavorite: boolean;
    icon: React.ElementType;
    colorClass: string;
    onSelect: () => void;
    onToggleFavorite: () => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
    category,
    isSelected,
    isFavorite,
    icon: Icon,
    colorClass,
    onSelect,
    onToggleFavorite
}) => {
    return (
        <div
            className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer ${isSelected
                ? `${colorClass} border`
                : 'hover:bg-white/5 text-gray-300 border border-transparent'
                }`}
            onClick={onSelect}
        >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
                <Icon size={16} className={isSelected ? '' : 'text-gray-500'} />
                <span className="text-sm font-medium truncate">{category.name}</span>
                {category.count !== undefined && (
                    <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full text-gray-400">
                        {category.count}
                    </span>
                )}
            </div>

            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    aria-label="Toggle favorite"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite();
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                    <Star
                        size={14}
                        className={isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}
                    />
                </button>
            </div>
        </div>
    );
};

export default CategorySidebar;
