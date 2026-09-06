import { useEffect, useState, useMemo } from 'react'
import type { Chart } from '@/types/chart'
import { cn } from '@/lib/utils'
import { useAnimationManager } from '@/components/animation-provider'
import { predictFeet } from '@/utils/feet-prediction'

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

const singlePadPositions = [
  { x: 0 + 0.45, y: 2 - 0.5 },
  { x: 0 + 0.45, y: 0 + 0.5 },
  { x: 1, y: 1 },
  { x: 2 - 0.45, y: 0 + 0.5 },
  { x: 2 - 0.45, y: 2 - 0.5 }
]

export interface PadProps {
  activePads?: number[]
  type: Chart['type']
}

function Pad ({ activePads, type }: PadProps) {
  if (!type) {
    return null
  }

  return (
    <>
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
    </>
  )
}

export interface PadPlayerProps {
  chart: Chart
  audioRef: React.RefObject<HTMLAudioElement | null>
}

export function PadPlayer ({ chart, audioRef }: PadPlayerProps) {
  const [activePads, setActivePads] = useState<number[]>([])
  const [lPos, setLPos] = useState<{ x: number, y: number }>(singlePadPositions[0])
  const [rPos, setRPos] = useState<{ x: number, y: number }>(singlePadPositions[4])
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
            processedNotes.push({ startTime: startTime - 20, endTime: note.time + 40, padIndex: note.padIndex })
            delete longNotesMap[note.padIndex]
          }
        } else if (note.type === 0) {
          processedNotes.push({ startTime: note.time - 20, endTime: note.time + 40, padIndex: note.padIndex })
        }
      })
    })
    return { processedNotes }
  }, [chart])
  const predictedFeet = useMemo(() => predictFeet(chart), [chart])

  useEffect(() => {
    const handleTimeUpdate = () => {
      const currentTime = (audioRef.current?.currentTime ?? 0) * 1000
      const activePadIndices = processedNotes.filter(note => currentTime >= note.startTime && currentTime <= note.endTime).map(note => note.padIndex)
      setActivePads(activePadIndices)

      const currentRow = predictedFeet.findLast(row => row.time - 20 <= currentTime)
      if (currentRow) {
        const lPos = (currentRow.L !== null && currentRow.L.length > 0)
          ? currentRow.L.reduce((prev, curr) => {
            const pos = singlePadPositions[curr]
            return { x: prev.x + pos.x / currentRow.L.length, y: prev.y + pos.y / currentRow.L.length }
          }, { x: 0, y: 0 })
          : null
        const rPos = (currentRow.R !== null && currentRow.R.length > 0)
          ? currentRow.R.reduce((prev, curr) => {
            const pos = singlePadPositions[curr]
            return { x: prev.x + pos.x / currentRow.R.length, y: prev.y + pos.y / currentRow.R.length }
          }, { x: 0, y: 0 })
          : null
        if (lPos) { setLPos(lPos) }
        if (rPos) { setRPos(rPos) }
      }
    }

    addCallback(handleTimeUpdate)

    return () => {
      removeCallback(handleTimeUpdate)
    }
  }, [chart, audioRef, addCallback, removeCallback, processedNotes, predictedFeet])

  return (
    <div className={cn('relative grid bg-slate-400 p-4 rounded-2xl', chart.type === 'single' ? 'grid-cols-3 w-43 h-43' : chart.type === 'double' ? 'grid-cols-[1fr_1fr_1fr_1rem_1fr_1fr_1fr] w-86 h-43' : 'grid-cols-[1fr_1fr_1rem_1fr_1fr] w-60 h-43')}>
      <Pad type={chart.type} activePads={activePads} />
      <div className='absolute top-0 left-0 w-full h-full p-4 pointer-events-none'>
        <div
          className='absolute size-4 bg-green-500 rounded-full transition-all duration-100'
          style={{ left: `${(lPos.x) * 50}%`, top: `${(lPos.y) * 50}%`, transform: 'translate(-50%, -50%)' }}
        />
        <div
          className='absolute size-4 bg-purple-500 rounded-full transition-all duration-100'
          style={{ left: `${(rPos.x) * 50}%`, top: `${(rPos.y) * 50}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
    </div>
  )
}
