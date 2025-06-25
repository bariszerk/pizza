// hooks/use-auth.ts
'use client';

import { createClient } from '@/utils/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';

interface Profile {
    role: string | null;
    staff_branch_id: string | null;
    // Add other profile fields if necessary
}

interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    role: string | null;
    staffBranchId: string | null;
    loading: boolean;
    error: Error | null;
}

export function useAuth(): AuthState {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();

    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [staffBranchId, setStaffBranchId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // To prevent setting state on unmounted component
    const mountedRef = useRef(true);
    // To keep track of which user's profile has been fetched
    const fetchedProfileForUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const fetchUserProfile = useCallback(async (userId: string) => {
        if (!mountedRef.current) return;
        console.log('useAuth: Fetching user profile for ID:', userId);
        setLoading(true);
        setError(null);

        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role, staff_branch_id')
                .eq('id', userId)
                .single();

            if (!mountedRef.current) return;

            if (profileError) {
                console.warn('useAuth: Profile fetch error:', profileError.message);
                throw profileError;
            }

            if (profileData) {
                console.log('useAuth: Profile fetched successfully. Role:', profileData.role);
                setProfile(profileData as Profile);
                setRole(profileData.role);
                setStaffBranchId(profileData.staff_branch_id);
                fetchedProfileForUserIdRef.current = userId;
            } else {
                console.warn('useAuth: No profile data found for user ID:', userId);
                setProfile(null);
                setRole(null);
                setStaffBranchId(null);
                fetchedProfileForUserIdRef.current = null; // Clear if no profile found
            }
        } catch (e: any) {
            if (!mountedRef.current) return;
            console.error('useAuth: Exception during profile fetch:', e.message);
            setError(e);
            setProfile(null);
            setRole(null);
            setStaffBranchId(null);
            fetchedProfileForUserIdRef.current = null;
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [supabase]);

    useEffect(() => {
        setLoading(true);
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (!mountedRef.current) return;
            console.log('useAuth: Initial getSession. User ID:', currentSession?.user?.id);
            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
                if (fetchedProfileForUserIdRef.current !== currentSession.user.id || !profile) {
                    fetchUserProfile(currentSession.user.id);
                } else {
                    setLoading(false); // Profile already fetched for this user
                }
            } else {
                setProfile(null);
                setRole(null);
                setStaffBranchId(null);
                fetchedProfileForUserIdRef.current = null;
                setLoading(false);
            }
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!mountedRef.current) return;
                console.log('useAuth: onAuthStateChange event:', event, 'Session user ID:', newSession?.user?.id);

                setSession(newSession);
                setUser(newSession?.user ?? null);

                if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    setRole(null);
                    setStaffBranchId(null);
                    fetchedProfileForUserIdRef.current = null;
                    setLoading(false);
                    // Navigation is typically handled by middleware or page logic,
                    // but can be added here if specific behavior is needed from the hook itself.
                    // Example: if (pathname !== '/login' && pathname !== '/signup') router.push('/login');
                    return;
                }

                if (newSession?.user) {
                    if (fetchedProfileForUserIdRef.current !== newSession.user.id || !profile || event === 'USER_UPDATED' || event === 'SIGNED_IN') {
                        fetchUserProfile(newSession.user.id);
                    } else if (event === 'TOKEN_REFRESHED' && fetchedProfileForUserIdRef.current === newSession.user.id && profile) {
                        console.log('useAuth: Token refreshed for same user, profile retained.');
                        setLoading(false); // No need to re-fetch if profile for this user is already loaded
                    }
                } else if (event !== 'SIGNED_OUT' && !newSession?.user) {
                    // Session became null unexpectedly
                    setProfile(null);
                    setRole(null);
                    setStaffBranchId(null);
                    fetchedProfileForUserIdRef.current = null;
                    setLoading(false);
                }
            }
        );

        return () => {
            authListener?.subscription?.unsubscribe();
            mountedRef.current = false; // Also set on unmount
        };
    }, [supabase, fetchUserProfile, profile, router, pathname]); // Added profile, router, pathname dependencies

    return { session, user, profile, role, staffBranchId, loading, error };
}
