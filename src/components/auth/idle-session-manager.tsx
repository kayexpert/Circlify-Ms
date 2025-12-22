"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const TIMEOUT_DURATION = 30 * 60 * 1000;

export function IdleSessionManager() {
    const router = useRouter();
    const supabase = createClient();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const resetTimer = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(async () => {
                // Session timed out
                try {
                    await supabase.auth.signOut();
                    toast.error('Session timed out due to inactivity. Please sign in again.');
                    router.push('/signin');
                } catch (error) {
                    console.error('Error signing out:', error);
                }
            }, TIMEOUT_DURATION);
        };

        // Events to detect user activity
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        // Initial set
        resetTimer();

        // Add event listeners
        const handleActivity = () => {
            resetTimer();
        };

        events.forEach(event => {
            document.addEventListener(event, handleActivity);
        });

        // Cleanup
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
        };
    }, [router, supabase]);

    return null; // This component doesn't render anything
}
