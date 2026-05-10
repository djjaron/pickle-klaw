declare global {
  // Neon exposes this in some runtimes. Keeping it optional avoids env-specific type failures.
  var neonConfig: Record<string, unknown> | undefined;
}

if (typeof globalThis.neonConfig === 'undefined') {
  (globalThis as any).neonConfig = {};
}

export {};
