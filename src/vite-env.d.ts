/// <reference types="vite/client" />

import type { BuildInfo } from './types';

declare global {
  const __BUILD_INFO__: BuildInfo;
}

export {};
