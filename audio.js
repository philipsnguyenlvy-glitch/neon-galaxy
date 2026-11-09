// Sound Synthesizer via Web Audio API
class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playLaser(level = 1) {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = level >= 3 ? 'sawtooth' : 'triangle';
            const baseFreq = 850 + level * 80;
            osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);

            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch (e) {}
    }

    playEnemyLaser() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(450, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.18);

            gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.18);
        } catch (e) {}
    }

    playExplosion(intensity = 1) {
        if (this.muted || !this.ctx) return;
        try {
            const bufferSize = this.ctx.sampleRate * (0.2 + intensity * 0.15);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400 * intensity, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + (0.2 + intensity * 0.15));

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.25 * Math.min(intensity, 1.5), this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (0.2 + intensity * 0.15));

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
            noise.stop(this.ctx.currentTime + (0.2 + intensity * 0.15));
        } catch (e) {}
    }

    playPowerup() {
        if (this.muted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const notes = [330, 440, 550, 660, 880];
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.05);

                gain.gain.setValueAtTime(0.12, now + idx * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.1);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + idx * 0.05);
                osc.stop(now + idx * 0.05 + 0.1);
            });
        } catch (e) {}
    }

    playHit() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(150, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        } catch (e) {}
    }

    playBomb() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.8);

            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.8);

            this.playExplosion(2.5);
        } catch (e) {}
    }

    playBossAlert() {
        if (this.muted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            [0, 0.25, 0.5].forEach(delay => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(600, now + delay);
                osc.frequency.linearRampToValueAtTime(300, now + delay + 0.2);

                gain.gain.setValueAtTime(0.2, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + delay);
                osc.stop(now + delay + 0.2);
            });
        } catch (e) {}
    }
}

const sounds = new SoundManager();
