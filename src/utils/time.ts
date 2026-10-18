export const msToString = (ms: number) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor(ms / 60000) % 60
  const seconds = Math.floor(ms / 1000) % 60
  const milli = Math.floor(ms) % 1000

  return `${hours !== 0 ? hours.toString().padStart(2, '0') + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milli.toString().padStart(2, '0')}`
}
