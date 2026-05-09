import type { neonConfig } from '@neondatabase/serverless';
if (typeof globalThis.neonConfig === 'undefined') {
  (globalThis as any).neonConfig = {};
}
