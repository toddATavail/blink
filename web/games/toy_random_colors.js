publicStates(["colorful"]);
signal("randomize colors");

to("randomize colors", () => {
    this.state = "colorful";
    this.light.color = Math.ceil(Math.random() * 0xffffff);
});

onBoot(just("randomize colors"));
onDoubleClick(just("randomize colors"));
