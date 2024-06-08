interface IPageCache {
  /**
   * string: `[method].[status].[name]`
   * eg: `get.200._` (default name is '_')
   */
  path?: string;
}

interface IRequest extends IPageCache {
  i: number;
  url: string;
  page: string;
  //...IPageCache
  name: string;
  method: string;
  status: number;
  response: string;
  header?: Record<string, string>;
}

interface IRequestCache {
  pages: (IPageCache & { k: number })[];
  method: {
    [method: string]: {
      [status: number]: {
        [name: string]: {
          response: string;
          header: Record<string, string>;
        };
      };
    };
  };
}
