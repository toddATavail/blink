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

deviceOn("initialize");
when("initialize", () => {
	this.team = 1;
	this.light.mode = Light.modes.constant;
	this.state = "dead";
	signal("set team color");
});

onLongClick("change sides");
onDoubleClick("change sides");
when("change sides", () => {
	// Modular arithmetic is implemented here by overriding property getters and
	// setters. So the fused assignment restricts the value to lie in [1,2].
    this.team += 1;
	this.log((this.team === 1) ? "team is now 1" : "team is now 2");
    signal("set team color");
});

when("set team color", () => {
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
onTripleClick("begin play");
onNeighborStateTransition("dead", "inactive", (neighbors) => {
	signal("begin play");
});

when("begin play", () => {
    this.state = "inactive";
    this.lifetime = 60 * Time.SECOND;
	
    this.light.mode = Light.modes.pulsing;
    this.light.interpolation = Interpolation.sinusoidal;
    this.light.frequency = 2 * Time.SECOND;
	signal("set team color");
});

onIsolated(() => {
	if (this.state === "inactive") {
		this.state = "active";
		this.light.color = 0xffffff;
	}
});

onJoinNeighbors((neighbors) => {
	this.lifetime += (neighbors.some(n => n.state === "active")
		? -5 * Time.SECOND
		: (this.state === "active"
			? neighbors.length * 5 * Time.SECOND
			: 0));
	if (this.state === "active") {
		this.state = "inactive";
		signal("set team color");
	}
});

whenTimerThreshold("lifetime", 10 * Time.SECOND, () => {
    this.light.frequency = 0.5 * Time.SECOND;
});

// probably just an alias for whenTimer(name, 0, fn)
whenTimerExpires("lifetime", () => {
	this.state = "dead";
    this.light.mode = Light.modes.constant;
    signal("set team color");
});
