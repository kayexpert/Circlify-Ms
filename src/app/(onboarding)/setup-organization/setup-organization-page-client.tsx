"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSupabase } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import { ORGANIZATION_TYPES, ORGANIZATION_SIZES, CURRENCIES } from "@/lib/constants";
import { PageTransition } from "@/components/auth/page-transition";
import { AuthPrimaryButton } from "@/components/auth/auth-components";
import { AuthFormSkeletonOnboarding } from "@/components/auth/auth-form-skeleton";
import { useQueryClient } from "@tanstack/react-query";

const organizationSchema = z.object({
    name: z.string().min(2, "Organization name must be at least 2 characters"),
    type: z.string().min(1, "Please select an organization type"),
    size: z.string().min(1, "Please select organization size"),
    description: z.string().optional(),
    currency: z.string().min(1, "Please select a currency"),
    location: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    email: z.union([
        z.string().email("Invalid email address"),
        z.literal(""),
    ]).optional(),
    website: z.union([
        z.string().url("Invalid URL format"),
        z.literal(""),
    ]).optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export function SetupOrganizationPageClient() {
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [isChecking, setIsChecking] = useState(true);
    const [currencyPopoverOpen, setCurrencyPopoverOpen] = useState(false);
    const [currencySearchQuery, setCurrencySearchQuery] = useState("");
    const router = useRouter();
    const supabase = useSupabase();
    const queryClient = useQueryClient();

    // Check if user already has an organization on mount
    useEffect(() => {
        async function checkExistingOrg() {
            // Ensure supabase client is available
            if (!supabase) return;

            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    router.push("/signin");
                    return;
                }

                const { data: orgUsers, error: orgUsersError } = await supabase
                    .from("organization_users")
                    .select("id")
                    .eq("user_id", user.id)
                    .limit(1);

                if (orgUsersError) {
                    console.error("Error checking organization:", orgUsersError);
                    setIsChecking(false);
                    return;
                }

                // If user already has an organization, redirect to dashboard
                if (orgUsers && orgUsers.length > 0) {
                    console.log("User already has organization, redirecting to dashboard");
                    router.push("/dashboard");
                    return;
                }
            } catch (error) {
                console.error("Error checking existing organization:", error);
            } finally {
                setIsChecking(false);
            }
        }

        checkExistingOrg();
    }, [router, supabase]);



    const form = useForm<OrganizationFormData>({
        resolver: zodResolver(organizationSchema),
        defaultValues: {
            name: "",
            type: "",
            size: "",
            description: "",
            currency: "",
            location: "",
            country: "",
            phone: "",
            email: "",
            website: "",
        },
    });

    function generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    async function onSubmit(data: OrganizationFormData) {
        if (!supabase) {
            toast.error("Authentication service not available");
            return;
        }

        setIsLoading(true);

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                const errorMsg = userError?.message || "User not authenticated";
                if (process.env.NODE_ENV === "development") {
                    console.error("Auth error:", userError);
                }
                throw new Error(errorMsg);
            }

            // Ensure user record exists in users table (trigger should create it, but verify)
            const { data: userRecord, error: userRecordError } = await supabase
                .from("users")
                .select("id")
                .eq("id", user.id)
                .maybeSingle();

            if (userRecordError && userRecordError.code !== "PGRST116") {
                // PGRST116 means no rows found
                if (process.env.NODE_ENV === "development") {
                    console.error("User record check error:", userRecordError);
                }
                throw new Error("User account not properly set up. Please try signing out and signing in again.");
            }

            if (!userRecord) {
                // User record doesn't exist, create it
                const { error: createUserError } = await supabase
                    .from("users")
                    .insert({
                        id: user.id,
                        email: user.email || "",
                        full_name: user.user_metadata?.full_name || null,
                    } as never);

                if (createUserError) {
                    if (process.env.NODE_ENV === "development") {
                        console.error("Error creating user record:", createUserError);
                    }
                    throw new Error("Failed to set up user account. Please try again.");
                }
            }

            const slug = generateSlug(data.name);

            // Validate slug is not empty
            if (!slug || slug.trim().length === 0) {
                throw new Error("Invalid organization name. Please enter a valid name.");
            }

            // Check if slug already exists
            // Note: RLS might prevent seeing other orgs, but we check anyway
            const { data: existingOrg, error: slugCheckError } = await supabase
                .from("organizations")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();

            if (slugCheckError && slugCheckError.code !== "PGRST116") {
                // PGRST116 means no rows found, which is fine
                if (process.env.NODE_ENV === "development") {
                    console.error("Slug check error:", slugCheckError);
                }
                throw new Error(`Unable to verify organization name: ${slugCheckError.message || "Database error"}`);
            }

            if (existingOrg) {
                throw new Error("An organization with this name already exists. Please choose a different name.");
            }

            // Prepare organization data - convert empty strings to null
            const orgInsert = {
                name: data.name.trim(),
                slug: slug,
                type: data.type,
                size: data.size || null,
                description: (data.description?.trim() || null) as string | null,
                currency: data.currency || "",
                location: (data.location?.trim() || null) as string | null,
                country: (data.country?.trim() || null) as string | null,
                phone: (data.phone?.trim() || null) as string | null,
                email: (data.email?.trim() || null) as string | null,
                website: (data.website?.trim() || null) as string | null,
                settings: {} as Record<string, unknown>,
            };

            if (process.env.NODE_ENV === "development") {
                console.log("Creating organization with user:", {
                    userId: user.id,
                    email: user.email,
                });
            }

            // Use the database function to create organization (bypasses RLS)
            // This function handles organization creation, user linking, and created_by setting
            const { data: orgData, error: orgError } = await (supabase.rpc as any)('create_organization', {
                p_name: orgInsert.name,
                p_slug: orgInsert.slug,
                p_type: orgInsert.type,
                p_size: orgInsert.size,
                p_description: orgInsert.description,
                p_currency: orgInsert.currency,
                p_location: orgInsert.location,
                p_country: orgInsert.country,
                p_phone: orgInsert.phone,
                p_email: orgInsert.email,
                p_website: orgInsert.website,
                p_settings: orgInsert.settings,
            });

            if (orgError) {
                // Log full error details for debugging
                if (process.env.NODE_ENV === "development") {
                    console.error("Organization creation error:", {
                        message: orgError.message || "Unknown error",
                        code: orgError.code || "Unknown code",
                        details: orgError.details || null,
                        hint: orgError.hint || null,
                        status: orgError.status || null,
                        fullError: JSON.stringify(orgError, Object.getOwnPropertyNames(orgError)),
                    });
                }

                // Provide user-friendly error messages
                let errorMessage = "Failed to create organization";

                // Check for RLS violation
                if (orgError.message?.includes("row-level security") || orgError.message?.includes("RLS")) {
                    errorMessage = "Permission denied. Please ensure you are properly signed in and try again.";
                } else if (orgError.code === "42501") {
                    // Insufficient privilege
                    errorMessage = "Permission denied. Please ensure you are properly signed in and try again.";
                } else if (orgError.code === "23505") {
                    // Unique constraint violation
                    errorMessage = "An organization with this name or slug already exists. Please choose a different name.";
                } else if (orgError.code === "23502") {
                    // Not null violation
                    errorMessage = "Required fields are missing. Please fill in all required fields.";
                } else if (orgError.message) {
                    errorMessage = orgError.message;
                } else if (orgError.details) {
                    errorMessage = orgError.details;
                } else if (orgError.hint) {
                    errorMessage = orgError.hint;
                }

                throw new Error(errorMessage);
            }

            // The RPC function returns an array (RETURNS TABLE), get the first result
            const org = Array.isArray(orgData) && orgData.length > 0 ? orgData[0] : orgData;

            if (!org) {
                throw new Error("Organization was not created. Please try again.");
            }

            const orgId = (org as Record<string, unknown>).id as string;

            if (!orgId) {
                throw new Error("Failed to get organization ID. Please try again.");
            }

            // Set as active organization
            // Use upsert with user_id as conflict target (user_id is unique)
            const { error: sessionError } = await supabase
                .from("user_sessions")
                .upsert({
                    user_id: user.id,
                    organization_id: orgId,
                } as never, {
                    onConflict: "user_id",
                });

            if (sessionError) {
                if (process.env.NODE_ENV === "development") {
                    console.error("Session creation error:", sessionError);
                }
                throw new Error(
                    sessionError.message || "Failed to create user session. Please try signing in again."
                );
            }

            toast.success("Organization created successfully!");

            // Invalidate organization query to ensure dashboard fetches the new data
            await queryClient.invalidateQueries({ queryKey: ["organization", "current"] });

            router.push("/dashboard");
            router.refresh();
        } catch (error) {
            if (process.env.NODE_ENV === "development") {
                console.error("Organization creation failed:", error);
            }

            const message = error instanceof Error
                ? error.message
                : typeof error === 'object' && error !== null && 'message' in error
                    ? String(error.message)
                    : "Failed to create organization. Please check all fields and try again.";

            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    const nextStep = async () => {
        const fields = step === 1 ? (["name", "type", "size"] as const) : [];
        const isValid = await form.trigger(fields.length > 0 ? fields : undefined);
        if (isValid) {
            setStep(step + 1);
        }
    };

    const prevStep = () => {
        setStep(step - 1);
    };

    if (isChecking) {
        return <AuthFormSkeletonOnboarding />;
    }

    return (
        <PageTransition>
            <div className="flex flex-col flex-1 w-full overflow-y-auto no-scrollbar">
                <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto sm:pt-10 px-4 sm:px-0">
                    <div>
                        {/* Progress Section at Top */}
                        <div className="mb-8">
                            <div className="mb-4">
                                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                                    Create Your Organization
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Step {step} of 2 — {step === 1 ? "Basic Information" : "Additional Details"}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative mb-2">
                                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${step * 50}%` }}
                                    />
                                </div>

                                {/* Step Indicators */}
                                <div className="flex justify-between absolute -top-1 left-0 right-0">
                                    {[1, 2].map((stepNum) => (
                                        <div
                                            key={stepNum}
                                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${stepNum <= step
                                                ? "bg-brand-500 border-brand-500"
                                                : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                                                }`}
                                        >
                                            {stepNum < step ? (
                                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : stepNum === step ? (
                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Step Labels */}
                            <div className="flex justify-between pt-2">
                                <span className={`text-xs font-medium ${step >= 1 ? "text-brand-500 dark:text-brand-400" : "text-gray-400 dark:text-gray-600"}`}>
                                    Basic Info
                                </span>
                                <span className={`text-xs font-medium ${step >= 2 ? "text-brand-500 dark:text-brand-400" : "text-gray-400 dark:text-gray-600"}`}>
                                    Details
                                </span>
                            </div>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {step === 1 && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Organization Name *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter organization name"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        This will be the name of your organization in the system
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Organization Type *</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select organization type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {ORGANIZATION_TYPES.map((type) => (
                                                                <SelectItem key={type.value} value={type.value}>
                                                                    {type.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Select the type that best describes your organization
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="size"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Organization Size *</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select organization size" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {ORGANIZATION_SIZES.map((size) => (
                                                                <SelectItem key={size.value} value={size.value}>
                                                                    {size.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Approximate number of members
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="currency"
                                            render={({ field }) => {
                                                const selectedCurrency = CURRENCIES.find((c) => c.value === field.value);
                                                const filteredCurrencies = CURRENCIES.filter((currency) =>
                                                    currency.label.toLowerCase().includes(currencySearchQuery.toLowerCase()) ||
                                                    currency.value.toLowerCase().includes(currencySearchQuery.toLowerCase())
                                                );

                                                return (
                                                    <FormItem>
                                                        <FormLabel>Default Currency *</FormLabel>
                                                        <Popover open={currencyPopoverOpen} onOpenChange={setCurrencyPopoverOpen}>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button
                                                                        variant="outline"
                                                                        role="combobox"
                                                                        aria-expanded={currencyPopoverOpen}
                                                                        className="w-full justify-between"
                                                                    >
                                                                        {selectedCurrency ? selectedCurrency.label : "Select currency..."}
                                                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-full p-0" align="start">
                                                                <div className="p-2 border-b">
                                                                    <Input
                                                                        placeholder="Search currencies..."
                                                                        value={currencySearchQuery}
                                                                        onChange={(e) => setCurrencySearchQuery(e.target.value)}
                                                                        className="h-9"
                                                                    />
                                                                </div>
                                                                <ScrollArea className="h-[200px]">
                                                                    <div className="p-1">
                                                                        {filteredCurrencies.length === 0 ? (
                                                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                                                No currencies found.
                                                                            </div>
                                                                        ) : (
                                                                            filteredCurrencies.map((currency) => (
                                                                                <div
                                                                                    key={currency.value}
                                                                                    className={cn(
                                                                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                                                        field.value === currency.value && "bg-accent"
                                                                                    )}
                                                                                    onClick={() => {
                                                                                        field.onChange(currency.value);
                                                                                        setCurrencyPopoverOpen(false);
                                                                                        setCurrencySearchQuery("");
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={cn(
                                                                                            "mr-2 h-4 w-4",
                                                                                            field.value === currency.value ? "opacity-100" : "opacity-0"
                                                                                        )}
                                                                                    />
                                                                                    <span>{currency.label}</span>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </ScrollArea>
                                                            </PopoverContent>
                                                        </Popover>
                                                        <FormDescription>
                                                            This will be used for all financial transactions
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                );
                                            }}
                                        />

                                        <AuthPrimaryButton type="button" onClick={nextStep} className="w-full">
                                            Next Step
                                        </AuthPrimaryButton>
                                    </>
                                )}

                                {step === 2 && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Description</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Tell us about your organization..."
                                                            className="resize-none"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="location"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Location</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="City, State"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="country"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Country</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="United States"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone Number</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="+1 (555) 123-4567"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Organization Email</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="email"
                                                            placeholder="info@organization.com"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="website"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Website</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="url"
                                                            placeholder="https://www.organization.com"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex gap-3 justify-between items-center">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={prevStep}
                                                disabled={isLoading}
                                                size="sm"
                                                className="flex-1"
                                            >
                                                Previous
                                            </Button>
                                            <AuthPrimaryButton type="submit" isLoading={isLoading} className="flex-1">
                                                Create
                                            </AuthPrimaryButton>
                                        </div>
                                    </>
                                )}
                            </form>
                        </Form>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
