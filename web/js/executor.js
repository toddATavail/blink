function randomID () {
    return Math.random().toString(36).substring(2,12);
}

function BlinkTimer () {
    this.value = 0;
    this.running = false;
    this.thresholds = [];
    this.runNewExpiredCallbacks = false;
    this.runBypassedCallbacks = true;
}

BlinkTimer.prototype = {
    set: function (value) {
        this.value = value;
        this.thresholds.forEach(threshold => {
            if (threshold.timer !== null) {
                clearTimeout(threshold.timer);
                threshold.timer = null;
                if (value < threshold.time) {
                    if (this.runBypassedCallbacks) {
                        threshold.callback();
                    }
                } else {
                    this.scheduleThreshold(threshold);
                }
            } else if (value > threshold.time) {
                this.scheduleThreshold(threshold);
            }
        });
    },
    at: function (time, callback) {
        var threshold = {time: time, callback: callback, timer: null};
        if (!this.thresholds.length || time < this.thresholds[0].time) {
            this.thresholds.unshift(threshold);
        } else {
            for (let i = 0; i < this.thresholds.length; i++) {
                if (time > this.thresholds[i].time) {
                    break;
                }
            }
            this.thresholds.splice(i, 0, threshold);
        }

        if (this.runNewExpiredCallbacks && time > this.value) {
            callback();
        } else {
            this.scheduleThreshold(threshold);
        }
    },
    scheduleThreshold: function (threshold) {
        threshold.timer = setTimeout(() => {
            threshold.timer = null;
            threshold.callback();
        }, this.value - threshold.time);
    }
}

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
    WHITE: new THREE.Color("white"),
}

function BlinkExecutor (blink, initialProgram) {
    this.blink = blink;
    this.on = false;
    this.uniqueID = randomID();

    this._allowedStates = [];
    Object.defineProperty(this, "state", {
        set: (state) => {
            if (this._allowedStates.indexOf(state) === -1)
            {
                throw new Error("State " + state + " not one of the predefined states!");
            }
            this._state = state;
            this.dispatchEvent({type: "stateChange", value: state});
        },
        get: () => this._state,
        configurable: false
    });

    this._signalHandlers = new Map();
    this.addEventListener("signal", (signal) => {
        if (!this._signalHandlers.has(signal.name)) {
            console.error(signal);
            throw new Error("Unknown signal '" + signal.name + "'");
        }
        this._signalHandlers.get(signal.name)();
    });

    this.light = new LightInterface();
} 

BlinkExecutor.prototype = {
    constructor: BlinkExecutor,
    log: function (msg) {
        console.info("[Device " + this.uniqueID + "]:", msg);
    },
    turnOn: function (force) {
        if (this.on && !force) {
            this.log("Already on. Use restart instead.");
        } else {
            this.log("turning on");
            this.on = true;
            this.dispatchEvent({type: "deviceOn"});
        }
    },
    restart: function () {
        this.turnOn(true);
    },
    
    setProgram: function (program) {
        // note that API functions must be anonymous functions here to bind correctly
        const signal = (signalName) => this.dispatchEvent({type: "signal", name: signalName});
        const signals = (signalNames) =>
            signalNames.forEach(
                signalName => this._signalHandlers.set(signalName, null));
        const when = (signalName, callback) => {
            if (!this._signalHandlers.has(signalName)) {
                throw new Error("Signal name not declared: " + signalName);
            }
            if (this._signalHandlers.get(signalName) !== null) {
                throw new Error("Signal handler already defined: " + signalName);
            }
            this._signalHandlers.set(signalName, callback);
        }

        const publicStates = (stateNames) => this._allowedStates = stateNames;
        const advanceState = () => {
            var i = this._allowedStates.indexOf(this.state);
            i = (i + 1) % this._allowedStates.length;
            this.state = this._allowedStates[i];
        }

        const timer = (timerName) => {
            const mech = new BlinkTimer();
            this._timers.set(timerName, mech);
            Object.defineProperty(this, timerName, {
                get: () => mech.value,
                set: (value) => mech.set(value),
                configurable: false
            });
        };
        const whenTimerThreshold = (timerName, time, callback) => {
            if (!this._timers.has(timerName)) {
                throw new Error("No such timer: " + timerName);
            }
            this._timers.get(timerName).at(time, callback);
        }
        const whenTimerExpires = (timerName, callback) => whenTimerThreshold(timerName, 0, callback);

        const deviceOn = (cb) => this.addEventListener("deviceOn", cb);
        const onSingleClick = (cb) => this.addEventListener("singleClick", cb);
        const onDoubleClick = (cb) => this.addEventListener("doubleClick", cb);
        const onTripleClick = (cb) => this.addEventListener("tripleClick", cb);
        const onLongClick = (cb) => this.addEventListener("longClick", cb);

        const UNIMPL = (name) => (() => console.info(name + "() is not yet implemented!"));
        const rangedInteger = UNIMPL("rangedInteger");
        
        eval(program); // CAUTION

        this.validateProgram();
    },
    validateProgram: function () {
        // nothing for now
    }
};

Object.assign(BlinkExecutor.prototype, THREE.EventDispatcher.prototype);