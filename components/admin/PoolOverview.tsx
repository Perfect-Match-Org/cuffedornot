import { useState, useEffect, useCallback, useRef } from 'react';

interface AdminUser {
    email: string;
    firstName: string | null;
    profileComplete: boolean;
    optIn: boolean;
    unmatchable: boolean;
    matchedWith: string | null;
    matchPlatonic: boolean;
    hasSpotifyData: boolean;
    verdict: string | null;
    cuffedOrNotScore: number | null;
}

type SortField = keyof AdminUser;
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortField; label: string }[] = [
    { key: 'email', label: 'Email' },
    { key: 'firstName', label: 'Name' },
    { key: 'hasSpotifyData', label: 'Spotify' },
    { key: 'verdict', label: 'Verdict' },
    { key: 'cuffedOrNotScore', label: 'Score' },
    { key: 'optIn', label: 'Opted In' },
    { key: 'matchedWith', label: 'Matched With' },
    { key: 'matchPlatonic', label: 'Platonic' },
    { key: 'unmatchable', label: 'Unmatchable' },
];

export default function PoolOverview() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('email');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [loading, setLoading] = useState(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, 300);
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), sortField, sortDir });
            if (debouncedSearch) params.set('search', debouncedSearch);
            const res = await fetch(`/api/admin/users?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            setUsers(data.users);
            setTotal(data.total);
            setTotalPages(data.totalPages);
        } catch {
            // Silent
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, sortField, sortDir]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const toggleSort = (field: SortField) => {
        setPage(1);
        if (sortField === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const downloadCsv = () => {
        const header = COLUMNS.map((c) => c.label).join(',');
        const rows = users.map((u) =>
            COLUMNS.map((c) => {
                const v = u[c.key];
                if (v === null || v === undefined) return '';
                if (typeof v === 'boolean') return v ? 'Yes' : 'No';
                return String(v).includes(',') ? `"${v}"` : String(v);
            }).join(',')
        );
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pool-overview.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const boolCell = (val: boolean) => (
        <span className={val ? 'text-green-600' : 'text-gray-400'}>{val ? '✓' : '✗'}</span>
    );

    return (
        <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-dela-gothic text-lg text-pmblue2-800">Pool Overview</h2>
                <div className="flex items-center gap-3">
                    <span className="font-work-sans text-xs text-gray-500">{total} users</span>
                    <button
                        onClick={downloadCsv}
                        className="text-sm font-work-sans text-pmblue-500 underline hover:text-pmblue2-800 transition-colors"
                    >
                        Download CSV
                    </button>
                </div>
            </div>

            <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by email..."
                className="w-full mb-4 px-3 py-2 border border-pmblue2-500 rounded-lg font-work-sans text-sm focus:outline-none focus:ring-2 focus:ring-pmblue-500"
            />

            <div className="border-2 border-pmblue2-500 rounded-lg overflow-x-auto">
                <table className="w-full text-sm font-work-sans">
                    <thead>
                        <tr className="bg-pmblue2-500/20">
                            {COLUMNS.map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => toggleSort(col.key)}
                                    className="px-3 py-2 text-left text-pmblue2-800 font-semibold cursor-pointer hover:bg-pmblue2-500/30 whitespace-nowrap select-none"
                                >
                                    {col.label}
                                    {sortField === col.key && (
                                        <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-gray-400">
                                    Loading...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-gray-400">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            users.map((u) => (
                                <tr key={u.email} className="even:bg-gray-50 border-t border-gray-100">
                                    <td className="px-3 py-2 truncate max-w-[200px]" title={u.email}>{u.email}</td>
                                    <td className="px-3 py-2">{u.firstName ?? '—'}</td>
                                    <td className="px-3 py-2 text-center">{boolCell(u.hasSpotifyData)}</td>
                                    <td className="px-3 py-2">{u.verdict ?? '—'}</td>
                                    <td className="px-3 py-2">{u.cuffedOrNotScore != null ? u.cuffedOrNotScore : '—'}</td>
                                    <td className="px-3 py-2 text-center">{boolCell(u.optIn)}</td>
                                    <td className="px-3 py-2 truncate max-w-[180px]" title={u.matchedWith ?? ''}>{u.matchedWith ?? '—'}</td>
                                    <td className="px-3 py-2 text-center">{u.matchedWith ? boolCell(u.matchPlatonic) : '—'}</td>
                                    <td className="px-3 py-2 text-center">{boolCell(u.unmatchable)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 rounded-full border border-pmblue2-500 font-work-sans text-sm disabled:opacity-40"
                    >
                        Prev
                    </button>
                    <span className="font-work-sans text-sm text-gray-600">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 rounded-full border border-pmblue2-500 font-work-sans text-sm disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}
        </section>
    );
}
