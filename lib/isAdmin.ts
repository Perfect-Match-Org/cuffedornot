import { ADMIN_EMAILS } from '@/config/admins';

export function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email);
}
