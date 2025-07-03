'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner'; // Import toast

export function useAutoSignOut(
	timeoutMinutes = 15,
	warningMinutes = 2
) {
	const router = useRouter();
	const supabase = createClient(); // Initialize Supabase client once

	const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const currentToastIdRef = useRef<string | number | null>(null); // To store current toast ID

	const signOutUser = useCallback(async () => {
		if (currentToastIdRef.current) {
			toast.dismiss(currentToastIdRef.current); // Dismiss any active warning toast
			currentToastIdRef.current = null;
		}
		await supabase.auth.signOut();
		router.push('/login?message=session_expired'); // Optional: add a query param for context
		toast.info('Oturumunuz sonlandırıldı.');
	}, [router, supabase]);

	const showWarningNotification = useCallback(() => {
		if (currentToastIdRef.current) {
			toast.dismiss(currentToastIdRef.current);
		}
		const toastId = toast(
			`Oturumunuz ${warningMinutes} dakika içinde sona erecek.`,
			{
				description: 'Devam etmek için bu bildirimi kapatın veya bir işlem yapın.',
				action: {
					label: 'Oturumda Kal',
					onClick: () => {
						// resetActivityTimer will be called by user activity,
						// or if they dismiss this specific toast by clicking the button.
						// No explicit reset needed here if action itself counts as activity.
						// However, we should ensure the main timer is reset.
						// eslint-disable-next-line @typescript-eslint/no-use-before-define
						resetActivityTimer();
						toast.dismiss(toastId);
						currentToastIdRef.current = null;
					},
				},
				duration: warningMinutes * 60 * 1000, // Keep toast visible for the warning duration
				onDismiss: () => {
					currentToastIdRef.current = null;
				},
				onAutoClose: () => {
					// This might not be needed if duration handles it, but good for clarity
					currentToastIdRef.current = null;
				}
			}
		);
		currentToastIdRef.current = toastId;
	}, [warningMinutes, signOutUser]);


	const resetActivityTimer = useCallback(() => {
		// Clear existing timers
		if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
		if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
		if (currentToastIdRef.current) {
			toast.dismiss(currentToastIdRef.current); // Dismiss warning if user becomes active
			currentToastIdRef.current = null;
		}

		// Set warning timer
		warningTimerRef.current = setTimeout(
			showWarningNotification,
			(timeoutMinutes - warningMinutes) * 60 * 1000
		);

		// Set final sign-out timer
		activityTimerRef.current = setTimeout(
			signOutUser,
			timeoutMinutes * 60 * 1000
		);
	}, [timeoutMinutes, warningMinutes, showWarningNotification, signOutUser]);

	useEffect(() => {
		const events: (keyof WindowEventMap)[] = [
			'mousemove',
			'mousedown',
			'keydown',
			'touchstart',
			'scroll',
		];

		const handleActivity = () => {
			// console.log('Auto Sign Out: Activity detected.');
			resetActivityTimer();
		};

		// Check if running in a browser environment
		if (typeof window !== 'undefined') {
			events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
			resetActivityTimer(); // Initial setup
		}

		return () => {
			if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
			if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
			if (currentToastIdRef.current) {
				toast.dismiss(currentToastIdRef.current);
				currentToastIdRef.current = null;
			}
			if (typeof window !== 'undefined') {
				events.forEach((e) => window.removeEventListener(e, handleActivity));
			}
		};
	}, [resetActivityTimer]); // Only resetActivityTimer as dependency
}
