import ImageKit from 'imagekit';

const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || '';
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || '';
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT || '';

export const imagekit = new ImageKit({
  publicKey: IMAGEKIT_PUBLIC_KEY,
  privateKey: IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: IMAGEKIT_URL_ENDPOINT,
});

export function getImageKitAuth() {
  return imagekit.getAuthenticationParameters();
}

export function getImageUrl(path: string, options?: { width?: number; height?: number; quality?: number }): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = IMAGEKIT_URL_ENDPOINT;
  let url = `${base}/${path}`;
  const transforms: string[] = [];
  if (options?.width) transforms.push(`w-${options.width}`);
  if (options?.height) transforms.push(`h-${options.height}`);
  if (options?.quality) transforms.push(`q-${options.quality}`);
  if (transforms.length) url = `${base}/tr:${transforms.join(',')}/${path}`;
  return url;
}

export const IK_PUBLIC_KEY = IMAGEKIT_PUBLIC_KEY;
export const IK_URL_ENDPOINT = IMAGEKIT_URL_ENDPOINT;
