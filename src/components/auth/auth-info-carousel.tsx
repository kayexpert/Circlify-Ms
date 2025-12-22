"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, Star } from "lucide-react";

interface Testimonial {
    quote: string;
    author: string;
    role: string;
    company: string;
}

const testimonials: Testimonial[] = [
    {
        quote: "Circlify has completely transformed how we build our internal tools. The UI is simply stunning and the performance is unmatched.",
        author: "Alex Morgan",
        role: "CTO",
        company: "TechFlow Inc.",
    },
    {
        quote: "The best admin dashboard template I've used in years. It's incredibly fast, responsive, and the code quality is top-notch.",
        author: "Sarah Chen",
        role: "Senior Developer",
        company: "Innovate Labs",
    },
    {
        quote: "Security and performance right out of the box. It saved us weeks of development time on our latest enterprise project.",
        author: "James Wilson",
        role: "Tech Lead",
        company: "Enterprise Solutions",
    },
];

export function AuthInfoCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % testimonials.length);
        }, 5000); // Change slide every 5 seconds

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center max-w-lg mx-auto text-center px-8">
            <div className="mb-8 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl">
                <div className="text-white text-4xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-brand-500 rounded-lg">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span>Circlify CMS</span>
                </div>
            </div>

            <div className="relative h-64 w-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-x-0 top-0 flex flex-col items-center"
                    >
                        <div className="flex gap-1 mb-6">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            ))}
                        </div>

                        <Quote className="w-10 h-10 text-white/20 mb-4" />

                        <p className="text-xl font-medium text-white/90 leading-relaxed mb-6 font-display italic">
                            "{testimonials[currentIndex].quote}"
                        </p>

                        <div className="flex flex-col items-center">
                            <h4 className="text-lg font-bold text-white">
                                {testimonials[currentIndex].author}
                            </h4>
                            <p className="text-sm text-white/60">
                                {testimonials[currentIndex].role} at {testimonials[currentIndex].company}
                            </p>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex gap-2.5 mt-8">
                {testimonials.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "w-8 bg-brand-500" : "w-2 bg-white/30 hover:bg-white/50"
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
