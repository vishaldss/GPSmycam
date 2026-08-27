import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface AndroidToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const AndroidToast: React.FC<AndroidToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div id="android-toast-container" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none max-w-[90vw]">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-zinc-900/95 backdrop-blur-md text-zinc-100 rounded-2xl border border-zinc-700/60 shadow-2xl shadow-black/60 text-sm font-medium"
            >
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {isError && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-400 shrink-0" />}

              <span className="break-all">{toast.message}</span>

              <button
                onClick={() => onDismiss(toast.id)}
                className="ml-1 p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
