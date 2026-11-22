export type ApiUrlOptions = {
  configuredUrl?: string;
  hostUri?: string | null;
  platform: string;
  physicalDevice: boolean;
  development: boolean;
  webHostname?: string;
  apiPort?: number | string;
};
export function isDeviceLocalHost(host: string): boolean;
export function isPrivateHost(host: string): boolean;
export function hostFromManifest(hostUri?: string): string | null;
export function validateApiUrl(url: string, options?: { development?: boolean; physicalDevice?: boolean; publicOnly?: boolean }): string;
export function resolveApiUrl(options: ApiUrlOptions): string;
