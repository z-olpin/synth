class Synth {
  constructor(ctx, track) {
    this.ctx = ctx;
    this.oscs = [];
    this.track = track;
    this.rev = ctx.createConvolver();
    this.rev.buffer = this.reverbBuffer()
    this.sink = ctx.createGain()
    this.sink.connect(this.rev)
    this.rev.connect(ctx.destination)
    this.sink.connect(ctx.destination)
    this.keys = [293.66, 329.62, 369.99, 391.99, 440.00, 493.88, 554.36, 587.32]
  }

  noiseBuffer() {
    if (!Synth._noiseBuffer) {
      Synth._noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate / 10, this.ctx.sampleRate)
      let cd = Synth._noiseBuffer.getChannelData(0)
      for (let i = 0; i < cd.length; i++) {
        cd[i] = Math.random() * 2 - 1
      }
    }
    return Synth._noiseBuffer
  }

  reverbBuffer() {
    let len = 0.3 * this.ctx.sampleRate
    let decay = 0.8
    let buffer = this.ctx.createBuffer(2, len, this.ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      let channelData = buffer.getChannelData(c)
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
      }
    }
    return buffer
  }

  kick(time) {
    let osc = this.ctx.createOscillator()
    let gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.sink)
    gain.gain.setTargetAtTime(1.5, time, 0.0)
    gain.gain.setTargetAtTime(0.0, time, 0.1)
    osc.frequency.value = 100;
    osc.frequency.setTargetAtTime(30, time, 0.15)
    osc.start(time)
    osc.stop(time + 1)
  }

  snare(time) {
    let src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer()
    let gain = this.ctx.createGain()
    let bpf = this.ctx.createBiquadFilter();
    bpf.type = "lowpass";
    bpf.frequency.value = 7000;
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.setTargetAtTime(0.2, time, 0.01);
    gain.gain.setTargetAtTime(0.0, time, 0.02);
    src.connect(gain);
    gain.connect(bpf);
    bpf.connect(this.sink)
    src.start(time);
  }

  hat(time) {
    let src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    let gain = this.ctx.createGain();
    let hpf = this.ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 3205;
    gain.gain.setValueAtTime(0.65, time);
    gain.gain.setTargetAtTime(0.0, time, 0.03);
    src.connect(gain);
    gain.connect(hpf);
    hpf.connect(this.sink);
    src.start(time);
  }

  makeDistortionCurve(amount) {
    let k = typeof amount === 'number' ? amount : 50
    let n_samples = 44100
    let curve = new Float32Array(n_samples)
    let deg = Math.PI / 180
    let x = 0
    for (let i = 0; i < n_samples; ++i) {
      x = i * 2 / n_samples - 1;
      curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

 oscGroup(time, note) {
    if (this.oscs[this.oscs.length - 1]) {
      let key = this.keys[note - 1];
      if (Math.abs(this.oscs[this.oscs.length - 1] - key) < 1) key = 329.62;
      this.oscs[this.oscs.length - 1].frequency.setValueAtTime(key, time)
    }
  }


  clock() {
    let beatLength = 60 / this.track.tempo
    return (this.ctx.currentTime - this.startTime) / beatLength
  }

  start() {
    this.startTime = this.ctx.currentTime
    this.nextScheduling = 0;
    this.scheduler()
  }

  stop() {
    this.sink.disconnect()
  }

  add() {
    let distortionFilter = this.ctx.createWaveShaper()
    distortionFilter.curve = this.makeDistortionCurve(220)
    distortionFilter.oversample = '4x'
    let osc = this.ctx.createOscillator()
    let gain = this.ctx.createGain()
    osc.frequency.setValueAtTime(0, this.ctx.currentTime)
    gain.gain.setValueAtTime(0.01, this.ctx.currentTime)
    this.oscs.push(osc)
    this.oscs[this.oscs.length - 1].connect(gain).connect(distortionFilter).connect(this.sink)
    osc.start()
  }

  scheduler() {
    let beatLength = 60 / this.track.tempo
    let current = this.clock()
    let lookahead = 0.5
    if (current + lookahead > this.nextScheduling) {
      let steps = [];
      for (let i = 0; i < 4; i++) {
        steps.push(this.nextScheduling + i * beatLength / 4)
      }
      for (let i in this.track.tracks) {
        for (let j = 0; j < steps.length; j++) {
          let idx = Math.round(steps[j] / ((beatLength / 4)))
          let note = this.track.tracks[i][idx % this.track.tracks[i].length]
          if (note !== 0) {
            (this[i])(steps[j], note)
          }
        }
      }
      this.nextScheduling += (60 / this.track.tempo)
    }
    setTimeout(this.scheduler.bind(this), 100)
  }
}

let track = {
  tempo: 115
  , tracks: {
    kick:
      [ 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 1, 0, 1, 0, 1, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 1, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 1, 1, 1
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 1, 1, 0
      , 1, 0, 1, 0, 1, 0, 1, 0
    ]
    , snare:
      [ 0, 0, 0, 0, 1, 0, 0, 0
      , 0, 0, 0, 0, 1, 0, 0, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 0, 0, 0, 0, 1, 1, 0, 1
      , 0, 0, 0, 0, 1, 0, 0, 0
      , 0, 0, 0, 0, 1, 0, 0, 0
      , 1, 1, 1, 0, 1, 0, 1, 0
      , 1, 0, 0, 0, 1, 0, 0, 0
      , 0, 0, 0, 0, 1, 0, 0, 0
      , 0, 0, 0, 0, 1, 0, 0, 0
      , 0, 0, 0, 0, 1, 0, 0, 0
      , 0, 0, 1, 0, 1, 0, 1, 0
      , 0, 0, 0, 0, 1, 0, 0, 0
      , 0, 0, 1, 0, 1, 0, 0, 0
      , 0, 0, 0, 0, 1, 1, 0, 0
      , 1, 0, 0, 0, 1, 0, 1, 0
    ]
    , hat:
      [ 1, 0, 1, 0, 1, 0, 1, 0
      , 1, 0, 1, 0, 1, 0, 1, 0
      , 1, 1, 1, 0, 1, 0, 1, 0
      , 1, 0, 1, 0, 1, 0, 1, 0
      , 1, 1, 1, 0, 1, 0, 1, 0
      , 1, 1, 1, 0, 1, 0, 1, 0
      , 1, 1, 1, 0, 1, 1, 1, 1
      , 1, 1, 1, 0, 1, 0, 1, 0
      , 1, 0, 1, 0, 1, 0, 1, 0
      , 1, 0, 1, 0, 1, 0, 1, 0
      , 1, 0, 1, 0, 1, 0, 1, 0
      , 1, 0, 1, 0, 1, 0, 1, 0
      , 1, 0, 1, 0, 1, 0, 1, 0
      , 1, 0, 1, 0, 1, 0, 1, 0
      , 1, 0, 1, 1, 0, 1, 1, 0
      , 1, 0, 1, 0, 1, 1, 1, 1
    ]
    , oscGroup:
      [ 1, 8, 7, 6, 3, 4, 3, 2
      , 7, 7, 0, 7, 2, 4, 8, 0
      , 0, 5, 7, 4, 4, 4, 8, 1
      , 8, 8, 8, 1, 5, 7, 0, 5
      , 0, 1, 8, 2, 3, 3, 6, 2
      , 2, 5, 1, 0, 8, 8, 5, 0
      , 7, 4, 3, 6, 8, 6, 0, 5
      , 7, 2, 6, 2, 4, 1, 0, 2
      , 0, 3, 8, 4, 6, 0, 0, 1
      , 1, 8, 7, 6, 3, 4, 3, 2
      , 7, 7, 0, 7, 2, 4, 8, 0
      , 0, 5, 7, 4, 4, 4, 8, 1
      , 8, 8, 8, 1, 5, 7, 0, 5
      , 0, 1, 8, 2, 3, 3, 6, 2
      , 2, 5, 1, 0, 8, 8, 5, 0
      , 7, 4, 3, 6, 8, 6, 0, 5
      , 7, 2, 6, 2, 4, 1, 0, 2
      , 0, 3, 8, 4, 6, 0, 0, 1
    ]
  }
}

let syn = new Synth(new AudioContext(), track)

// Why? CSS.
document.querySelectorAll('button')
  .forEach(e => e.addEventListener("click", e => {
      e.target.style.backgroundColor = '#4495FF';
      return setTimeout(() => e.target.style.backgroundColor = '#0050db', 300)
  }))

document.querySelector(".start").addEventListener("click", () => {
  syn = new Synth(new AudioContext(), track)
  syn.start()
})

document.querySelector(".stop").addEventListener("click", () => syn.ctx.close())

document.querySelector(".key").addEventListener("click", () => syn.add())
