/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react'
import { AnimationManager } from '@/utils/animation-manager'

interface AnimationProviderProps {
  children: React.ReactNode
}

interface AnimationManagerContext {
  addCallback: (callback: (time?: number) => void) => void
  removeCallback: (callback: (time?: number) => void) => void
}

const AnimationProviderContext = createContext<AnimationManagerContext | null>(null)

export function AnimationProvider ({ children }: AnimationProviderProps) {
  const [animationManager] = useState<AnimationManager>(() => new AnimationManager())

  const addCallback = useCallback((callback: (time?: number) => void) => {
    animationManager.addCallback(callback)
  }, [animationManager])

  const removeCallback = useCallback((callback: (time?: number) => void) => {
    animationManager.removeCallback(callback)
  }, [animationManager])

  useEffect(() => {
    return () => {
      animationManager.clearCallbacks()
    }
  }, [animationManager])

  const value = useMemo(() => ({
    addCallback,
    removeCallback
  }), [addCallback, removeCallback])

  return (
    <AnimationProviderContext.Provider value={value}>
      {children}
    </AnimationProviderContext.Provider>
  )
}

export const useAnimationManager = () => {
  const context = useContext(AnimationProviderContext)
  if (!context) {
    throw new Error('useAnimationManager must be used within an AnimationProvider')
  }
  return context
}
