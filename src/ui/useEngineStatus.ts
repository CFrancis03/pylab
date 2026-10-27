import { useSyncExternalStore } from 'react'
import { getEngineStatus, subscribeEngineStatus, type EngineStatus } from '../engine/runner'

export const useEngineStatus = (): EngineStatus => useSyncExternalStore(subscribeEngineStatus, getEngineStatus)
