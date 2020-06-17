class S {
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
    if (!S._noiseBuffer) {
      S._noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate / 10, this.ctx.sampleRate)
      let cd = S._noiseBuffer.getChannelData(0)
      for (let i=0; i < cd.length; i++) {
        cd[i] = Math.random() * 2 - 1
      }
    }
    return S._noiseBuffer
  }

  reverbBuffer() {
    let len = 0.3 * this.ctx.sampleRate
    let decay = 0.8
    let buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      let channelData = buf.getChannelData(c)
      for (let i=0; i < channelData.length; i ++) {
        channelData[i] = (Math.random() * 2 -1) * Math.pow(1 - i / len, decay)
      }
    }
    return buf
  }

  kick(t) {
    let o = this.ctx.createOscillator()
    let g = this.ctx.createGain()
    o.connect(g)
    g.connect(this.sink)

    g.gain.setTargetAtTime(1.5, t, 0.0)
    g.gain.setTargetAtTime(0.0, t, 0.1)
    o.frequency.value = 100;
    o.frequency.setTargetAtTime(30, t, 0.15)

    o.start(t)
    o.stop(t + 1)
  }

  snare(t) {
    let s = this.ctx.createBufferSource()
    s.buffer = this.noiseBuffer()
    let g = this.ctx.createGain()
    let bpf = this.ctx.createBiquadFilter();
    bpf.type = "lowpass";
    bpf.frequency.value = 7000;
    g.gain.setValueAtTime(1.0, t);
    g.gain.setTargetAtTime(0.2, t, 0.01);
    g.gain.setTargetAtTime(0.0, t, 0.02);
    s.connect(g);
    g.connect(bpf);
    bpf.connect(this.sink)
    // hpf.connect(this.sink);

    s.start(t);
  }

  hat(t) {
    let s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuffer();
    let g = this.ctx.createGain();
    let hpf = this.ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 3205;
    g.gain.setValueAtTime(0.65, t);
    g.gain.setTargetAtTime(0.0, t, 0.03);
    s.connect(g);
    g.connect(hpf);
    hpf.connect(this.sink);
    s.start(t);
  }

  makeDistortionCurve(amount) {
    let k = typeof amount === 'number' ? amount : 50
    let n_samples = 44100
    let curve = new Float32Array(n_samples)
    let deg = Math.PI / 180
    let x = 0
    for (let i = 0; i < n_samples; ++i ) {
      x = i * 2 / n_samples - 1;
      curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
  };

  oscGroup(t, note) {
    if (this.oscs[this.oscs.length - 1]) {
      let key = this.keys[note - 1];
      if (Math.abs(this.oscs[this.oscs.length - 1] - key) < 1) key = 329.62;
      this.oscs[this.oscs.length - 1].frequency.setValueAtTime
        (key / 2, t)
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
    osc.frequency.setValueAtTime(220, this.ctx.currentTime)
    gain.gain.setValueAtTime(0.02, this.ctx.currentTime)
    this.oscs.push(osc)
    this.oscs[this.oscs.length - 1].connect(gain).connect(distortionFilter).connect(this.sink)
    osc.start()
  }

  scheduler() {
    let beatLength = 60 / this.track.tempo
    let current = this.clock()
    let lookahead = 0.5
    if (current + lookahead > this.nextScheduling)  {
      let steps = [];
      for (let i=0; i < 4; i++) {
        steps.push(this.nextScheduling + i * beatLength / 4)
      }
      for (let i in this.track.tracks) {
        for (let j=0; j < steps.length; j++) {
          let idx = Math.round(steps[j] / ((beatLength / 4)))
          let note = this.track.tracks[i][idx % this.track.tracks[i].length]
          if (note != 0) {
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
  tempo: 115,
  tracks: {
    kick: [ 1, 0, 0, 0, 1, 0, 0, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 0, 0, 1, 0, 0, 0
          , 1, 0, 0, 0, 1, 0, 0, 0
          , 1, 0, 0, 0, 1, 0, 0, 0
          , 1, 0, 0, 0, 1, 0, 0, 0
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
    ],
   snare: [ 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 1, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1, 0, 0, 0
          , 0, 0, 0, 0, 1 ,0, 0, 0
          , 0, 0, 0, 0, 1, 0, 1, 0
    ],
    hat: [ 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 0, 1, 0, 1, 0
          , 1, 0, 1, 1, 0 ,1, 1, 0
          , 1, 0, 1, 0, 1, 1, 1, 1
],
oscGroup: [  1, 1, 1, 1, 1, 1, 1, 1
  , 2, 2, 2, 2, 2, 2, 2, 2
  , 3, 3, 3, 3, 3, 3, 3, 3
          , 4, 4, 4, 4, 4, 4, 4, 4
          , 5, 5, 5, 5, 5, 5, 5, 5
          , 6, 6, 6, 6, 6, 6, 6, 6
          , 7, 7, 7, 7, 7, 7, 7, 7
          , 8, 8, 8, 8, 8, 8, 8, 8
          , 7, 7, 7, 7, 7, 7, 7, 7
          , 6, 6, 6, 6, 6, 6, 6, 6
          , 5, 5, 5, 5, 5, 5, 5, 5
          , 4, 4, 4, 4, 4, 4, 4, 4
          , 3, 3, 3, 3, 3, 3, 3, 3
          , 2, 2, 2, 2, 2, 2, 2, 2
          , 1, 1, 1, 1, 1, 1, 1, 1
]
  }
}

let s = new S(new AudioContext(), track)

document.querySelector(".start").addEventListener("click", () => {
  s = new S(new AudioContext(), track)
  s.start()
})

document.querySelector(".stop").addEventListener("click", () => s.ctx.close())

document.querySelector(".key").addEventListener("click", () => s.add())