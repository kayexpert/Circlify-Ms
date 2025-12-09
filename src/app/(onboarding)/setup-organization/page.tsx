"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ORGANIZATION_TYPES, ORGANIZATION_SIZES, CURRENCIES } from "@/lib/constants";

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  type: z.string().min(1, "Please select an organization type"),
  size: z.string().min(1, "Please select organization size"),
  description: z.string().optional(),
  currency: z.string().min(1, "Please select a currency"),
  location: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export default function SetupOrganizationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Check if user already has an organization on mount
  useEffect(() => {
    async function checkExistingOrg() {
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
      currency: "USD",
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
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      const slug = generateSlug(data.name);

      // Check if slug already exists (will be empty due to RLS, which is fine)
      const { data: existingOrg, error: slugCheckError } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (slugCheckError) {
        console.error("Slug check error:", slugCheckError);
        throw new Error(`Database error: ${slugCheckError.message}`);
      }

      if (existingOrg) {
        throw new Error("An organization with this name already exists");
      }

      // Create organization - bypass type checking for Supabase insert
      const orgInsert = {
        name: data.name,
        slug: slug,
        type: data.type,
        size: data.size,
        description: data.description || null,
        currency: data.currency,
        location: data.location || null,
        country: data.country || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        settings: {},
      };

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert(orgInsert as never)
        .select()
        .single();

      if (orgError) throw orgError;
      if (!org) throw new Error("Failed to create organization");

      const orgId = (org as Record<string, unknown>).id as string;

      // Link user as super_admin (organization creator)
      const { error: linkError } = await supabase
        .from("organization_users")
        .insert({
          organization_id: orgId,
          user_id: user.id,
          role: "super_admin" as const,
        } as never);

      if (linkError) throw linkError;

      // Update organization to set created_by
      await supabase
        .from("organizations")
        .update({ created_by: user.id } as never)
        .eq("id", orgId);

      // Set as active organization
      const { error: sessionError } = await supabase
        .from("user_sessions")
        .upsert({
          user_id: user.id,
          organization_id: orgId,
        } as never);

      if (sessionError) throw sessionError;

      toast.success("Organization created successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create organization";
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

  // Show loading while checking
  if (isChecking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side - Progress and Details */}
        <div className="lg:w-1/3 w-full">
          <Card className="sticky top-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark shadow-theme-md">
            <CardHeader className="pb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-2">
                Create Your Organization
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Step {step} of 2 — {step === 1 ? "Basic Information" : "Additional Details"}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Percentage */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Progress</span>
                <span className="text-sm font-semibold text-brand-500 dark:text-brand-400">{step * 50}%</span>
              </div>

              {/* Progress Bar */}
              <div className="relative">
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
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        stepNum <= step
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

              {/* Step Details */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">
                  What you&apos;ll need:
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {step === 1 ? (
                    <>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Organization name</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Organization type</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Organization size</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 text-gray-300 dark:text-gray-700 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-400 dark:text-gray-600">Additional details (optional)</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Organization description</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Contact information</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 text-gray-300 dark:text-gray-700 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-400 dark:text-gray-600">Website (optional)</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Form */}
        <div className="lg:w-2/3 w-full">
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark shadow-theme-md">
            <CardContent className="p-6">
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
                          placeholder="Grace Community Church"
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Currency *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This will be used for all financial transactions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="button" onClick={nextStep} className="w-full">
                  Next Step
                </Button>
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
                      <FormDescription>
                        Brief description of your organization (optional)
                      </FormDescription>
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

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="w-full"
                    disabled={isLoading}
                  >
                    Previous
                  </Button>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Organization
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
