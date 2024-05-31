let timeout: ReturnType<typeof setTimeout> | null;
export function debounce<T extends (...args: any[]) => void>(func: T, wait = 100): (...args: Parameters<T>) => void {
  return function (...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function parseURL(pageUrl: string, origin = 'empty://empty.com') {
  const isFullUrl = /^https?:\/\//.test(pageUrl);
  let url = new URL(isFullUrl ? pageUrl : `${origin}${pageUrl}`);
  const queryParams = Object.fromEntries(new URLSearchParams(url.search).entries());

  return {
    href: url.href,
    noSearch: `${url.origin}${url.pathname}`,
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    origin: url.origin,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    queryParams: queryParams
  };
}
