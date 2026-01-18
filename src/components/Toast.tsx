import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    // Add enter animation class on mount
  }, []);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-400" />;
      case 'error':
        return <XCircle size={20} className="text-red-400" />;
      case 'info':
        return <Info size={20} className="text-blue-400" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/80 border-green-500/30 text-green-100';
      case 'error':
        return 'bg-red-900/80 border-red-500/30 text-red-100';
      case 'info':
        return 'bg-blue-900/80 border-blue-500/30 text-blue-100';
    }
  };

  return (
    <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl min-w-[300px] animate-in slide-in-from-right fade-in duration-300 ${getStyles()}`}>
      {getIcon()}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
