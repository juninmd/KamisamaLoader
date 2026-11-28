import React, { createContext, useCallback, useContext, type ReactNode } from 'react';
import { ToastProvider as SonidoToastProvider, useToast as useSonidoToast } from '@juninmd/sonido';

type ToastKind = 'success' | 'error' | 'info';

interface ToastContextType {
    showToast: (message: string, type: ToastKind) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TONES: Record<ToastKind, 'success' | 'danger' | 'neutral'> = {
    success: 'success',
    error: 'danger',
    info: 'neutral',
};

/** Bridges the app's `showToast(message, type)` API onto Sonido toasts. */
const ToastBridge: React.FC<{ children: ReactNode }> = ({ children }) => {
    const toast = useSonidoToast();

    const showToast = useCallback(
        (message: string, type: ToastKind) => {
            toast({ title: message, tone: TONES[type], duration: 5000 });
        },
        [toast]
    );

    return <ToastContext.Provider value={{ showToast }}>{children}</ToastContext.Provider>;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
    <SonidoToastProvider>
        <ToastBridge>{children}</ToastBridge>
    </SonidoToastProvider>
);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
