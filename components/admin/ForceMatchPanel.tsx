import { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';

interface ForceMatchPanelProps {
    prefillEmail?: string;
    onMatchCreated: () => void;
}

export default function ForceMatchPanel({ prefillEmail, onMatchCreated }: ForceMatchPanelProps) {
    const [emailA, setEmailA] = useState('');
    const [emailB, setEmailB] = useState('');
    const [platonic, setPlatonic] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (prefillEmail) {
            setEmailA(prefillEmail);
            setError(null);
            setSuccess(null);
        }
    }, [prefillEmail]);

    const handleSubmit = () => {
        if (!emailA.trim() || !emailB.trim()) {
            setError('Both email fields are required');
            return;
        }
        setShowConfirm(true);
    };

    const confirmMatch = async () => {
        setShowConfirm(false);
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch('/api/admin/matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userA: emailA.trim(), userB: emailB.trim(), platonic }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Force match failed');
                return;
            }
            setSuccess(`Matched ${emailA.trim()} ↔ ${emailB.trim()}`);
            setEmailA('');
            setEmailB('');
            setPlatonic(false);
            onMatchCreated();
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="mb-10">
            <h2 className="font-dela-gothic text-lg text-pmblue2-800 mb-4">Force Match</h2>
            <div className="border-2 border-pmblue2-500 rounded-lg p-5 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="font-work-sans text-xs text-gray-500 mb-1 block">User A Email</label>
                        <input
                            type="email"
                            value={emailA}
                            onChange={(e) => setEmailA(e.target.value)}
                            placeholder="usera@cornell.edu"
                            className="w-full px-3 py-2 border border-pmblue2-500 rounded-lg font-work-sans text-sm focus:outline-none focus:ring-2 focus:ring-pmblue-500"
                        />
                    </div>
                    <div>
                        <label className="font-work-sans text-xs text-gray-500 mb-1 block">User B Email</label>
                        <input
                            type="email"
                            value={emailB}
                            onChange={(e) => setEmailB(e.target.value)}
                            placeholder="userb@cornell.edu"
                            className="w-full px-3 py-2 border border-pmblue2-500 rounded-lg font-work-sans text-sm focus:outline-none focus:ring-2 focus:ring-pmblue-500"
                        />
                    </div>
                </div>

                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={platonic}
                        onChange={(e) => setPlatonic(e.target.checked)}
                        className="w-4 h-4 accent-pmblue-500"
                    />
                    <span className="font-work-sans text-sm text-gray-700">Platonic match</span>
                </label>

                {error && <p className="text-pmred-500 font-work-sans text-sm mb-3">{error}</p>}
                {success && <p className="text-green-600 font-work-sans text-sm mb-3">{success}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-2 rounded-full bg-pmblue-500 text-white font-work-sans text-sm font-medium border-2 border-pmblue-500 shadow-[3px_3px_0_0_#24438d] hover:shadow-[1px_1px_0_0_#24438d] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Matching...' : 'Force Match'}
                </button>
            </div>

            <ConfirmDialog
                open={showConfirm}
                title="Confirm Force Match"
                message={`Are you sure you want to force-match ${emailA.trim()} and ${emailB.trim()}${platonic ? ' (platonic)' : ''}? This will override any existing match status for both users.`}
                confirmLabel="Force Match"
                variant="danger"
                onConfirm={confirmMatch}
                onCancel={() => setShowConfirm(false)}
            />
        </section>
    );
}
