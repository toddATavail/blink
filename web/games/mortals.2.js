/*
 * Mortals.js
 * Copyright (c) Todd L Smith and Taylor DH Smith, 2017.
 * All rights reserved.
 */

/*
 * Here is an example of generated JS code for the "Mortals" mock-up. Obviously
 * the comments wouldn't be generated.
 */

publicStates(["dead", "active", "inactive"]);
rangedInteger("team", 1, 2);

// Signal names are registered, to provide validation.
signals(["initialize", "change sides", "begin play", "set team color"]);

onBoot(just("initialize"));
to("initialize", () => {
	this.team = 1;
	this.light.mode = Light.modes.constant;
	this.state = "dead";
	now("set team color");
});

onLongClick(just("change sides"));
onDoubleClick(just("change sides"));
to("change sides", () => {
	// Modular arithmetic is implemented here by overriding property getters and
	// setters. So the fused assignment restricts the value to lie in [1,2].
    this.team += 1;
	this.log((this.team === 1) ? "team is now 1" : "team is now 2");
    now("set team color");
});

to("set team color", () => {
	this.light.color = (this.state === "inactive" 
		? ((this.team === 1) 
			? 0x00ff00   // green
			: 0xff00ff)  // magenta
		: ((this.team === 1) 
			? 0x006400   // dark green
			: 0x8B008B)  // dark magenta
	);
});

timer("lifetime");
onTripleClick(just("begin play"));
whenNeighborStateChanges("dead", "inactive", (neighbors) => {
	now("begin play");
});

to("begin play", () => {
    this.state = "inactive";
    this.lifetime = 60 * Time.SECOND;
	
    this.light.mode = Light.modes.pulsing;
    this.light.interpolation = Interpolation.sinusoidal;
    this.light.frequency = 2 * Time.SECOND;
	now("set team color");
});

whenIsolated(() => {
	if (this.state === "inactive") {
		this.state = "active";
		this.light.color = 0xffffff;
	}
});

whenNeighborsJoined((neighbors) => {
    if (this.state === "inactive" && neighbors.some(n => n.state === "active")) {
        this.lifetime += -5 * Time.SECOND;
        this.light.pulse(0x000000, 0.5 * Time.SECOND);
    }
	if (this.state === "active") {
        this.lifetime += 5 * Time.SECOND * neighbors.length;
        let inactiveCount = neighbors.filter(n => n.state === "inactive");
		this.state = "inactive";
		now("set team color");
        if (inactiveCount > 0) {
            this.light.pulse(0xffffff, 0.5 * Time.SECOND);
        }
	}
});

whenTimerThreshold("lifetime", 30 * Time.SECOND, () => {
    this.light.frequency = 1 * Time.SECOND;
});
whenTimerThreshold("lifetime", 10 * Time.SECOND, () => {
    this.light.frequency = 0.5 * Time.SECOND;
});

// probably just an alias for whenTimer(name, 0, fn)
whenTimerExpires("lifetime", () => {
	this.state = "dead";
    this.light.mode = Light.modes.constant;
    now("set team color");
});
