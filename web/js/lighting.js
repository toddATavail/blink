function LightInterface () {
    this.colorCycle = [new THREE.Color(Color.WHITE)];
    Object.defineProperty(this, "color", {
        get: () => {
            throw new Error("Cannot query color");
        },
        set: (hex) => {
            this.colorCycle = [new THREE.Color(hex)];
            this.resetPhase();
        }
    })
    this.frequency = 1000;

    let mode = Light.modes.raw;
    Object.defineProperty(this, "mode", {
        get: () => mode,
        set: (fn) => {
            mode = fn;
            this.resetPhase();
        }
    });
    this.colorSpace = Color.spaces.RGB;
    this.interpolation = Interpolation.flashing;
    this.resetPhase();
    this.runningTemporaryCycle = false;
    this.temporaryCycle = [];
    this.temporaryTimer = null;
}
LightInterface.prototype = {
    constructor: LightInterface,
    f: function () {
        return (this.runningTemporaryCycle
            ? this.temporaryFrequency
            : this.frequency);
    },
    getAlpha: function (time) {
        let f = this.f();
        return (time % f) / f;
    },
    getCycleCount: function (time) {
        return Math.floor(time / this.f());
    },
    modeColors: function () {
        if (typeof this.mode !== "function") {
            console.warn(this.mode);
        }
        if (this.runningTemporaryCycle) {
            return this.temporaryCycle;
        }
        return this.mode(this.colorCycle);
    },
    resetPhase: function (time) {
        this.patternStart = time || Date.now();
    },
    getInterpolatedPair: function (time) {
        let colors = this.modeColors();
        // console.log(colors);
        let i = this.getCycleCount(time) % colors.length;
        let j = (i + 1) % colors.length;
        return [colors[i], colors[j]];
    },
    interpolate: function (target, time) {
        let pair = this.getInterpolatedPair(time);
        let prev = this.colorSpace.get(pair[0]);
        let next = this.colorSpace.get(pair[1]);
        let interpolated = [];
        for (let i = 0; i < prev.length; i++) {
            interpolated[i] = 
                this.interpolation(prev[i], next[i], this.getAlpha(time));
        }
        return this.colorSpace.set(target, interpolated);
    },
    renderTo: function (target, time) {
        time = (time || Date.now()) - this.patternStart;
        return this.interpolate(target, time);
    },
    pulse: function (hex, frequency, loops) {
        if (this.temporaryTimer !== null) {
            clearTimeout(this.temporaryTimer);
        }
        this.temporaryFrequency = frequency || this.frequency;
        let duration = (loops || 1) * this.temporaryFrequency * 2;
        this.temporaryCycle = [
            this.colorCycle[0],
            new THREE.Color(hex)
        ];
        this.resetPhase();
        this.runningTemporaryCycle = true;
        this.temporaryTimer = setTimeout(() => this.endTemporary(), duration);
    },
    endTemporary: function () {
        this.runningTemporaryCycle = false;
        this.temporaryCycle = [];
        this.resetPhase();
    }
}

const Color = {
    WHITE: 0xffffff,
    spaces: {
        RGB: {
            get: (color) => color.toArray(),
            set: (target, arr) => target.setRGB(arr[0], arr[1], arr[2]),
            create: (arr) => new THREE.Color(arr[0], arr[1], arr[2])
        }
    }
}

const Light = {
    modes: {
        raw: function (cycle) {
            return cycle;
        },
        constant: function (cycle) {
            return cycle.slice(0, 1);
        },
        pulsing: function (cycle) {
            return [cycle[0], cycle[0].clone().multiplyScalar(0.3)];
        }
    }
}

const Interpolation = {
    sinusoidal: function (start, end, alpha) {
        if (start === end) {
            return start;
        }
        return ((Math.sin((alpha - 0.5) * Math.PI) + 1) / 2) * (end - start) + start;   
    },
    linear: function (start, end, alpha) {
        return start + alpha * (end - start);
    },
    flashing: function (start, end, alpha) {
        return start;
    }
}