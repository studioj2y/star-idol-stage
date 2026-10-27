// Retro Chiptune & Anime Idol SFX/BGM Synthesizer via Web Audio API
class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmPlaying = false;
        this.tempo = 138; // Upbeat J-pop tempo
        this.step = 0;
        this.timer = null;
        this.masterGain = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.25;
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.25;
        }
        return this.muted;
    }

    // Formant Vowel Synthesizer for Arcade Crowd Chants
    playVowelSyllable(f0, f1, f2, duration, delay = 0, vol = 0.28, isPlosive = false) {
        if (this.muted || !this.ctx) return;
        this.init();
        try {
            const start = this.ctx.currentTime + delay;

            // Plosive consonant click (/t/ in 'to' or 'tan')
            if (isPlosive) {
                const bSize = Math.floor(this.ctx.sampleRate * 0.018);
                const buf = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < bSize; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
                const noise = this.ctx.createBufferSource();
                noise.buffer = buf;
                const nGain = this.ctx.createGain();
                nGain.gain.setValueAtTime(vol * 0.5, start);
                nGain.gain.exponentialRampToValueAtTime(0.001, start + 0.018);
                noise.connect(nGain);
                nGain.connect(this.masterGain);
                noise.start(start);
                noise.stop(start + 0.018);
            }

            // Layered crowd chorus oscillators with slight detune
            [f0, f0 * 1.025, f0 * 0.98].forEach((freq) => {
                const osc = this.ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, start);
                osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.86), start + duration);

                // Formant 1 (Vowel height)
                const bp1 = this.ctx.createBiquadFilter();
                bp1.type = 'bandpass';
                bp1.frequency.value = f1;
                bp1.Q.value = 6;

                // Formant 2 (Vowel backness)
                const bp2 = this.ctx.createBiquadFilter();
                bp2.type = 'bandpass';
                bp2.frequency.value = f2;
                bp2.Q.value = 7;

                const outGain = this.ctx.createGain();
                outGain.gain.setValueAtTime(0.001, start);
                outGain.gain.linearRampToValueAtTime(vol * 0.35, start + 0.025);
                outGain.gain.exponentialRampToValueAtTime(0.001, start + duration);

                osc.connect(bp1);
                osc.connect(bp2);
                bp1.connect(outGain);
                bp2.connect(outGain);
                outGain.connect(this.masterGain);

                osc.start(start);
                osc.stop(start + duration);
            });
        } catch(e) {}
    }

    // Japanese Idol Crowd Chant: "もっと！もっと！" (Motto! Motto!)
    playMottoCall() {
        if (this.muted) return;
        this.init();
        // First "Motto!"
        this.playVowelSyllable(270, 520, 920, 0.11, 0, 0.32, false);      // "Mo-"
        this.playVowelSyllable(310, 500, 880, 0.15, 0.13, 0.36, true);    // "-tto!"
        // Second "Motto!"
        this.playVowelSyllable(290, 520, 920, 0.11, 0.33, 0.34, false);   // "Mo-"
        this.playVowelSyllable(330, 500, 880, 0.18, 0.46, 0.40, true);    // "-tto!"
    }

    // Japanese Idol Crowd Chant: "なぁたん！" (Naatan!)
    playNaatanCall() {
        if (this.muted) return;
        this.init();
        // "Naa~" (Vowel /a/)
        this.playVowelSyllable(310, 820, 1340, 0.22, 0, 0.36, false);
        // "-tan!" (Plosive /t/ + Vowel /a/)
        this.playVowelSyllable(350, 780, 1260, 0.25, 0.20, 0.42, true);

        // Crowd cheerful applause/sparkle burst
        setTimeout(() => {
            this.playCrowdCheer();
        }, 160);
    }

    // High energy crowd cheer & applause noise
    playCrowdCheer() {
        if (this.muted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const bSize = Math.floor(this.ctx.sampleRate * 0.4);
            const buf = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bSize; i++) d[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buf;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.Q.value = 1.8;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            noise.start(now);
            noise.stop(now + 0.4);
        } catch(e) {}
    }

    // Play a retro synth tone
    playTone(freq, type, duration, startVol = 0.3, endVol = 0, pitchDecay = 0) {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (pitchDecay !== 0) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + pitchDecay), now + duration);
            }

            gain.gain.setValueAtTime(startVol, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endVol), now + duration);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            // Audio context may not be ready or allowed
        }
    }

    // Jump sound: cheerful rising chirp
    playJump() {
        if (this.muted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.12);
        } catch(e) {}
    }

    // Double Jump: Twinkly arpeggio
    playDoubleJump() {
        if (this.muted) return;
        this.init();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.09, 0.25, 0.01);
            }, idx * 30);
        });
    }

    // Star collect chime with pitch scaling based on combo
    playStar(combo = 1) {
        if (this.muted) return;
        this.init();
        const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51];
        const pitchIndex = Math.min((combo - 1) % scale.length, scale.length - 1);
        const freq1 = scale[pitchIndex];
        const freq2 = freq1 * 1.5; // fifth

        this.playTone(freq1, 'triangle', 0.12, 0.3, 0.01);
        setTimeout(() => {
            this.playTone(freq2, 'sine', 0.15, 0.25, 0.01);
        }, 40);
    }

    // Super spring bounce
    playSpring() {
        if (this.muted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.25);
        } catch(e) {}
    }

    // Fever Mode Start: idol fanfare!
    playFever() {
        if (this.muted) return;
        this.init();
        const chords = [
            [523.25, 659.25, 783.99], // C major
            [587.33, 698.46, 880.00], // D minor
            [659.25, 783.99, 987.77], // E minor
            [783.99, 987.77, 1174.66, 1567.98] // G / High C sparkle
        ];
        chords.forEach((chord, i) => {
            setTimeout(() => {
                chord.forEach(f => this.playTone(f, 'square', 0.18, 0.15, 0.01));
            }, i * 110);
        });
    }

    // Game Over jingle
    playGameOver() {
        if (this.muted) return;
        this.init();
        const notes = [440, 415.3, 392, 349.23];
        notes.forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'sawtooth', 0.25, 0.2, 0.01);
            }, i * 160);
        });
    }

    // Cute background chiptune music loop
    startBGM() {
        if (this.bgmPlaying) return;
        this.init();
        this.bgmPlaying = true;
        this.step = 0;

        // Catchy J-pop 16-step retro pattern (frequencies in Hz)
        const C = 261.63, D = 293.66, E = 329.63, F = 349.23, G = 392.00, A = 440.00, B = 493.88;
        const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99;

        const melody = [
            E5, G5, A, C5,  E5, D5, C5, D5,
            E5, G5, C5, A,   G5, E5, D5, C5
        ];

        const bassline = [
            C/2, 0, C/2, 0,  F/2, 0, F/2, 0,
            A/2, 0, A/2, 0,  G/2, 0, G/2, G/2
        ];

        const stepTime = (60 / this.tempo) / 2 * 1000; // 16th notes

        this.timer = setInterval(() => {
            if (!this.bgmPlaying || this.muted) return;

            const mNote = melody[this.step % melody.length];
            const bNote = bassline[this.step % bassline.length];

            // Melody (cute square wave)
            if (mNote) {
                this.playTone(mNote, 'square', 0.1, 0.08, 0.001);
            }
            // Bassline (triangle)
            if (bNote) {
                this.playTone(bNote * 2, 'triangle', 0.14, 0.18, 0.001);
            }
            // Drum noise on 4th and 12th step (snare)
            if (this.step % 8 === 4) {
                this.playSnare();
            } else if (this.step % 8 === 0) {
                this.playKick();
            }

            this.step++;
        }, stepTime);
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    playKick() {
        if (this.muted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch(e) {}
    }

    playSnare() {
        if (this.muted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.06;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            noise.connect(gain);
            gain.connect(this.masterGain);
            noise.start(now);
        } catch(e) {}
    }
}

window.soundManager = new SoundManager();
