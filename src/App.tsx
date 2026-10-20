import { useState, useEffect, use, useMemo } from 'react'
import { PlayIcon, PauseIcon, SquareIcon, ChevronDownIcon } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import type { Chart } from '@/types/chart'
import { parseNX20 } from '@/parsers/nx20'
import { parseUCS } from '@/parsers/ucs'
import { ChartPlayer } from '@/components/player'
import { loadChartAssets } from '@/utils/asset-loader'
import { PadPlayer } from '@/components/pad'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/toast'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import { useAnimationManager } from '@/components/animation-provider'
import { msToString } from '@/utils/time'

const loadedAssets = loadChartAssets()

export function App () {
  const [stepFile, setStepFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [parsedChart, setParsedChart] = useState<Chart | null>(null)
  const assets = use(loadedAssets)
  const [autoVelocity, setAutoVelocity] = useState<number>(300)
  const scrollSpeed = useMemo(() => autoVelocity / (parsedChart?.blocks[0].bpm ?? autoVelocity) / 4, [autoVelocity, parsedChart])
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [showPad, setShowPad] = useState<boolean>(true)
  const [feetPrediction, setFeetPrediction] = useState<boolean>(true)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(1)
  const animationManager = useAnimationManager()
  const audio = useMemo(() => {
    if (audioFile) {
      const audioUrl = URL.createObjectURL(audioFile)
      return new Audio(audioUrl)
    } else {
      return null
    }
  }, [audioFile])

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
          toast.add({
            type: 'error',
            description: 'Failed to parse the step file. Please check the file format and try again.',
            priority: 'high',
          })
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
      setIsPlaying(!audio?.paused)
    }
    const handleTimeUpdate = () => {
      if (audio) {
        setCurrentTime(audio.currentTime * 1000)
      }
    }
    const handleDurationChange = () => {
      if (audio) {
        setDuration(audio.duration * 1000)
      }
    }

    if (audio) {
      audio.addEventListener('play', handlePlayingStateChange)
      audio.addEventListener('pause', handlePlayingStateChange)
      audio.addEventListener('ended', handlePlayingStateChange)
      audio.addEventListener('durationchange', handleDurationChange)
      animationManager.addCallback(handleTimeUpdate)
    }

    return () => {
      if (audio) {
        audio.removeEventListener('play', handlePlayingStateChange)
        audio.removeEventListener('pause', handlePlayingStateChange)
        audio.removeEventListener('ended', handlePlayingStateChange)
        audio.addEventListener('durationchange', handleDurationChange)
        animationManager.removeCallback(handleTimeUpdate)
      }
    }
  }, [audio, animationManager])

  return (
    <div className='flex items-center gap-4 flex-col'>
      <div className='flex flex-col gap-4 w-full h-full items-center'>
        <div className='text-2xl font-bold m-4 xl:hidden'>Good luck using on small screens!</div>
        <div className='flex w-full h-screen gap-4 justify-center p-4'>
          <div className='flex flex-col gap-2 w-24 items-center'>
            <p>{msToString(currentTime)}</p>
            <Slider
              orientation='vertical'
              disabled={audioFile === null}
              max={duration}
              value={currentTime}
              defaultValue={[0]}
              className='rotate-180'
              onValueChange={(value) => {
                if (audio) {
                  // can safely disable this rule since we update currentTime in the useEffect above, and this is only called when the user drags the slider
                  // eslint-disable-next-line react-hooks/immutability
                  audio.currentTime = (duration - (value as number)) / 1000
                }
              }}
            />
            <p>{msToString(duration)}</p>
          </div>
          <div className={
            cn('h-full p-4 bg-background rounded-md border',
              parsedChart?.type === 'single' ? 'w-120' : parsedChart?.type === 'half-double' ? 'w-160' : 'w-200'
            )
          }
          >
            <ChartPlayer key={parsedChart?.blocks.join()} chart={parsedChart} audio={audio} scrollSpeed={scrollSpeed} assets={assets} />
          </div>
          <div className='flex flex-col gap-4 w-full max-w-md'>
            {showPad && (<PadPlayer key={parsedChart?.blocks.join()} chart={parsedChart} audio={audio} feetPrediction={feetPrediction} />)}
            <Collapsible className='rounded-md' defaultOpen>
              <CollapsibleTrigger render={
                <Button variant='ghost' className='w-full'>Open Settings
                  <ChevronDownIcon className='ml-auto group-data-panel-open/button:rotate-180' />
                </Button>
              }
              />
              <CollapsibleContent className='flex flex-col gap-4 p-2.5'>
                <div className='flex gap-4'>
                  {
                    isPlaying
                      ? (
                          <Button className='w-20' onClick={() => audio?.pause()}>
                            <PauseIcon />
                            Pause
                          </Button>
                        )
                      : (
                          <Button
                            className='w-20' onClick={() => {
                              try {
                                audio?.play()
                              } catch (error) {
                                toast.add({
                                  type: 'error',
                                  description: 'Failed to play the audio file. Please check the file format and try again.',
                                  priority: 'high',
                                })
                                console.error('Error playing audio file:', error)
                              }
                            }}
                          >
                            <PlayIcon data-icon='inline-start' />
                            Play
                          </Button>
                        )
                  }
                  <Button onClick={() => {
                    if (audio) {
                      audio.pause()
                      // eslint-disable-next-line react-hooks/immutability
                      audio.currentTime = 0
                    }
                  }}
                  >
                    <SquareIcon data-icon='inline-start' />
                    Stop
                  </Button>
                </div>
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
                <Field orientation='horizontal'>
                  <Checkbox id='show-pad' name='show-pad' checked={showPad} onCheckedChange={(c) => setShowPad(c)} />
                  <FieldLabel htmlFor='show-pad'>
                    Show pad
                  </FieldLabel>
                </Field>
                <Field orientation='horizontal'>
                  <Checkbox id='feet-prediction' name='feet-prediction' checked={feetPrediction} onCheckedChange={(c) => setFeetPrediction(c)} />
                  <FieldLabel htmlFor='feet-prediction'>
                    Enable feet prediction (Does produce some lag on large charts)
                  </FieldLabel>
                </Field>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
        <p className='text-muted-foreground p-4'>Made by <a href='https://helloyunho.xyz' className={cn(buttonVariants({ variant: 'link' }), 'p-0')}>Helloyunho</a>. This website is <a href='https://github.com/Helloyunho/piu-visualizer' className={cn(buttonVariants({ variant: 'link' }), 'p-0')}>open sourced</a>.</p>
      </div>
    </div>
  )
}

export default App
