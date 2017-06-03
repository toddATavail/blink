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
timer("lifetime");

// Signal names are registered, to provide validation.
signals(["initialize", "change sides", "play begins"]);

deviceOn(() => { signal("initialize"); });
when("initialize", () => {
	this.team = 1;
	this.light.mode = Light.modes.constant;
	this.light.color = Color.GREEN;
	this.light.opacity = 1.0;
	this.state = "dead";
});

onLongClick("change sides");
when("change sides", () => {
	// Modular arithmetic is implemented here by overriding property getters and
	// setters. So the fused assignment restricts the value to lie in [1,2].
    this.team += 1;
    this.light.color = (this.team === 1) ? Color.GREEN : Color.PURPLE;
});

onTripleClick("play begins");
onNeighborStateTransition("dead", "inactive", (neighbors) => {
	signal("play begins");
});

when("play begins", () => {
    this.state = "inactive";
    this.lifetime = 60 * Time.SECOND;
    this.light.mode = Light.modes.pulsing;
    this.light.interpolation = Interpolation.sinusoidal;
    this.light.frequency = 2 * Time.SECOND;
});

onIsolated(() => {
    this.state = "active";
});

onJoinNeighbors((neighbors) => {
	this.lifetime = this.lifetime + (
		neighbors.any(n => n.state === "active")
			? (-(5 * Time.SECOND))
			: ((this.state === "active")
				? (5 * neighbors.length * Time.SECOND)
				: (0 * Time.SECOND)));
});

whenTimerThreshold("lifetime", 10 * Time.SECOND, () => {
    this.light.frequency = 0.5 * Time.SECOND;
});

// probably just an alias for whenTimer(name, 0, fn)
whenTimerExpires("lifetime", () => {
    this.light.mode = Light.modes.constant;
    this.light.color = Color.GRAY;
});