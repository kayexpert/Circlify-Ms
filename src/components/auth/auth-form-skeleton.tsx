import { Loader } from "@/components/ui/loader";

export function AuthFormSkeleton() {
    return (
        <div className="flex flex-col flex-1 w-full h-full justify-center">
            <div className="flex flex-col justify-center w-full max-w-md mx-auto sm:pt-10">
                <div className="flex flex-col items-center justify-center min-h-[400px] w-full animate-in fade-in duration-500">
                    <Loader size="md" text="Loading authentication..." />
                </div>
            </div>
        </div>
    );
}

export function AuthFormSkeletonDetailed() {
    return (
        <div className="flex flex-col flex-1 w-full h-full justify-center">
            <div className="flex flex-col justify-center w-full max-w-md mx-auto sm:pt-10">
                <div className="space-y-6 w-full animate-pulse">
                    {/* Header skeleton */}
                    <div className="space-y-2 mb-6">
                        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                    </div>

                    {/* Google button skeleton */}
                    <div className="h-11 bg-gray-200 dark:bg-gray-800 rounded-lg w-full mb-6"></div>

                    {/* Divider */}
                    <div className="relative py-4 mb-4">
                        <div className="h-px bg-gray-200 dark:bg-gray-800 w-full"></div>
                    </div>

                    {/* Form fields skeleton */}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                        </div>
                    </div>

                    {/* Footer link skeleton */}
                    <div className="flex justify-between items-center mt-4 mb-6">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                    </div>

                    {/* Submit button skeleton */}
                    <div className="h-11 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>

                    {/* Bottom link skeleton */}
                    <div className="mt-6 flex justify-center">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AuthFormSkeletonOnboarding() {
    return (
        <div className="flex flex-col flex-1 w-full h-full justify-center">
            <div className="flex flex-col justify-center w-full max-w-md mx-auto sm:pt-10">
                <div className="space-y-6 w-full animate-pulse">
                    {/* Progress Bar Skeleton */}
                    <div className="mb-8">
                        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-4"></div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full w-full"></div>
                    </div>

                    {/* Header skeleton */}
                    <div className="space-y-2 mb-6">
                        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                    </div>

                    {/* Form fields skeleton */}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                        </div>
                    </div>

                    {/* Submit button skeleton */}
                    <div className="h-11 bg-gray-200 dark:bg-gray-800 rounded-lg w-full mt-6"></div>
                </div>
            </div>
        </div>
    );
}
