import { useEffect, useState, useMemo } from 'react'
import type { Chart } from '@/types/chart'
import { cn } from '@/lib/utils'
import { useAnimationManager } from '@/components/animation-provider'

const colorMap: Record<string, Record<'active' | 'inactive', string>> = {
  blue: {
    active: 'bg-blue-500',
    inactive: 'bg-blue-900'
  },
  red: {
    active: 'bg-red-500',
    inactive: 'bg-red-900'
  },
  yellow: {
    active: 'bg-yellow-500',
    inactive: 'bg-yellow-900'
  }
}

const padColorMap: string[] = ['blue', 'red', 'yellow', 'red', 'blue']

const padClassGenerator = (padIndex: number, activePads?: number[]) => {
  const padIndexMod = padIndex % 5
  const color = padColorMap[padIndexMod]
  const isActive = activePads?.includes(padIndex)
  const rowStart = padIndexMod !== 2 ? padIndexMod % 2 !== 0 ? 'row-start-1' : 'row-start-8' : 'row-start-2'
  const rowSpan = padIndexMod !== 2 ? 'row-span-5' : 'row-span-1'
  return cn('rounded-xl', colorMap[color][isActive ? 'active' : 'inactive'], rowStart, rowSpan)
}

export interface PadProps {
  activePads?: number[]
  type: Chart['type']
}

export function Pad ({ activePads, type }: PadProps) {
  if (!type) {
    return null
  }

  return (
    <div className={cn('grid bg-slate-400 p-4 rounded-2xl', type === 'single' ? 'grid-cols-3 w-43 h-43' : type === 'double' ? 'grid-cols-[1fr_1fr_1fr_1rem_1fr_1fr_1fr] w-86 h-43' : 'grid-cols-[1fr_1fr_1rem_1fr_1fr] w-60 h-43')}>
      {(type === 'single' || type === 'double') && (
        <div className='grid grid-rows-12'>
          <div className={padClassGenerator(1, activePads)} />
          <div className={padClassGenerator(0, activePads)} />
        </div>
      )}
      <div className='grid grid-rows-3'>
        <div className={padClassGenerator(2, activePads)} />
      </div>
      <div className='grid grid-rows-12'>
        <div className={padClassGenerator(3, activePads)} />
        <div className={padClassGenerator(4, activePads)} />
      </div>
      {(type === 'half-double' || type === 'double') && (
        <>
          <div />
          <div className='grid grid-rows-12'>
            <div className={padClassGenerator(6, activePads)} />
            <div className={padClassGenerator(5, activePads)} />
          </div>
          <div className='grid grid-rows-3'>
            <div className={padClassGenerator(7, activePads)} />
          </div>
          {type === 'double' && (
            <div className='grid grid-rows-12'>
              <div className={padClassGenerator(8, activePads)} />
              <div className={padClassGenerator(9, activePads)} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export interface PadPlayerProps {
  chart: Chart
  audioRef: React.RefObject<HTMLAudioElement | null>
}

export function PadPlayer ({ chart, audioRef }: PadPlayerProps) {
  const [activePads, setActivePads] = useState<number[]>([])
  const { addCallback, removeCallback } = useAnimationManager()
  const { processedNotes } = useMemo(() => {
    const longNotesMap: Record<number, number> = {}
    const processedNotes: { startTime: number, endTime: number, padIndex: number }[] = []

    chart.blocks.forEach(block => {
      block.notes.forEach(note => {
        if (note.type === 1) { // LongStart
          longNotesMap[note.padIndex] = note.time
        } else if (note.type === 3) { // LongEnd
          const startTime = longNotesMap[note.padIndex]
          if (startTime !== undefined) {
            processedNotes.push({ startTime: startTime - 20, endTime: note.time + 20, padIndex: note.padIndex })
            delete longNotesMap[note.padIndex]
          }
        } else if (note.type === 0) {
          processedNotes.push({ startTime: note.time - 20, endTime: note.time + 20, padIndex: note.padIndex })
        }
      })
    })
    return { processedNotes }
  }, [chart])

  useEffect(() => {
    const handleTimeUpdate = () => {
      const currentTime = (audioRef.current?.currentTime ?? 0) * 1000
      const activePadIndices = processedNotes.filter(note => currentTime >= note.startTime && currentTime <= note.endTime).map(note => note.padIndex)
      setActivePads(activePadIndices)
    }

    addCallback(handleTimeUpdate)

    return () => {
      removeCallback(handleTimeUpdate)
    }
  }, [chart, audioRef, addCallback, removeCallback, processedNotes])

  return (
    <Pad type={chart.type} activePads={activePads} />
  )
}
