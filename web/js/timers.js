
function BlinkTimer () {
    this.value = 0;
    this.running = false;
    this.thresholds = [];
    this.runNewExpiredCallbacks = false;
    this.runBypassedCallbacks = true;
}

BlinkTimer.prototype = {
    set: function (value) {
        // console.log("updating timer", this, value);
        this.value = value;
        this.running = value > 0;
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

        if (this.running) {
            if (this.runNewExpiredCallbacks && time > this.value) {
                callback();
            } else {
                this.scheduleThreshold(threshold);
            }
        }
    },
    scheduleThreshold: function (threshold, last) {
        threshold.timer = setTimeout(() => {
            threshold.timer = null;
            threshold.callback();
            if (this.thresholds.indexOf(threshold) === this.thresholds.length - 1) {
                this.running = false;
            }
        }, this.value - threshold.time);
    },
    clear: function () {
        while (this.thresholds.length) {
            let removed = this.thresholds.pop();
            if (removed.timer !== null) {
                clearTimeout(removed.timer);
            }
        }
    }
}

const Time = {
    MILLISECOND: 1,
    SECOND: 1000,
    MINUTE: 60 * 1000
}