function LightInterface () {
    this.colorCycle = [new THREE.Color(0xffffff)];
    Object.defineProperty(this, "color", {
        get: () => {
            throw new Error("Cannot query color");
        },
        set: (hex) => {
            this.colorCycle = [new THREE.Color(hex)];
        }
    })
    this.frequency = 1000; // 1s
    this.mode = Light.modes.raw;
    this.colorSpace = Color.RGB;
    this.interpolation = Interpolation.flashing;
}
LightInterface.prototype = {
    constructor: LightInterface,
    getAlpha: function (time) {
        return (time % this.frequency) / this.frequency;
    },
    modeColors: function () {
        if (typeof this.mode !== "function") {
            console.warn(this.mode);
        }
        return this.mode(this.colorCycle);
    },
    getInterpolatedPair: function (time) {
        let colors = this.modeColors();
        // console.log(colors);
        let i = Math.floor(time / this.frequency) % colors.length;
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
        time = time || Date.now();
        return this.interpolate(target, time);
    }
}

const Color = {
    WHITE: 0xffffff,
    RGB: {
        get: (color) => color.toArray(),
        set: (target, arr) => target.setRGB(arr[0], arr[1], arr[2]),
        create: (arr) => new THREE.Color(arr[0], arr[1], arr[2])
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