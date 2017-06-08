function LightInterface () {
    // this._value = new THREE.Color(0xffffff);
    this.color = new THREE.Color(0xffffff);
}
LightInterface.prototype = {
    constructor: LightInterface
}

const Color = {
    GREEN: new THREE.Color("green"),
    NEON_GREEN: new THREE.Color(0x00ff00),
    PURPLE: new THREE.Color("purple"),
    RED: new THREE.Color("red"),
    WHITE: new THREE.Color("white"),
    GRAY: new THREE.Color("gray"),
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