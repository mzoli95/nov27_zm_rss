const bbcWidths: readonly number[] = [320, 480, 640, 976];

export interface ArticleImage {
  src: string;
  srcset: string | null;
}

export function articleImage(value: string): ArticleImage {
  const fallback: ArticleImage = { src: value, srcset: null };
  if (!value.startsWith('https://ichef.bbci.co.uk/ace/standard/')) return fallback;

  const url: URL = new URL(value);
  const pattern: RegExp = /^\/ace\/standard\/\d+\//;
  if (!pattern.test(url.pathname)) return fallback;

  const imageAt = (width: number): string => {
    url.pathname = url.pathname.replace(pattern, '/ace/standard/' + width + '/');
    return url.href;
  };
  return {
    src: imageAt(640),
    srcset: bbcWidths.map((width) => imageAt(width) + ' ' + width + 'w').join(', '),
  };
}
