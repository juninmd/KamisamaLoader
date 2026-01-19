import React from 'react';

const Skeleton: React.FC = () => {
    return (
        <div className="glass-panel overflow-hidden border border-white/5 h-[320px] animate-pulse">
            <div className="h-40 bg-gray-700/50"></div>
            <div className="p-4 space-y-4">
                <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
                <div className="h-10 bg-gray-700/50 rounded mt-4"></div>
            </div>
        </div>
    );
};

export default Skeleton;
