import { useState } from 'react'
import { dayKey } from '../game/streak'

/** Today's local day key, fixed at mount so renders stay pure. A tab left open across midnight catches up on reload. */
export const useToday = (): string => useState(() => dayKey(new Date()))[0]
