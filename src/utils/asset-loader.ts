import BottomLeft from '../assets/notes/BottomLeft.svg'
import TopLeft from '../assets/notes/TopLeft.svg'
import Center from '../assets/notes/Center.svg'
import TopRight from '../assets/notes/TopRight.svg'
import BottomRight from '../assets/notes/BottomRight.svg'
import BottomLeftInactive from '../assets/notes/BottomLeftInactive.svg'
import TopLeftInactive from '../assets/notes/TopLeftInactive.svg'
import CenterInactive from '../assets/notes/CenterInactive.svg'
import TopRightInactive from '../assets/notes/TopRightInactive.svg'
import BottomRightInactive from '../assets/notes/BottomRightInactive.svg'
import BottomLeftLong from '../assets/notes/BottomLeftLong.svg'
import TopLeftLong from '../assets/notes/TopLeftLong.svg'
import CenterLong from '../assets/notes/CenterLong.svg'
import TopRightLong from '../assets/notes/TopRightLong.svg'
import BottomRightLong from '../assets/notes/BottomRightLong.svg'

export type PreloadAssets = {
  notes: HTMLImageElement[]
  inactives: HTMLImageElement[]
  longs: HTMLImageElement[]
  hitSilhouettes: HTMLCanvasElement[]
}

const loadAssetsAsync = async (): Promise<PreloadAssets> => {
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = url
      img.onload = () => resolve(img)
      img.onerror = (err) => reject(err)
    })
  }

  const notes = await Promise.all([
    loadImage(BottomLeft),
    loadImage(TopLeft),
    loadImage(Center),
    loadImage(TopRight),
    loadImage(BottomRight)
  ])

  const inactives = await Promise.all([
    loadImage(BottomLeftInactive),
    loadImage(TopLeftInactive),
    loadImage(CenterInactive),
    loadImage(TopRightInactive),
    loadImage(BottomRightInactive)
  ])

  const longs = await Promise.all([
    loadImage(BottomLeftLong),
    loadImage(TopLeftLong),
    loadImage(CenterLong),
    loadImage(TopRightLong),
    loadImage(BottomRightLong)
  ])

  const hitSilhouettes = inactives.map((img) => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!

    // Draw the original image
    ctx.drawImage(img, 0, 0)

    // source-in replaces the visible pixels of the image with the fill color
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = '#ff8904'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    return canvas
  })

  return { notes, inactives, longs, hitSilhouettes }
}

let cachedPromises: Promise<PreloadAssets> | null = null

export const loadChartAssets = (): Promise<PreloadAssets> => {
  if (cachedPromises) {
    return cachedPromises
  }
  cachedPromises = loadAssetsAsync()
  return cachedPromises
}
