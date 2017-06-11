publicStates(['init', 'alone', 'friends']);
const teamColor = () => {
    if (this.team === 0) {
        return 0xbb3300;
    }
    return 0x0033bb;
}
onBoot(() => {
    this.state = 'init';
    this.team = 0;
    this.light.color = teamColor();
})
onDoubleClick(() => { 
    this.team = (this.team + 1) % 2;
    this.log("changing to team " + this.team);
    this.light.color = teamColor();
});
whenIsolated(() => {
    this.state = 'alone';
    this.light.color = 0x888888;
});
whenNeighborsJoined((nbrs) => {
    if (this.state === 'alone') {
        this.state = 'friends';
    }
    let alone = nbrs.filter(n => n.state === 'alone');
    if (alone.length > 0) {
        this.state = 'friends';
        this.team = alone[0].team; // THIS IS ILLEGAL IN GENERATED CODE
    }
    this.light.color = teamColor();
});
