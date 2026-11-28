import type { Register } from 'claude-code'

import { registerCore } from './core'

// Jarvis: one pack of eleven mods. core.tsx hooks each event once and hands it
// to every mod in turn; each mod lives in its own file under mods/.
export const register: Register = on => {
  registerCore(on)
}
