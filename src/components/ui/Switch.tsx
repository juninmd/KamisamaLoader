import React from 'react';
import { cn } from '../../lib/utils';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Switch: React.FC<SwitchProps> = ({ className, label, checked, onChange, disabled, ...props }) => {
    return (
        <label className={cn("inline-flex items-center cursor-pointer", disabled && "cursor-not-allowed opacity-50")}>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    {...props}
                />
                <div className={cn(
                    "w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 border border-gray-600",
                    className
                )}></div>
            </div>
            {label && <span className="ml-3 text-sm font-medium text-white">{label}</span>}
        </label>
    );
};
