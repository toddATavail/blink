function LightInterface () {
    // this._value = new THREE.Color(0xffffff);
    this.color = 0xffffff;
}
LightInterface.prototype = {
    constructor: LightInterface
}

const Color = {
    WHITE: 0xffffff
}

const Light = {
    modes: {
        constant: function (time) {
            return this.colorCycle[0];
        }
    }
}

const Interpolation = {
    sinusoidal: function (start, end, alpha) {
        return ((Math.cos(2 * alpha / Math.PI) + 1) / 2) * (start - end) + end;   
    },
    linear: function (start, end, alpha) {
        return start + alpha * (end - start);
    }
}