import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pad } from './pad.tsx'

const meta: Meta<typeof Pad> = {
  component: Pad,
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['single', 'double', 'half-double']
    },
    activePads: {
      control: { type: 'multi-select' },
      options: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
  }
}
export default meta

export const Default: StoryObj<typeof meta> = {
  args: {
    type: 'single'
  }
}

export const Double: StoryObj<typeof meta> = {
  args: {
    type: 'double'
  }
}

export const HalfDouble: StoryObj<typeof meta> = {
  args: {
    type: 'half-double'
  }
}
