import { useRef, useState, useEffect } from 'react';

interface ReceiptifyFormProps {
    onSubmit: (accessToken: string) => void;
    disabled: boolean;
}

function validateUrl(url: string): { valid: boolean; error: string | null } {
    if (!url.trim()) return { valid: false, error: null };
    const hasHost = url.includes('receiptify.herokuapp.com');
    const hashIndex = url.indexOf('#');
    const hasToken = hashIndex !== -1 && url.slice(hashIndex).includes('access_token=');
    if (!hasHost || !hasToken) {
        return {
            valid: false,
            error: "That doesn't look right — make sure you copy the full URL from your browser's address bar after visiting Receiptify.",
        };
    }
    return { valid: true, error: null };
}

function extractAccessToken(url: string): string | null {
    try {
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return null;
        const params = new URLSearchParams(url.slice(hashIndex + 1));
        return params.get('access_token');
    } catch {
        return null;
    }
}

export default function ReceiptifyForm({ onSubmit, disabled }: ReceiptifyFormProps) {
    const [value, setValue] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isValid, setIsValid] = useState(false);
    const [tipOpen, setTipOpen] = useState(false);
    const submitRef = useRef<HTMLButtonElement>(null);

    // Auto-expand mobile copy tip on narrow viewports
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setTipOpen(true);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const v = e.target.value;
        setValue(v);
        if (!v.trim()) {
            setValidationError(null);
            setIsValid(false);
            return;
        }
        const result = validateUrl(v);
        setValidationError(result.error);
        setIsValid(result.valid);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || disabled) return;
        // Disable synchronously before any async work
        if (submitRef.current) submitRef.current.disabled = true;
        const token = extractAccessToken(value);
        if (!token) {
            setValidationError("Couldn't extract the access token — try copying the URL again.");
            if (submitRef.current) submitRef.current.disabled = false;
            return;
        }
        setValue('');
        onSubmit(token);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
            <label
                htmlFor="receiptify-url"
                className="block font-work-sans font-semibold text-pmblue2-800 mb-2"
            >
                Paste your Receiptify URL here
            </label>

            <textarea
                id="receiptify-url"
                value={value}
                onChange={handleChange}
                placeholder="https://receiptify.herokuapp.com/#access_token=..."
                rows={3}
                disabled={disabled}
                className={`w-full rounded-xl border-2 p-3 font-work-sans text-base resize-none transition-colors focus:outline-none focus:border-pmblue-500 disabled:opacity-50 ${
                    validationError
                        ? 'border-pmred-500'
                        : 'border-pmblue2-500'
                }`}
                style={{ fontSize: '16px' }} // explicit 16px prevents iOS Safari auto-zoom
            />

            {validationError && (
                <p className="mt-1.5 text-sm font-work-sans text-pmred-500" role="alert">
                    {validationError}
                </p>
            )}

            <p className="mt-2 text-xs font-work-sans text-gray-500">
                By pasting this URL, you consent to us reading your Spotify listening data to generate
                your result. No data is sold or shared outside this event.
            </p>

            {/* Mobile copy tip */}
            <div className="mt-3">
                <button
                    type="button"
                    onClick={() => setTipOpen((o) => !o)}
                    className="flex items-center gap-1 text-sm font-work-sans text-pmblue-500 hover:opacity-75 transition-opacity cursor-pointer"
                    aria-expanded={tipOpen}
                >
                    <svg
                        className={`w-3 h-3 transition-transform duration-200 ${tipOpen ? 'rotate-90' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                    >
                        <path d="M6.293 4.293a1 1 0 011.414 0L14 10.586l-6.293 6.293a1 1 0 01-1.414-1.414L11.172 10.5 6.293 5.707a1 1 0 010-1.414z" />
                    </svg>
                    Having trouble copying the URL?
                </button>
                <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: tipOpen ? '1fr' : '0fr' }}
                >
                    <div className="overflow-hidden">
                        <div className="mt-2 rounded-xl border border-pmblue2-500 bg-blue-50 p-3 text-sm font-work-sans text-gray-700 space-y-1.5">
                            <p className="font-semibold text-pmblue2-800">On iOS:</p>
                            <p>Tap the address bar → tap the full URL to select it → tap Copy</p>
                            <p className="font-semibold text-pmblue2-800 pt-1">On Android:</p>
                            <p>Tap the address bar → long-press the URL → tap Select All → tap Copy</p>
                        </div>
                    </div>
                </div>
            </div>

            <button
                ref={submitRef}
                type="submit"
                disabled={!isValid || disabled}
                className="mt-5 w-full min-h-[48px] rounded-full border-4 border-pmblue-500 bg-white px-8 py-3 font-work-sans font-semibold text-pmred-500 shadow-[6px_6px_0px_0px_rgba(36,67,141,1)] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_rgba(36,67,141,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-[6px_6px_0px_0px_rgba(36,67,141,1)] disabled:translate-x-0 disabled:translate-y-0 cursor-pointer"
            >
                Analyze My Spotify
            </button>
        </form>
    );
}
