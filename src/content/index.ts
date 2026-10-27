import type { Region } from './schema'
import byteCaverns from './byte-caverns'
import classCastle from './class-castle'
import exceptionArena from './exception-arena'
import functionForge from './function-forge'
import generatorGrotto from './generator-grotto'
import hashHarbor from './hash-harbor'
import loopCanyon from './loop-canyon'
import packagePort from './package-port'
import regexJungle from './regex-jungle'
import slicePeaks from './slice-peaks'
import snakeNest from './snake-nest'
import stringBazaar from './string-bazaar'
import variableValley from './variable-valley'

export { regionMetas } from './regionsMeta'

/** Fully authored regions. Each region file is added here as it is written. */
export const regions: Region[] = [snakeNest, variableValley, loopCanyon, functionForge, slicePeaks, hashHarbor, generatorGrotto, stringBazaar, regexJungle, byteCaverns, packagePort, classCastle, exceptionArena].sort((a, b) => a.order - b.order)

export const getRegion = (id: string): Region | undefined => regions.find((r) => r.id === id)

import { regionMetas as metas } from './regionsMeta'

/** Map metadata tagged with whether each region has been authored yet. Used for unlock rules. */
export const playableMetas = metas.map((m) => ({ id: m.id, authored: regions.some((r) => r.id === m.id) }))
