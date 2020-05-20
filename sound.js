var ctx = new AudioContext()
var connect = document.querySelector('#connect')
var makeOsc = document.querySelector('#makeOsc')
var freq = document.querySelector('#frequency')
var makeGain = document.querySelector('#makeGain')
var gain = document.querySelector('#gain')

var oscillators = []

var connectT = () => {
    oscillators[oscillators.length -1].osc.connect(oscillators[oscillators.length -1].gain)
}

var makeO = () => {
    var osc = ctx.createOscillator(frequency=Number(freq.value).toFixed(1), type="sine")
    osc.start()
    oscillators.push({name: oscillators.length, gain: {}, osc})
}

var makeG = () => {
    var gain = ctx.createGain()
    gain.gain.value = 3.12
    oscillators[oscillators.length - 1].gain = gain
}

var connectO = () => oscillators[oscillators.length -1].gain.connect(ctx.destination)

makeOsc.addEventListener('click', makeO)

makeGain.addEventListener('click', makeG)

connect.addEventListener('click', connectT)

document.querySelector('#out').addEventListener('click', connectO)

freq.addEventListener('input', e => oscillators[oscillators.length - 1].osc.frequency.setValueAtTime(Number(e.target.value).toFixed(1), ctx.currentTime))