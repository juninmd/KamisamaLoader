import React from 'react';
import { Switch as SonidoSwitch } from '@juninmd/sonido';

interface SwitchProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'checked'> {
    label?: string;
    description?: string;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
}

/**
 * Sonido's `<input type="checkbox" role="switch">` with the app's previous
 * optional-label API. When no label is given the text column is hidden.
 */
export const Switch: React.FC<SwitchProps> = ({
    className,
    label,
    description,
    checked = false,
    onChange,
    ...props
}) => (
    <SonidoSwitch
        checked={checked}
        onChange={(next) => onChange?.(next)}
        label={label ?? 'Toggle'}
        description={description}
        className={[label ? '' : 'sn-switch--unlabeled', className].filter(Boolean).join(' ')}
        {...props}
    />
);
