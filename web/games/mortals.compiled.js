/*
 * Mortals.js
 * Copyright (c) Todd L Smith and Taylor DH Smith, 2017.
 * All rights reserved.
 */

/*
 * Here is an example of generated JS code for the "Mortals" mock-up. Obviously
 * the comments wouldn't be generated.
 */

publicStates(["active", "inactive", "dead"]);
rangedInteger("team", 1, 2);
signal("initialize");
signal("set team color");
onBoot(() =>
{
	now("initialize");
});
to("initialize", () =>
{
	this.team = 1;
	this.light.mode = Light.modes.constant;
	this.state = "dead";
	now("set team color");
});
signal("change sides");
onLongClick(() =>
{
	now("change sides");
});
onDoubleClick(() =>
{
	now("change sides");
});
to("change sides", () =>
{
	this.team = this.team + 1;
	now("set team color");
});
to("set team color", () =>
{
	this.light.color = this.state === "inactive"
		? (() =>
		{
			return this.team === 1
				? (() =>
				{
					return 65280;
				})()
				: (() =>
				{
					return 16711935;
				})()
		})()
		: (() =>
		{
			return this.team === 1
				? (() =>
				{
					return 25600
				})()
				: (() =>
				{
					return 9109643
				})()
		})();
});
timer("lifetime");
signal("begin play");
onTripleClick(() =>
{
	now("begin play");
});
whenNeighborStateChanges("dead", "inactive", neighbors =>
{
	now("begin play");
});
to("begin play", () =>
{
	this.state = "inactive";
	this.lifetime = 60000 * Time.MILLISECOND;
	this.light.mode = Light.modes.pulsing;
	this.light.interpolation = Interpolation.sinusoidal;
	this.light.frequency = 2000 * Time.MILLISECOND;
	now("set team color");
});
whenIsolated(() =>
{
	if (this.state === "inactive")
	{
		this.state = "active";
		this.light.color = 16777215;
	};
});
whenNeighborsJoined(neighbors =>
{
	if (this.state === "inactive" && neighbors.filter(n =>
	{
		n.state === "active"
	}).length !== 0)
	{
		this.lifetime = this.lifetime + - 5000 * Time.MILLISECOND;
	};
	if (this.state === "active")
	{
		this.lifetime = this.lifetime + 5000 * Time.MILLISECOND * neighbors.filter(n =>
		{
			n.state === "inactive"
		}).length;
		this.state = "inactive";
		now("set team color");
	};
});
whenTimerThreshold("lifetime", 30000 * Time.MILLISECOND, () =>
{
	this.light.frequency = 1000 * Time.MILLISECOND;
});
whenTimerThreshold("lifetime", 10000 * Time.MILLISECOND, () =>
{
	this.light.frequency = 500 * Time.MILLISECOND;
});
whenTimerExpires("lifetime", () =>
{
	this.state = "dead";
	this.light.mode = Light.modes.constant;
	now("set team color");
});
