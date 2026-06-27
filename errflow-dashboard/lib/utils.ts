import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: Date | string | number): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (isNaN(diffInSeconds)) return 'N/A';
    if (diffInSeconds < 0) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return d.toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
}


export function formatDateTime(date: Date | string | number): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString();
  } catch {
    return 'Invalid Date';
  }
}


export function truncate(str: string | null | undefined, length: number): string {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + "..." : str;
}


export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}