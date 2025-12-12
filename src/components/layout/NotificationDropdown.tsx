"use client";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUpcomingEvents } from "@/hooks/events";
import { useUpcomingBirthdays } from "@/hooks/members/useMemberStatistics";
import { Calendar, Gift } from "lucide-react";

interface Notification {
  id: string;
  type: "event" | "birthday";
  title: string;
  description: string;
  time: string;
  relativeTime: string;
  avatar?: string | null;
  link: string;
  icon: "event" | "birthday";
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenNotifications, setHasSeenNotifications] = useState(false);

  // Fetch upcoming events (next 7 days)
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useUpcomingEvents(7);
  
  // Fetch upcoming birthdays (next 7 days)
  const { data: upcomingBirthdays = [], isLoading: birthdaysLoading } = useUpcomingBirthdays(7);

  const isLoading = eventsLoading || birthdaysLoading;

  // Format time relative to now
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays === 0) {
      if (diffHours === 0) {
        if (diffMinutes <= 0) return "now";
        return `in ${diffMinutes} min${diffMinutes > 1 ? "s" : ""}`;
      }
      return `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
    } else if (diffDays === 1) {
      return "tomorrow";
    } else if (diffDays < 7) {
      return `in ${diffDays} days`;
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
    });
  };

  // Combine and format notifications
  const notifications: Notification[] = useMemo(() => {
    const combined: Array<Notification & { date: Date }> = [];

    // Add event notifications
    upcomingEvents.forEach((event) => {
      const eventDate = new Date(event.event_date);
      eventDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Only show events from today onwards
      if (eventDate >= today) {
        combined.push({
          id: `event-${event.id}`,
          type: "event",
          title: event.name,
          description: event.location || event.event_types?.name || "Event",
          time: formatDate(eventDate),
          relativeTime: formatRelativeTime(eventDate),
          avatar: null,
          link: `/dashboard/events`,
          icon: "event",
          date: eventDate,
        });
      }
    });

    // Add birthday notifications
    upcomingBirthdays.forEach((birthday) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const birthDate = new Date(birthday.date_of_birth);
      const thisYear = today.getFullYear();
      const nextBirthday = new Date(thisYear, birthDate.getMonth(), birthDate.getDate());
      nextBirthday.setHours(0, 0, 0, 0);
      
      // If birthday already passed this year, use next year
      if (nextBirthday < today) {
        nextBirthday.setFullYear(thisYear + 1);
      }

      combined.push({
        id: `birthday-${birthday.id}`,
        type: "birthday",
        title: `${birthday.first_name} ${birthday.last_name}`,
        description: `Turning ${birthday.age + (nextBirthday.getFullYear() - thisYear)} years old`,
        time: formatDate(nextBirthday),
        relativeTime: formatRelativeTime(nextBirthday),
        avatar: birthday.photo,
        link: `/dashboard/members?tab=birthdays`,
        icon: "birthday",
        date: nextBirthday,
      });
    });

    // Sort by date (soonest first) and remove the date property
    return combined
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10) // Limit to 10 most recent
      .map(({ date, ...notification }) => notification);
  }, [upcomingEvents, upcomingBirthdays]);

  const hasNotifications = notifications.length > 0;
  const showNotificationBadge = hasNotifications && !hasSeenNotifications;

  function toggleDropdown() {
    setIsOpen(!isOpen);
    if (!isOpen && hasNotifications) {
      setHasSeenNotifications(true);
    }
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
  };

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
        onClick={handleClick}
      >
        {showNotificationBadge && (
          <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 flex">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex max-h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notification
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col max-h-[380px] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <li className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading notifications...
            </li>
          ) : notifications.length === 0 ? (
            <li className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No upcoming events or birthdays
            </li>
          ) : (
            notifications.map((notification) => (
              <li key={notification.id}>
                <Link href={notification.link}>
                  <DropdownItem
                    onItemClick={closeDropdown}
                    className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <span className="relative block w-10 h-10 rounded-full z-1 flex-shrink-0">
                      {notification.icon === "birthday" && notification.avatar ? (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={notification.avatar} alt={notification.title} />
                          <AvatarFallback className="text-xs bg-purple-100 dark:bg-purple-900">
                            {notification.title.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          notification.icon === "event" 
                            ? "bg-blue-100 dark:bg-blue-900" 
                            : "bg-purple-100 dark:bg-purple-900"
                        }`}>
                          {notification.icon === "event" ? (
                            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 z-10 h-2.5 w-2.5 rounded-full border-[1.5px] border-white dark:border-gray-900 ${
                          notification.icon === "event"
                            ? "bg-blue-500"
                            : "bg-purple-500"
                        }`}
                      ></span>
                    </span>

                    <span className="block flex-1 min-w-0">
                      <span className="mb-1.5 block text-theme-sm">
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {notification.title}
                        </span>
                        {notification.description && (
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            {notification.description}
                          </span>
                        )}
                      </span>

                      <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
                        <span className="capitalize">{notification.type}</span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span>{notification.relativeTime}</span>
                        {notification.time !== notification.relativeTime && (
                          <>
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                            <span>{notification.time}</span>
                          </>
                        )}
                      </span>
                    </span>
                  </DropdownItem>
                </Link>
              </li>
            ))
          )}
        </ul>
        {!isLoading && notifications.length > 0 && (
          <Link
            href="/dashboard/events"
            className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            View All Events & Birthdays
          </Link>
        )}
      </Dropdown>
    </div>
  );
}
