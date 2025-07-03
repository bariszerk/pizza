// hooks/use-auth.ts
'use client';

import { createClient } from '@/utils/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useState, useEffect, useCallback, useRef } from 'react';

interface Profile {
    role: string | null;
    staff_branch_id: string | null;
    staff_branch_name?: string | null; // Şube adını tutmak için eklendi
    first_name?: string | null;
    last_name?: string | null;
}

interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    role: string | null;
    staffBranchId: string | null;
    staffBranchName: string | null; // Şube adını state'e ekle
    firstName: string | null;
    lastName: string | null;
    loading: boolean;
    error: Error | null;
}

export function useAuth(): AuthState {
    const supabase = createClient();

    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [staffBranchId, setStaffBranchId] = useState<string | null>(null);
    const [staffBranchName, setStaffBranchName] = useState<string | null>(null); // Şube adı için state
    const [firstName, setFirstName] = useState<string | null>(null);
    const [lastName, setLastName] = useState<string | null>(null);
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
        // console.log('useAuth: Fetching user profile for ID:', userId);
        setLoading(true); // Keep loading true while fetching profile
        setError(null);

        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role, staff_branch_id, first_name, last_name')
                .eq('id', userId)
                .single();

            if (!mountedRef.current) return;

            if (profileError) {
                console.warn('useAuth: Profile fetch error:', profileError.message, 'User ID:', userId);
                // setError(profileError); // Potentially set error state
                setProfile(null);
                setRole(null);
                setStaffBranchId(null);
                setStaffBranchName(null); // Şube adını da sıfırla
                setFirstName(null);
                setLastName(null);
                fetchedProfileForUserIdRef.current = null;
                // Do not throw, allow auth state to settle even if profile fails
            } else if (profileData) {
                // console.log('useAuth: Profile fetched successfully. Role:', profileData.role);
                setProfile(profileData as Profile);
                setRole(profileData.role);
                setStaffBranchId(profileData.staff_branch_id);
                setFirstName(profileData.first_name || null);
                setLastName(profileData.last_name || null);
                fetchedProfileForUserIdRef.current = userId;

                // Şube ID'si varsa, şube adını çek
                if (profileData.staff_branch_id) {
                    const { data: branchData, error: branchError } = await supabase
                        .from('branches')
                        .select('name')
                        .eq('id', profileData.staff_branch_id)
                        .single();

                    if (!mountedRef.current) return;
                    if (branchError) {
                        console.warn('useAuth: Branch name fetch error:', branchError.message);
                        setStaffBranchName(null);
                    } else if (branchData) {
                        setStaffBranchName(branchData.name);
                    } else {
                        setStaffBranchName(null);
                    }
                } else {
                    setStaffBranchName(null); // Şube ID'si yoksa adı da null yap
                }
            } else {
                console.warn('useAuth: No profile data found for user ID:', userId);
                setProfile(null);
                setRole(null);
                setStaffBranchId(null);
                setStaffBranchName(null); // Şube adını da sıfırla
                fetchedProfileForUserIdRef.current = null;
            }
        } catch (e: any) {
            if (!mountedRef.current) return;
            console.error('useAuth: Exception during profile fetch:', e.message, 'User ID:', userId);
            // setError(e); // Potentially set error state
            setProfile(null);
            setRole(null);
            setStaffBranchId(null);
            setStaffBranchName(null); // Şube adını da sıfırla
            fetchedProfileForUserIdRef.current = null;
        } finally {
            if (mountedRef.current) {
                 // Loading should be set to false after all auth state changes are processed,
                 // typically at the end of onAuthStateChange or initial getSession.
                 // Here, we only set it if there was an error or no user,
                 // otherwise, onAuthStateChange will handle it.
                 // For simplicity, let onAuthStateChange handle the final setLoading(false)
            }
        }
    }, [supabase]); // Only supabase is a direct dependency for fetchUserProfile

    useEffect(() => {
        setLoading(true); // Start with loading true

        const handleAuthChange = async (event: string | null, currentSession: Session | null) => {
            if (!mountedRef.current) return;

            // console.log('useAuth: Auth event:', event, 'Session user ID:', currentSession?.user?.id);
            setSession(currentSession);
            const currentUser = currentSession?.user ?? null;
            setUser(currentUser);

            if (event === 'SIGNED_OUT') {
                setProfile(null);
                setRole(null);
                setStaffBranchId(null);
                setStaffBranchName(null); // Oturum kapatıldığında şube adını da sıfırla
                fetchedProfileForUserIdRef.current = null;
            } else if (currentUser) {
                // Re-fetch profile if:
                // 1. It's a new user (ID changed)
                // 2. It's an explicit SIGNED_IN or USER_UPDATED event (profile might have changed server-side)
                // 3. Profile hasn't been fetched for the current user yet
                if (
                    fetchedProfileForUserIdRef.current !== currentUser.id ||
                    event === 'SIGNED_IN' ||
                    event === 'USER_UPDATED'
                    // Removed !profile check here, as fetchedProfileForUserIdRef.current handles "not fetched yet"
                ) {
                    await fetchUserProfile(currentUser.id);
                } else if (event === 'TOKEN_REFRESHED') {
                    // If token is refreshed for the same user and profile was already fetched,
                    // no need to re-fetch. Session is updated, user object might be new but ID is same.
                    // console.log('useAuth: Token refreshed for same user, profile retained.');
                }
            } else { // No user session
                setProfile(null);
                setRole(null);
                setStaffBranchId(null);
                setStaffBranchName(null); // Kullanıcı oturumu yoksa şube adını da sıfırla
                setFirstName(null);
                setLastName(null);
                fetchedProfileForUserIdRef.current = null;
            }
            // Set loading to false after all processing for this auth change is done
            if (mountedRef.current) {
                setLoading(false);
            }
        };

        // Initial session check
        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            // Pass null as event for initial load, or a specific string if preferred
            handleAuthChange('INITIAL_SESSION', initialSession);
        });

        // Listen to auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                handleAuthChange(event, session);
            }
        );

        return () => {
            authListener?.subscription?.unsubscribe();
            mountedRef.current = false;
        };
    }, [supabase, fetchUserProfile]); // Dependencies: supabase and fetchUserProfile

    return { session, user, profile, role, staffBranchId, staffBranchName, firstName, lastName, loading, error }; // staffBranchName'i döndür
}
