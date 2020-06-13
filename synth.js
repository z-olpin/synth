const start = document.querySelector(".start")
const stop = document.querySelector(".stop")
const frequencyInput = document.querySelector('.frequency')
const volumeInput = document.querySelector('.volume')

const setFrequency = f => osc.frequency.setValueAtTime(f, ctx.currentTime)
const setVolume = v => gain.gain.setValueAtTime(v, ctx.currentTime)

const ctx = new AudioContext()
const osc = ctx.createOscillator() 
const gain = ctx.createGain()
osc.connect(gain).connect(ctx.destination) 

osc.frequency.setValueAtTime(180, ctx.currentTime) 
gain.gain.setValueAtTime(0.1, ctx.currentTime)

start.addEventListener("click", () => osc.start())
stop.addEventListener("click", () => osc.stop())

frequencyInput.addEventListener("input", () => setFrequency(Number(frequencyInput.value)))
volumeInput.addEventListener("input", () => setVolume(Number(volumeInput.value)))
