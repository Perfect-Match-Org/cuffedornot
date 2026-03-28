import { useEffect } from 'react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'default';
}

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    onConfirm,
    onCancel,
    variant = 'default',
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border-2 border-pmblue2-500 shadow-lg max-w-md w-full p-6">
                <h3 className="font-dela-gothic text-lg text-pmblue2-800 mb-2">{title}</h3>
                <p className="font-work-sans text-sm text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-full border-2 border-pmblue2-500 font-work-sans text-sm text-pmblue2-800 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-full font-work-sans text-sm text-white transition-colors ${
                            variant === 'danger'
                                ? 'bg-pmred-500 hover:bg-red-600'
                                : 'bg-pmblue-500 hover:bg-blue-800'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
