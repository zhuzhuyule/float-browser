let timeout: ReturnType<typeof setTimeout> | null;
export function debounce<T extends (...args: any[]) => void>(func: T, wait = 100): (...args: Parameters<T>) => void {
  return function (...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}
