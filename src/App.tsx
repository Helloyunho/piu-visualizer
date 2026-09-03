import { useState, useEffect, useRef, use, useMemo } from 'react'
import { PlayIcon, PauseIcon, SquareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import type { Chart } from '@/types/chart'
import { parseNX20 } from '@/parsers/nx20'
import { parseUCS } from '@/parsers/ucs'
import { ChartPlayer } from '@/components/player'
import { loadChartAssets } from '@/utils/asset-loader'
import { PadPlayer } from '@/components/pad'

const loadedAssets = loadChartAssets()

export function App () {
  const [stepFile, setStepFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const [parsedChart, setParsedChart] = useState<Chart | null>(null)
  const assets = use(loadedAssets)
  const [autoVelocity, setAutoVelocity] = useState<number>(300)
  const scrollSpeed = useMemo(() => autoVelocity / (parsedChart?.blocks[0].bpm ?? autoVelocity) / 4, [autoVelocity, parsedChart])
  const [isPlaying, setIsPlaying] = useState<boolean>(false)

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {})
      navigator.mediaSession.setActionHandler('pause', () => {})
      navigator.mediaSession.setActionHandler('seekbackward', () => {})
      navigator.mediaSession.setActionHandler('seekforward', () => {})
      navigator.mediaSession.setActionHandler('previoustrack', () => {})
      navigator.mediaSession.setActionHandler('nexttrack', () => {})
    }
  }, [])

  useEffect(() => {
    const parseStepFile = async () => {
      if (stepFile) {
        try {
          const fileText = await stepFile.text()
          if (fileText.slice(0, 4) === 'NX20') {
            const arrayBuffer = await stepFile.arrayBuffer()
            const chart = parseNX20(arrayBuffer)
            setParsedChart(chart)
          } else {
            const chart = parseUCS(fileText)
            setParsedChart(chart)
          }
        } catch (error) {
          console.error('Error parsing step file:', error)
          setParsedChart(null)
        }
      } else {
        setParsedChart(null)
      }
    }
    parseStepFile()
  }, [stepFile])

  useEffect(() => {
    const handlePlayingStateChange = () => {
      setIsPlaying(!audio.current?.paused)
    }

    if (audioFile) {
      const audioUrl = URL.createObjectURL(audioFile)
      audio.current = new Audio(audioUrl)
      audio.current.addEventListener('ended', handlePlayingStateChange)
      audio.current.addEventListener('play', handlePlayingStateChange)
      audio.current.addEventListener('pause', handlePlayingStateChange)
    } else {
      audio.current?.removeEventListener('ended', handlePlayingStateChange)
      audio.current?.removeEventListener('play', handlePlayingStateChange)
      audio.current?.removeEventListener('pause', handlePlayingStateChange)
      audio.current = null
    }
  }, [audioFile])

  return (
    <div className='flex h-[calc(100vh-var(--spacing)*16)] items-center m-8 gap-4 flex-col'>
      <div className='flex flex-col gap-4 w-full max-w-md'>
        <div className='text-2xl font-bold xl:hidden'>Good luck using on small screens!</div>
        <Field>
          <FieldLabel htmlFor='step-file'>Step File</FieldLabel>
          <Input id='step-file' type='file' onChange={(e) => setStepFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Field>
          <FieldLabel htmlFor='audio-file'>Audio File</FieldLabel>
          <Input id='audio-file' type='file' onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Field>
          <FieldLabel htmlFor='auto-velocity'>Auto Velocity</FieldLabel>
          <Input
            id='auto-velocity'
            type='number'
            value={autoVelocity}
            onChange={(e) => setAutoVelocity(Number(e.target.value))}
          />
        </Field>
      </div>
      {stepFile && audioFile && audio && parsedChart && assets && (
        <div className='flex flex-col gap-4 w-full h-full items-center'>
          <div className='flex gap-4'>
            {
              isPlaying
                ? (
                    <Button className='w-20' onClick={() => audio.current?.pause()}>
                      <PauseIcon />
                      Pause
                    </Button>
                  )
                : (
                    <Button className='w-20' onClick={() => audio.current?.play()}>
                      <PlayIcon data-icon='inline-start' />
                      Play
                    </Button>
                  )
            }
            <Button onClick={() => {
              if (audio.current) {
                audio.current.pause()
                audio.current.currentTime = 0
              }
            }}
            >
              <SquareIcon data-icon='inline-start' />
              Stop
            </Button>
          </div>
          <div className='flex w-full h-full gap-4 justify-center'>
            <div className='w-full max-w-200 h-full p-4 bg-background rounded-md border'>
              <ChartPlayer chart={parsedChart} audioRef={audio} scrollSpeed={scrollSpeed} assets={assets} />
            </div>
            <PadPlayer chart={parsedChart} audioRef={audio} />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
