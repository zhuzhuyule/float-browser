let timeout: ReturnType<typeof setTimeout> | null;
export function debounce<T extends (...args: any[]) => void>(func: T, wait = 100): (...args: Parameters<T>) => void {
  return function (...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function parseURL(pageUrl: string) {
  const url = new URL(pageUrl);
  const queryParams = Object.fromEntries(new URLSearchParams(url.search).entries());

  return {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    queryParams: queryParams
  };
}
