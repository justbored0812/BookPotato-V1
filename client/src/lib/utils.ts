import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${num.toFixed(2)}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 0) {
    return `${Math.abs(diffInDays)} days overdue`;
  } else if (diffInDays === 0) {
    return 'Due today';
  } else if (diffInDays === 1) {
    return 'Due tomorrow';
  } else {
    return `Due in ${diffInDays} days`;
  }
}

export function getBookStatusColor(isAvailable: boolean, dueDate?: Date | string): string {
  if (!isAvailable) {
    if (dueDate) {
      const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
      const now = new Date();
      const diffInDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays < 0) {
        return 'status-overdue';
      } else if (diffInDays <= 1) {
        return 'status-due-soon';
      } else {
        return 'status-borrowed';
      }
    }
    return 'status-borrowed';
  }
  return 'status-available';
}

export function getBookStatusText(isAvailable: boolean, dueDate?: Date | string): string {
  if (!isAvailable) {
    if (dueDate) {
      return formatDateRelative(dueDate);
    }
    return 'Borrowed';
  }
  return 'Available';
}

export function calculateRentalCost(
  dailyFee: number | string, 
  duration: number, 
  platformSettings?: { commissionRate: number; securityDeposit: number }
) {
  const fee = typeof dailyFee === 'string' ? parseFloat(dailyFee) : dailyFee;
  const rentalFee = fee * duration; // Amount lender should receive
  
  // Use dynamic settings or fallback to defaults
  const platformFeeRate = platformSettings ? (platformSettings.commissionRate / 100) : 0.05;
  const securityDeposit = platformSettings ? platformSettings.securityDeposit : 100;
  
  const platformFee = rentalFee * platformFeeRate; // Platform commission on top
  const lenderAmount = rentalFee; // Lender gets full rental amount
  const totalAmount = rentalFee + platformFee + securityDeposit; // Borrower pays rental + commission + deposit

  return {
    rentalFee,
    platformFee,
    lenderAmount,
    securityDeposit,
    totalAmount,
  };
}

export function generateSocietyCode(name: string): string {
  const prefix = name.substring(0, 3).toUpperCase();
  const suffix = Date.now().toString().slice(-4);
  return `${prefix}${suffix}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}
