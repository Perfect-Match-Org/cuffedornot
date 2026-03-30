import { FormEvent, useState } from 'react';

interface ProfileFormProps {
    firstName: string;
    initialProfile?: {
        genderIdentity: string;
        attractionPreference: string[];
        openToPlatonic: boolean;
    };
    optInOpen: boolean;
    onOptedIn: () => void;
}

const GENDER_OPTIONS = [
    'Man',
    'Woman',
    'Non-binary',
    'Genderqueer',
    'Agender',
    'Two-spirit',
    'Prefer to self-describe',
    'Prefer not to say',
];

const ATTRACTION_OPTIONS = [
    'Men',
    'Women',
    'Non-binary people',
    'Everyone',
    'Prefer not to say',
];

type FormState = 'idle' | 'submitting' | 'success' | 'opted_out';

export default function ProfileForm({
    firstName,
    initialProfile,
    optInOpen,
    onOptedIn,
}: ProfileFormProps) {
    const [formState, setFormState] = useState<FormState>('idle');
    const [genderIdentity, setGenderIdentity] = useState(initialProfile?.genderIdentity ?? '');
    const [attractionPreference, setAttractionPreference] = useState<string[]>(
        initialProfile?.attractionPreference ?? []
    );
    const [openToPlatonic, setOpenToPlatonic] = useState(initialProfile?.openToPlatonic ?? false);
    const [optInChecked, setOptInChecked] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!optInOpen) return null;

    const canSubmit =
        genderIdentity !== '' &&
        attractionPreference.length > 0 &&
        optInChecked &&
        formState === 'idle';

    function toggleAttraction(option: string) {
        setAttractionPreference((prev) =>
            prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
        );
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setFormState('submitting');
        setError(null);
        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ genderIdentity, attractionPreference, openToPlatonic }),
            });
            if (res.status === 423) {
                setError('Opt-in has closed.');
                setFormState('idle');
                return;
            }
            if (!res.ok) {
                setError('Something went wrong. Please try again.');
                setFormState('idle');
                return;
            }
            setFormState('success');
            onOptedIn();
        } catch {
            setError('Something went wrong. Please try again.');
            setFormState('idle');
        }
    }

    async function handleOptOut() {
        try {
            await fetch('/api/optout', { method: 'POST' });
        } catch {
            // ignore
        }
        setFormState('opted_out');
    }

    if (formState === 'opted_out') {
        return (
            <div className="rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-6 text-center">
                <p className="font-dela-gothic text-pmblue2-800 text-xl mb-2">You&apos;ve opted out.</p>
                <p className="font-work-sans text-gray-600 text-sm">
                    You won&apos;t be in the matching pool. Changed your mind? Refresh and opt in again before the deadline.
                </p>
            </div>
        );
    }

    if (formState === 'success') {
        return (
            <div className="rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-6 text-center">
                <p className="font-dela-gothic text-pmblue2-800 text-2xl mb-2">You&apos;re in!</p>
                <p className="font-work-sans text-gray-600 text-sm mb-5">
                    Check back April 1 at 8pm to see your match.
                </p>
                <button
                    onClick={handleOptOut}
                    className="font-work-sans text-xs text-gray-400 underline hover:text-gray-600 transition-colors cursor-pointer"
                >
                    Not feeling it? Opt out.
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-6">
            <h2 className="font-dela-gothic text-pmblue2-800 text-2xl mb-1">Get matched</h2>
            <p className="font-work-sans text-gray-500 text-sm mb-6">
                Fill out your profile to enter the matching pool.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* First name (read-only) */}
                <div>
                    <label className="block font-work-sans text-sm font-semibold text-pmblue2-800 mb-1">
                        First name
                    </label>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 font-work-sans text-gray-700 text-sm">
                        {firstName || '—'}
                    </div>
                </div>

                {/* Gender identity */}
                <div>
                    <label
                        htmlFor="genderIdentity"
                        className="block font-work-sans text-sm font-semibold text-pmblue2-800 mb-1"
                    >
                        Gender identity <span className="text-pmred-500">*</span>
                    </label>
                    <select
                        id="genderIdentity"
                        value={genderIdentity}
                        onChange={(e) => setGenderIdentity(e.target.value)}
                        required
                        className="w-full rounded-lg border-2 border-pmblue2-500 bg-white px-4 py-2.5 font-work-sans text-sm text-pmblue2-800 focus:outline-none focus:border-pmblue-500 cursor-pointer"
                    >
                        <option value="">Select one</option>
                        {GENDER_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Attraction preference */}
                <fieldset>
                    <legend className="font-work-sans text-sm font-semibold text-pmblue2-800 mb-2">
                        Attracted to <span className="text-pmred-500">*</span>
                    </legend>
                    <div className="space-y-2">
                        {ATTRACTION_OPTIONS.map((opt) => (
                            <label
                                key={opt}
                                className="flex items-center gap-3 cursor-pointer group"
                            >
                                <input
                                    type="checkbox"
                                    checked={attractionPreference.includes(opt)}
                                    onChange={() => toggleAttraction(opt)}
                                    className="w-4 h-4 rounded border-2 border-pmblue2-500 accent-pmblue-500 cursor-pointer"
                                />
                                <span className="font-work-sans text-sm text-gray-700 group-hover:text-pmblue2-800">
                                    {opt}
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                {/* Open to platonic */}
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={openToPlatonic}
                        onChange={(e) => setOpenToPlatonic(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-2 border-pmblue2-500 accent-pmblue-500 cursor-pointer"
                    />
                    <div>
                        <span className="font-work-sans text-sm font-semibold text-pmblue2-800">
                            Open to a platonic match
                        </span>
                        <p className="font-work-sans text-xs text-gray-500 mt-0.5">
                            If no romantic match is found, we may pair you as music buddies.
                        </p>
                    </div>
                </label>

                {/* Divider */}
                <hr className="border-pmpink2-500" />

                {/* Opt in */}
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={optInChecked}
                        onChange={(e) => setOptInChecked(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-2 border-pmblue2-500 accent-pmblue-500 cursor-pointer"
                    />
                    <span className="font-work-sans text-sm text-gray-700">
                        I want to be matched with another Cornell student based on my music taste.
                    </span>
                </label>

                {error && (
                    <p className="font-work-sans text-xs text-pmred-500" role="alert">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full min-h-[48px] rounded-full border-4 border-pmblue-500 bg-white px-8 py-3 font-work-sans font-semibold text-pmblue-500 shadow-[4px_4px_0px_#24438d] transition-all hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-[4px_4px_0px_#24438d] disabled:translate-x-0 disabled:translate-y-0 cursor-pointer"
                >
                    {formState === 'submitting' ? 'Submitting...' : "I'm in — match me!"}
                </button>
            </form>
        </div>
    );
}
