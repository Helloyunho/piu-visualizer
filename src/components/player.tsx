import { useEffect, useRef, useMemo } from 'react'
import type { PreloadAssets } from '@/utils/asset-loader'
import { type Chart, type Note, PAD_COUNT_MAP } from '@/types/chart'
import { useAnimationManager } from '@/components/animation-provider'

interface ChartPlayerProps {
  chart: Chart
  audioRef: React.RefObject<HTMLAudioElement | null>
  scrollSpeed?: number
  assets: PreloadAssets
}

const padIndexMap: Record<Chart['type'], number[]> = {
  single: [0, 1, 2, 3, 4],
  double: [0, 1, 2, 3, 4, 0, 1, 2, 3, 4],
  'half-double': [2, 3, 4, 0, 1, 2]
}

export function ChartPlayer ({ chart, audioRef, scrollSpeed = 600, assets }: ChartPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { addCallback, removeCallback } = useAnimationManager()

  const { processedNotes, processedLongNotes, getYAtTime } = useMemo(() => {
    const initialBPM = chart.blocks[0]?.bpm ?? 120
    const segments: { time: number, bpm: number, absY: number }[] = []

    const bpmChanges = chart.blocks.map(block => {
      return {
        time: block.startTime,
        bpm: block.bpm
      }
    }).sort((a, b) => a.time - b.time)

    let currentBPM = initialBPM
    let lastTime = 0
    let lastAbsY = 0

    segments.push({ time: 0, bpm: currentBPM, absY: 0 })

    bpmChanges.forEach(change => {
      if (change.time > lastTime && change.bpm !== currentBPM) {
        const speedPerMs = scrollSpeed * (currentBPM / initialBPM)
        lastAbsY = lastAbsY + (change.time - lastTime) * speedPerMs
        lastTime = change.time
        currentBPM = change.bpm
        segments.push({ time: lastTime, bpm: currentBPM, absY: lastAbsY })
      }
    })

    const getAbsY = (time: number) => {
      let segment = segments[0]
      for (let i = segments.length - 1; i >= 0; i--) {
        if (time >= segments[i].time) {
          segment = segments[i]
          break
        }
      }
      const speedPerMs = scrollSpeed * (segment.bpm / initialBPM)
      return segment.absY + (time - segment.time) * speedPerMs
    }

    const pNotes: (Note & {
      absY: number
    })[] = []
    const pLongs: {
      padIndex: number
      startTime: number
      endTime: number
      startAbsY: number
      endAbsY: number
    }[] = []
    const longNotesMap: Record<number, { startTime: number, startAbsY: number }> = {}

    chart.blocks.forEach(block => {
      block.notes.forEach(note => {
        const absY = getAbsY(note.time)

        if (note.type === 1) {
          longNotesMap[note.padIndex] = { startTime: note.time, startAbsY: absY }
        } else if (note.type === 3 && longNotesMap[note.padIndex]) {
          pLongs.push({
            padIndex: note.padIndex,
            startTime: longNotesMap[note.padIndex].startTime,
            endTime: note.time,
            startAbsY: longNotesMap[note.padIndex].startAbsY,
            endAbsY: absY
          })
          delete longNotesMap[note.padIndex]
        }

        if (note.type === 0 || note.type === 1 || note.type === 3) {
          pNotes.push({ ...note, absY })
        }
      })
    })

    return { processedNotes: pNotes, processedLongNotes: pLongs, getYAtTime: getAbsY }
  }, [chart, scrollSpeed])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const dpr = window.devicePixelRatio ?? 1

    if (!canvas || !ctx || !assets) return

    const PAD_COUNT = PAD_COUNT_MAP[chart.type]
    const LANE_WIDTH = 64
    const TARGET_Y = 32
    const GAP = 4
    const startX = (canvas.width / dpr - (PAD_COUNT * LANE_WIDTH + (PAD_COUNT - 1) * GAP)) / 2

    const currentNotes: (number | null)[] = Array(PAD_COUNT).fill(null)

    const render = () => {
      const audioCurrentTime = (audioRef.current?.currentTime ?? 0) * 1000
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

      const currentAbsY = getYAtTime(audioCurrentTime)

      for (let i = 0; i < PAD_COUNT; i++) {
        ctx.drawImage(
          assets.inactives[padIndexMap[chart.type][i]],
          startX + (i * LANE_WIDTH) + (i * GAP),
          TARGET_Y,
          LANE_WIDTH,
          LANE_WIDTH
        )
      }

      currentNotes.fill(null)

      processedLongNotes.forEach(longNote => {
        const startDiff = longNote.startTime - audioCurrentTime
        const endDiff = longNote.endTime - audioCurrentTime

        if (endDiff < 0) return

        const isActive = startDiff <= 0
        if (isActive) {
          currentNotes[longNote.padIndex] = 1
        }

        const startY = isActive ? TARGET_Y : TARGET_Y + (longNote.startAbsY - currentAbsY)
        const endY = TARGET_Y + (longNote.endAbsY - currentAbsY)

        const xPos = startX + (longNote.padIndex * LANE_WIDTH) + (longNote.padIndex * GAP)
        const bodyHeight = Math.abs(endY - startY)
        const drawY = Math.min(startY, endY)
        const totalHeight = bodyHeight + LANE_WIDTH
        const padIndex = padIndexMap[chart.type][longNote.padIndex]

        if (endY > -100 && startY < canvas.height / dpr + 100) {
          ctx.save()
          ctx.beginPath()

          if (padIndex !== 2) {
            const leftDiv = padIndex < 2 ? 4 : 3
            const rightDiv = padIndex < 2 ? 3 : 4
            const leftTopVal = padIndex < 2 ? 2 : 3 - (padIndex - 2)
            const rightTopVal = padIndex < 2 ? padIndex + 1 : 2
            const leftBottomVal = padIndex < 2 ? 2 : 3 - (padIndex - 2)
            const rightBottomVal = padIndex < 2 ? padIndex + 1 : 2

            ctx.moveTo(xPos, drawY + (LANE_WIDTH * leftBottomVal / leftDiv))
            ctx.lineTo(xPos + LANE_WIDTH, drawY + (LANE_WIDTH * rightBottomVal / rightDiv))
            ctx.lineTo(xPos + LANE_WIDTH, drawY + totalHeight - (LANE_WIDTH * (1 - rightTopVal / rightDiv)))
            ctx.lineTo(xPos, drawY + totalHeight - (LANE_WIDTH * (1 - leftTopVal / leftDiv)))
            ctx.lineTo(xPos, drawY + (LANE_WIDTH * leftBottomVal / leftDiv))
          } else {
            ctx.moveTo(xPos, drawY + (LANE_WIDTH * 2 / 4))
            ctx.lineTo(xPos + LANE_WIDTH, drawY + (LANE_WIDTH * 2 / 4))
            ctx.lineTo(xPos + LANE_WIDTH, drawY + totalHeight - (LANE_WIDTH * 2 / 4))
            ctx.lineTo(xPos, drawY + totalHeight - (LANE_WIDTH * 2 / 4))
            ctx.lineTo(xPos, drawY + (LANE_WIDTH * 2 / 4))
          }
          ctx.closePath()
          ctx.clip()

          ctx.drawImage(
            assets.longs[padIndexMap[chart.type][longNote.padIndex]],
            xPos + 4,
            drawY,
            LANE_WIDTH - 8,
            totalHeight
          )
          ctx.restore()
        }
      })

      processedNotes.forEach(note => {
        const timeDiff = note.time - audioCurrentTime

        if (timeDiff < 0) return

        const yPos = TARGET_Y + (note.absY - currentAbsY)
        const xPos = startX + (note.padIndex * LANE_WIDTH) + (note.padIndex * GAP)

        if (yPos > -100 && yPos < canvas.height / dpr + 100) {
          ctx.drawImage(
            assets.notes[padIndexMap[chart.type][note.padIndex]],
            xPos,
            yPos,
            LANE_WIDTH,
            LANE_WIDTH
          )
        }
      })

      currentNotes.forEach((note, padIndex) => {
        if (note === 1) {
          const xPos = startX + (padIndex * LANE_WIDTH) + (padIndex * GAP)
          const yPos = TARGET_Y

          ctx.drawImage(
            assets.notes[padIndexMap[chart.type][padIndex]],
            xPos,
            yPos,
            LANE_WIDTH,
            LANE_WIDTH
          )
        }
      })
    }

    addCallback(render)

    return () => {
      removeCallback(render)
    }
  }, [chart, audioRef, scrollSpeed, assets, processedNotes, processedLongNotes, getYAtTime, addCallback, removeCallback])

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        const dpr = window.devicePixelRatio ?? 1

        canvas.width = canvas.offsetWidth * dpr
        canvas.height = canvas.offsetHeight * dpr

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(dpr, dpr)
        }
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <canvas ref={canvasRef} className='bg-background rounded-md border w-full h-full' />
  )
}
