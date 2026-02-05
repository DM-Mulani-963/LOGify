/// <reference types="vite/client" />

import { createClient } from '@insforge/sdk';

// InsForge client configuration
export const insforgeClient = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL || 'https://rvvr4t3d.ap-southeast.insforge.app',
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY || 'placeholder-key'
});

export default insforgeClient;
