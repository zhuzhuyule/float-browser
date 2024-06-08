let keys: Record<string, ReturnType<typeof setTimeout>> = {
  default: 0
};
export function debounce<T extends (...args: any[]) => void>(func: T, wait = 100, key = 'default'): (...args: Parameters<T>) => void {
  return function (...args: Parameters<T>): void {
    if (keys[key]) {
      clearTimeout(keys[key]);
    }
    keys[key] = setTimeout(() => {
      keys[key] = 0;
      func(...args);
    }, wait);
  };
}

export function parseURL(pageUrl: string, origin = 'empty://empty.com') {
  const isFullUrl = /^https?:\/\//.test(pageUrl);
  let url = new URL(isFullUrl ? pageUrl : `${origin}${pageUrl}`);
  const queryParams = Object.fromEntries(new URLSearchParams(url.search).entries());

  return {
    href: url.href,
    noSearch: `${url.host}${url.pathname}`,
    protocol: url.protocol,
    host: url.host,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    queryParams: queryParams
  };
}
