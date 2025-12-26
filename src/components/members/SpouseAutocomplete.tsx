"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMembers } from "@/hooks/members/useMembers"

interface SpouseAutocompleteProps {
    value: string
    onChange: (value: string) => void
    currentMemberId?: string | null // Exclude this member from suggestions
    placeholder?: string
}

export function SpouseAutocomplete({
    value,
    onChange,
    currentMemberId,
    placeholder = "Type or select spouse name"
}: SpouseAutocompleteProps) {
    const [open, setOpen] = useState(false)
    const [searchInput, setSearchInput] = useState("")

    // Fetch all members for autocomplete
    const { data: allMembers = [] } = useMembers()

    // Filter members for suggestions (exclude current member)
    const memberOptions = useMemo(() => {
        return allMembers
            .filter((m: any) => currentMemberId ? m.uuid !== currentMemberId : true)
            .map((m: any) => ({
                value: `${m.first_name} ${m.last_name}`,
                label: `${m.first_name} ${m.last_name}`,
                id: m.uuid,
            }))
    }, [allMembers, currentMemberId])

    // Filter suggestions based on search input
    const filteredOptions = useMemo(() => {
        if (!searchInput) return memberOptions.slice(0, 10) // Show first 10 by default
        const query = searchInput.toLowerCase()
        return memberOptions.filter((opt: any) =>
            opt.label.toLowerCase().includes(query)
        ).slice(0, 10)
    }, [memberOptions, searchInput])

    const handleSelect = useCallback((selectedValue: string) => {
        onChange(selectedValue)
        setOpen(false)
    }, [onChange])

    const handleInputChange = useCallback((inputValue: string) => {
        setSearchInput(inputValue)
        // Also update the actual value so user can type freely
        onChange(inputValue)
    }, [onChange])

    return (
        <div className="space-y-2">
            <Label>Spouse Name (Optional)</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between font-normal"
                        type="button"
                    >
                        <span className={cn(!value && "text-muted-foreground")}>
                            {value || placeholder}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search members or type name..."
                            value={searchInput}
                            onValueChange={handleInputChange}
                        />
                        <CommandList>
                            <ScrollArea className="h-[200px]">
                                {/* Show typed value as option if it's not empty and doesn't match any suggestion */}
                                {searchInput && !memberOptions.some((opt: any) => opt.label.toLowerCase() === searchInput.toLowerCase()) && (
                                    <CommandItem
                                        onSelect={() => handleSelect(searchInput)}
                                        className="flex items-center gap-2"
                                    >
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span>Use "{searchInput}"</span>
                                    </CommandItem>
                                )}

                                {filteredOptions.length === 0 && !searchInput && (
                                    <CommandEmpty>No members found. Type a name to add manually.</CommandEmpty>
                                )}

                                <CommandGroup heading={searchInput ? "Suggestions" : "Members"}>
                                    {filteredOptions.map((option: any) => (
                                        <CommandItem
                                            key={option.id}
                                            value={option.value}
                                            onSelect={() => handleSelect(option.value)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === option.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {option.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </Command>

                    {/* Clear button */}
                    {value && (
                        <div className="border-t p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                type="button"
                                onClick={() => {
                                    onChange("")
                                    setSearchInput("")
                                    setOpen(false)
                                }}
                            >
                                Clear
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    )
}
