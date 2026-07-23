import { z } from 'zod';

// Production CSP forbids eval — zod must precompile without JIT.
z.config({ jitless: true });
