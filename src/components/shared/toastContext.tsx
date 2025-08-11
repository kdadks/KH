import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook kept in same file for now; file only exports provider + hook so fast refresh rule satisfied.
export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; onConfirm: () => void; onCancel?: () => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const newToast: Toast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => removeToast(id), toast.duration || 5000);
  }, [removeToast]);

  const showSuccess = useCallback((title: string, message?: string) => showToast({ type: 'success', title, message }), [showToast]);
  const showError = useCallback((title: string, message?: string) => showToast({ type: 'error', title, message, duration: 7000 }), [showToast]);
  const showWarning = useCallback((title: string, message?: string) => showToast({ type: 'warning', title, message, duration: 6000 }), [showToast]);
  const showInfo = useCallback((title: string, message?: string) => showToast({ type: 'info', title, message }), [showToast]);
  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, onCancel?: () => void) => { setConfirmDialog({ title, message, onConfirm, onCancel }); }, []);

  const handleConfirm = () => { if (confirmDialog) { confirmDialog.onConfirm(); setConfirmDialog(null); } };
  const handleCancel = () => { if (confirmDialog) { confirmDialog.onCancel?.(); setConfirmDialog(null); } };

  const getToastIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info': return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const value = useMemo<ToastContextType>(() => ({ showToast, showSuccess, showError, showWarning, showInfo, showConfirm }), [showToast, showSuccess, showError, showWarning, showInfo, showConfirm]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`${getToastStyles(t.type)} border rounded-lg shadow-lg p-4 flex items-start space-x-3`}> 
            {getToastIcon(t.type)}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium">{t.title}</h4>
              {t.message && <p className="text-sm mt-1 opacity-90">{t.message}</p>}
              {t.action && <button onClick={t.action.onClick} className="text-sm font-medium underline mt-2 hover:no-underline">{t.action.label}</button>}
            </div>
            <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">{confirmDialog.title}</h3></div>
            <div className="p-6">
              <div className="flex items-center mb-4"><div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4"><AlertTriangle className="w-6 h-6 text-yellow-600" /></div><p className="text-gray-700">{confirmDialog.message}</p></div>
              <div className="flex space-x-3">
                <button onClick={handleConfirm} className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium">Confirm</button>
                <button onClick={handleCancel} className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
