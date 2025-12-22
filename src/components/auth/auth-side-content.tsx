"use client";

import React from "react";
import { Quote, Star, Check } from "lucide-react";

export function AuthSideContent() {
    return (
        <div className="flex flex-col justify-between h-full w-full max-w-lg mx-auto  py-12 text-white">
            <div className="flex-1 flex flex-col justify-center">
                {/* <div className="mb-8 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl w-fit">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-500 rounded-lg">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold">Circlify CMS</span>
                    </div>
                </div> */}

                <h2 className="text-4xl font-bold mb-8 leading-tight">
                    Manage your entire organization in one unified platform
                </h2>

                <div className="space-y-6 text-lg text-white/90">
                    <div className="flex gap-4 items-center">
                        <div className="mt-1 p-1 bg-brand-500/20 rounded-full flex-shrink-0">
                            <Check className="w-5 h-5 text-brand-400" />
                        </div>
                        <p className="leading-snug">
                            Track membership, attendance, and visitor follow-ups with a comprehensive directory.
                        </p>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="mt-1 p-1 bg-brand-500/20 rounded-full flex-shrink-0">
                            <Check className="w-5 h-5 text-brand-400" />
                        </div>
                        <p className="leading-snug">
                            Manage income, expenses, budgets, and reconciliation with enterprise-grade reporting.
                        </p>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="mt-1 p-1 bg-brand-500/20 rounded-full flex-shrink-0">
                            <Check className="w-5 h-5 text-brand-400" />
                        </div>
                        <p className="leading-snug">
                            Coordinate events, projects, and assets seamlessly while fostering community growth.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-8 border-t border-white/10">
                <div className="flex items-center flex-col">
                    <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                    </div>
                    <p className="text-lg italic mb-3 text-white/90 text-sm">
                        &quot;This platform transformed how we manage our community. The financial tools and member tracking are absolute game-changers.&quot;
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">David Okonjo</p>
                        <p className="text-sm text-white/60">Operations Director</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
