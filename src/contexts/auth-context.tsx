"use client";

import React, { createContext, useContext, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

const AuthContext = createContext<SupabaseClient | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Create the Supabase client once and provide it to all children
    // This avoids recreating the client on every page navigation
    const supabase = useMemo(() => createClient(), []);

    return (
        <AuthContext.Provider value={supabase}>
            {children}
        </AuthContext.Provider>
    );
}

export function useSupabase() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useSupabase must be used within AuthProvider');
    }
    return context;
}
