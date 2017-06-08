function randomID() {
    return Math.random().toString(36).substring(2, 12);
}

var globalID = 0;
function issueID() {
    return globalID++;
}

function BlinkExecutor(blink, initialProgram) {
    this.blink = blink;
    this.on = false;
    this.uniqueID = issueID();
    this._logEvents = true;

    this._allowedStates = [];
    Object.defineProperty(this, "state", {
        set: (state) => {
            if (this._allowedStates.indexOf(state) === -1) {
                throw new Error("State " + state + " not one of the predefined states!");
            }
            if (state !== this._state) {
                let previous = this._state;
                this._state = state;
                this.dispatch({ type: "stateChange", current: state, previous: previous });
            }
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

    this._timers = new Map();

    this.light = new LightInterface();

    if (initialProgram) {
        this.setProgram(initialProgram);
    }
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
            this.on = true;
            this.dispatch({ type: "deviceOn" });
        }
    },
    restart: function () {
        this.turnOn(true);
    },
    dispatch: function (event) {
        if (!this.on) {
            return;
        }
        if (this._logEvents) {
            console.log("[Device " + this.uniqueID + " event]", event);
        }
        this.dispatchEvent(event);
    },
    signalDispatcher: function (signal) {
        return () => this.dispatch({ type: "signal", name: signal });
    },
    setProgram: function (program) {
        // note that API functions must be anonymous functions here to bind correctly
        const now =
            (signalName) => this.dispatch({ type: "signal", name: signalName });
        const just =
            (signalName) => () => now(signalName);
        const signal = signalName => this._signalHandlers.set(signalName, null);
        const signals = (signalNames) => signalNames.forEach(signal);
        const to = (signalName, callback) => {
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
        const whenTimerExpires =
            (timerName, callback) => whenTimerThreshold(timerName, 0, callback);

        // ==== HARDWARE EVENT HANDLERS ====
        const onBoot = (cb) => this.addEventListener("deviceOn", cb);
        // onButtonPress
        // onButtonRelease
        // onClick
        const onSingleClick = (cb) => this.addEventListener("singleClick", cb);
        const onDoubleClick = (cb) => this.addEventListener("doubleClick", cb);
        const onTripleClick = (cb) => this.addEventListener("tripleClick", cb);
        // onMultiClick
        const onLongClick = (cb) => this.addEventListener("longClick", cb);

        // whenHeartBeats
        const whenNeighborsJoined = (cb) =>
            this.addEventListener("joinNeighbors",
                (event) => cb(event.contexts));
        // whenNeighborsRemoved
        const whenIsolated = (cb) =>
            this.addEventListener("isolated", cb);
        // whenSurrounded
        // whenStateChanges
        const whenNeighborStateChanges = (previous, current, cb) => {
            this.addEventListener("neighborStateChange", e => {
                if (e.previous === previous && e.current === current) {
                    cb(e.object);
                }
            });
        };

        const rangedInteger = (name, min, max) => {
            var value = min;
            Object.defineProperty(this, name, {
                get: () => value,
                set: (newValue) => {
                    value = (newValue - min) % (max - min + 1) + min;
                },
                configurable: false
            });
        };

        try {
            eval(program); // CAUTION
        } catch (e) {
            console.error("There was an error while attempting to load the program!");
            console.error(e);
        }

        this.validateProgram();
    },
    validateProgram: function () {
        // nothing for now
    }
};

Object.assign(BlinkExecutor.prototype, THREE.EventDispatcher.prototype);