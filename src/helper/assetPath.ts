const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const getAssetPath = (src: string | undefined) => {
  if (!src) return "";
  // Base64 data URIs (e.g. mobile-uploaded avatars) and absolute URLs must never
  // be rewritten — prepending BASE_PATH onto them produces a broken src string.
  if (src.startsWith("data:") || src.startsWith("http://") || src.startsWith("https://") || src.startsWith("blob:")) {
    return src;
  }
  if (src.startsWith(BASE_PATH)) return src;
  return `${BASE_PATH}${src}`;
};
