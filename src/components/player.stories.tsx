import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChartPlayer } from './player.tsx'
import { parseUCS } from '@/parsers/ucs.ts'
import { loadChartAssets } from '@/utils/asset-loader.ts'
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

const meta: Meta<typeof ChartPlayer> = {
  component: ChartPlayer,
  render: (args, { loaded: { chart, assets } }) => <ChartPlayer {...args} chart={chart} assets={assets} />,
}

export default meta

export const Default: StoryObj<typeof meta> = {
  loaders: [
    async () => ({
      chart: parseUCS(await fetch('/CS342_d18.ucs').then((res) => res.text()))
    }),
    async () => ({
      assets: await loadChartAssets({
        noteUrls: [BottomLeft, TopLeft, Center, TopRight, BottomRight],
        inactiveUrls: [BottomLeftInactive, TopLeftInactive, CenterInactive, TopRightInactive, BottomRightInactive],
        longUrls: [BottomLeftLong, TopLeftLong, CenterLong, TopRightLong, BottomRightLong]
      })
    })
  ],
  args: {
    audioCurrentTime: 3500,
    scrollSpeed: 0.5
  }
}
