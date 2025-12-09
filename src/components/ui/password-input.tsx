"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors duration-200",
            className
          )}
          ref={ref}
          {...props}
        />
        <span
          onClick={() => setShowPassword(!showPassword)}
          className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
        >
          {showPassword ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-gray-500 dark:fill-gray-400">
              <path d="M10 3.75C5.83333 3.75 2.27417 6.34167 0.833328 10C2.27417 13.6583 5.83333 16.25 10 16.25C14.1667 16.25 17.7258 13.6583 19.1667 10C17.7258 6.34167 14.1667 3.75 10 3.75ZM10 14.5833C7.69917 14.5833 5.83333 12.7175 5.83333 10.4167C5.83333 8.11583 7.69917 6.25 10 6.25C12.3008 6.25 14.1667 8.11583 14.1667 10.4167C14.1667 12.7175 12.3008 14.5833 10 14.5833ZM10 7.91667C8.61917 7.91667 7.49999 9.03583 7.49999 10.4167C7.49999 11.7975 8.61917 12.9167 10 12.9167C11.3808 12.9167 12.5 11.7975 12.5 10.4167C12.5 9.03583 11.3808 7.91667 10 7.91667Z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-gray-500 dark:fill-gray-400">
              <path d="M10 3.75C5.83333 3.75 2.27417 6.34167 0.833328 10C2.27417 13.6583 5.83333 16.25 10 16.25C14.1667 16.25 17.7258 13.6583 19.1667 10C17.7258 6.34167 14.1667 3.75 10 3.75ZM10 14.5833C7.69917 14.5833 5.83333 12.7175 5.83333 10.4167C5.83333 8.11583 7.69917 6.25 10 6.25C12.3008 6.25 14.1667 8.11583 14.1667 10.4167C14.1667 12.7175 12.3008 14.5833 10 14.5833ZM10 7.91667C8.61917 7.91667 7.49999 9.03583 7.49999 10.4167C7.49999 11.7975 8.61917 12.9167 10 12.9167C11.3808 12.9167 12.5 11.7975 12.5 10.4167C12.5 9.03583 11.3808 7.91667 10 7.91667Z" />
              <path d="M1.66666 1.66667L18.3333 18.3333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </span>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };

