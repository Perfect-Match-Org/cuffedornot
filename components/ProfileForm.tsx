import { FormEvent, useState } from 'react';

interface ProfileFormProps {
    firstName: string;
    initialProfile?: {
        genderIdentity: string;
        attractionPreference: string[];
        openToPlatonic: boolean;
    };
    optInOpen: boolean;
    alreadyOptedIn: boolean;
    onOptedIn: () => void;
    onOptedOut: () => void;
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

type FormState = 'idle' | 'editing' | 'submitting' | 'success' | 'updated' | 'opted_out';

export default function ProfileForm({
    firstName,
    initialProfile,
    optInOpen,
    alreadyOptedIn,
    onOptedIn,
    onOptedOut,
}: ProfileFormProps) {
    const [formState, setFormState] = useState<FormState>('idle');
    const [localFirstName, setLocalFirstName] = useState(firstName || '');
    const [genderIdentity, setGenderIdentity] = useState(initialProfile?.genderIdentity ?? '');
    const [attractionPreference, setAttractionPreference] = useState<string[]>(
        initialProfile?.attractionPreference ?? []
    );
    const [openToPlatonic, setOpenToPlatonic] = useState(initialProfile?.openToPlatonic ?? false);
    const [optInChecked, setOptInChecked] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!optInOpen) return null;

    // For new submissions, require the opt-in checkbox
    const canSubmitNew =
        localFirstName.trim() !== '' &&
        genderIdentity !== '' &&
        attractionPreference.length > 0 &&
        optInChecked &&
        formState === 'idle';

    // For edits, no opt-in checkbox needed
    const canSubmitEdit =
        localFirstName.trim() !== '' &&
        genderIdentity !== '' &&
        attractionPreference.length > 0 &&
        formState === 'editing';

    function toggleAttraction(option: string) {
        setAttractionPreference((prev) =>
            prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
        );
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const isEdit = alreadyOptedIn;
        if (isEdit ? !canSubmitEdit : !canSubmitNew) return;
        setFormState('submitting');
        setError(null);
        try {
            const res = await fetch('/api/profile', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName: localFirstName, genderIdentity, attractionPreference, openToPlatonic }),
            });
            if (res.status === 423) {
                setError('Opt-in has closed.');
                setFormState('idle');
                return;
            }
            if (!res.ok) {
                setError('Something went wrong. Please try again.');
                setFormState(isEdit ? 'editing' : 'idle');
                return;
            }
            if (isEdit) {
                setFormState('updated');
            } else {
                setFormState('success');
                onOptedIn();
            }
        } catch {
            setError('Something went wrong. Please try again.');
            setFormState(isEdit ? 'editing' : 'idle');
        }
    }

    async function handleOptOut() {
        try {
            const res = await fetch('/api/optout', { method: 'POST' });
            if (!res.ok) {
                setError('Failed to opt out. Please try again.');
                return;
            }
            setFormState('opted_out');
            onOptedOut();
        } catch {
            setError('Something went wrong. Please try again.');
        }
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

    // Post-submission confirmation (new opt-in)
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

    // Post-update confirmation
    if (formState === 'updated') {
        return (
            <div className="rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-6 text-center">
                <p className="font-dela-gothic text-pmblue2-800 text-2xl mb-2">Profile updated!</p>
                <p className="font-work-sans text-gray-600 text-sm mb-5">
                    Your matching preferences have been saved.
                </p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => setFormState('idle')}
                        className="font-work-sans text-xs text-pmblue-500 underline hover:text-pmblue2-800 transition-colors cursor-pointer"
                    >
                        Back to profile
                    </button>
                    <button
                        onClick={handleOptOut}
                        className="font-work-sans text-xs text-gray-400 underline hover:text-gray-600 transition-colors cursor-pointer"
                    >
                        Not feeling it? Opt out.
                    </button>
                </div>
            </div>
        );
    }

    // Already opted in — show summary with edit/opt-out actions
    if (alreadyOptedIn && formState === 'idle') {
        return (
            <div className="rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-6 text-center">
                <p className="font-dela-gothic text-pmblue2-800 text-2xl mb-2">You&apos;re in!</p>
                <p className="font-work-sans text-gray-600 text-sm mb-5">
                    Check back April 1 at 8pm to see your match.
                </p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => setFormState('editing')}
                        className="font-work-sans text-xs text-pmblue-500 underline hover:text-pmblue2-800 transition-colors cursor-pointer"
                    >
                        Update profile
                    </button>
                    <button
                        onClick={handleOptOut}
                        className="font-work-sans text-xs text-gray-400 underline hover:text-gray-600 transition-colors cursor-pointer"
                    >
                        Opt out
                    </button>
                </div>
            </div>
        );
    }

    // Profile form (new submission or editing)
    const isEditing = formState === 'editing';

    return (
        <div className="rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-6">
            <h2 className="font-dela-gothic text-pmblue2-800 text-2xl mb-1">
                {isEditing ? 'Update profile' : 'Get matched'}
            </h2>
            <p className="font-work-sans text-gray-500 text-sm mb-6">
                {isEditing
                    ? 'Update your matching preferences.'
                    : 'Fill out your profile to enter the matching pool.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* First name */}
                <div>
                    <label
                        htmlFor="firstName"
                        className="block font-work-sans text-sm font-semibold text-pmblue2-800 mb-1"
                    >
                        First name <span className="text-pmred-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="firstName"
                        value={localFirstName}
                        onChange={(e) => setLocalFirstName(e.target.value)}
                        required
                        className="w-full rounded-lg border-2 border-pmblue2-500 bg-white px-4 py-2.5 font-work-sans text-sm text-pmblue2-800 focus:outline-none focus:border-pmblue-500"
                    />
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

                {/* Opt in checkbox — only for new submissions */}
                {!isEditing && (
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
                )}

                {error && (
                    <p className="font-work-sans text-xs text-pmred-500" role="alert">
                        {error}
                    </p>
                )}

                <div className="flex flex-col items-center gap-3">
                    <button
                        type="submit"
                        disabled={isEditing ? !canSubmitEdit : !canSubmitNew}
                        className="w-full min-h-[48px] rounded-full border-4 border-pmblue-500 bg-white px-8 py-3 font-work-sans font-semibold text-pmred-500 shadow-[6px_6px_0px_0px_rgba(36,67,141,1)] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_rgba(36,67,141,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-[6px_6px_0px_0px_rgba(36,67,141,1)] disabled:translate-x-0 disabled:translate-y-0 cursor-pointer"
                    >
                        {formState === 'submitting'
                            ? 'Submitting...'
                            : isEditing
                                ? 'Save changes'
                                : "I'm in — match me!"}
                    </button>

                    {isEditing && (
                        <button
                            type="button"
                            onClick={() => setFormState('idle')}
                            className="font-work-sans text-xs text-gray-400 underline hover:text-gray-600 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
