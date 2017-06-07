var droidFont = null;
var loader = new THREE.FontLoader();
loader.load(
    'node_modules/three/examples/fonts/droid/droid_sans_mono_regular.typeface.json',
    (font) => droidFont = font
);

function createBlinkGeometry(side, thickness, bevel) {
    thickness = thickness || (side / 4);
    bevel = bevel || 0.1;
    var r = side - bevel;
    var shape = new THREE.Shape();
    var angle = Math.PI / 3;
    shape.moveTo(Math.cos(0) * r, Math.sin(0) * r);
    shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    shape.lineTo(Math.cos(2 * angle) * r, Math.sin(2 * angle) * r);
    shape.lineTo(Math.cos(3 * angle) * r, Math.sin(3 * angle) * r);
    shape.lineTo(Math.cos(4 * angle) * r, Math.sin(4 * angle) * r);
    shape.lineTo(Math.cos(5 * angle) * r, Math.sin(5 * angle) * r);
    shape.lineTo(Math.cos(0) * r, Math.sin(0) * r);
    return new THREE.ExtrudeGeometry(
        shape,
        {
            steps: 1,
            amount: thickness,
            bevelEnabled: true,
            bevelThickness: bevel / 2,
            bevelSize: bevel,
            bevelSegments: 10
        }
    );
}
const NO_PROGRAM_WARNING = "this.log('no program set!');";
function Blink(sideLength, snapgrid, initVector, initProgram) {
    THREE.Group.call(this);
    const hexGeometry = createBlinkGeometry(sideLength);
    const hexMaterial = new THREE.MeshPhongMaterial({ color: 0x999999 });
    this.primaryMesh = new THREE.Mesh(hexGeometry, hexMaterial);
    this.primaryMesh.dragParent = true;

    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.BackSide });
    this.outline = new THREE.Mesh(hexGeometry, outlineMaterial);
    this.outline.scale.multiplyScalar(1.05);

    this.light = new THREE.PointLight(0xffffff, 0.5, 0, 2);
    this.light.position.z = 1;

    this.snapgrid = snapgrid;
    if (initVector) {
        this.hex = initVector.clone();
    } else {
        this.hex = new THREE.Vector2(0, 0);
    }
    this.addToHexGrid();
    this.moveToHex();

    this.add(this.primaryMesh);
    this.add(this.light);

    this.stateDebugText;
    this.debugTextActivated = false;

    initProgram = initProgram || NO_PROGRAM_WARNING;
    this.resetProgram(initProgram);

    this.addEventListener("dragSelect", () => {
        this.add(this.outline);
    });
    this.addEventListener("dragUnselect", () => {
        this.remove(this.outline);
    });

    this.clickCount = 0;
    this.clickTimer = null;
    this.addEventListener("click", (clickEvent) => {
        if (this.clickTimer !== null) {
            clearTimeout(this.clickTimer);
        }
        if (clickEvent.duration > options.longHoldDuration) {
            this.executor.dispatch({ type: "longClick" });
            return;
        }

        this.clickCount += 1;
        this.clickTimer = setTimeout(() => {
            this.executor.dispatch(this.clickEvent());
            this.clickCount = 0;
            this.clickTimer = null;
        }, options.multiClickThreshold);
    });

    this.neighbors = this.snapgrid.neighbors(this.hex);
    this.neighborWindow = 100; // move to options!

    this.neighborsToAdd = [];
    this.neighborAddTimer = null;
    this.addEventListener("neighborAdded", (neighborEvent) => {
        if (this.neighborAddTimer !== null) {
            clearTimeout(this.neighborAddTimer);
        }
        this.neighborsToAdd.push(neighborEvent.object);
        // console.log(this.neighborsToAdd);
        this.neighborAddTimer = setTimeout(() => {
            const added = this.neighborsToAdd.filter(
                n => this.neighbors.indexOf(n) === -1);
            if (added.length > 0) {
                this.executor.dispatch({
                    type: "joinNeighbors",
                    added: added,
                    contexts: added.map(a => a.executor),
                    count: added.length
                });
            }
            this.neighbors = this.neighbors.concat(added);
            this.neighborAddTimer = null;
            this.neighborsToAdd = [];      
        }, this.neightborWindow);
    });

    this.neighborsToRemove = [];
    this.neighborRemoveTimer = null;
    this.addEventListener("neighborRemoved", (neighborEvent) => {
        if (this.neighborRemoveTimer !== null) {
            clearTimeout(this.neighborRemoveTimer);
        }
        this.neighborsToRemove.push(neighborEvent.object);
        this.neighborRemoveTimer = setTimeout(() => {
            const removed = this.neighborsToRemove.filter(
                n => this.neighbors.indexOf(n) > -1);
            // console.info("to remove:", this.neighborsToRemove);
            // console.info("neighbors:", this.neighbors);
            // console.info("intersect", removed);
            if (removed.length > 0) {
                this.executor.dispatch({
                    type: "leaveNeighbors",
                    removed: removed,
                    contexts: removed.map(r => r.executor),
                    count: removed.length
                });
                if (removed.length === this.neighbors.length) {
                    this.executor.dispatch({
                        type: "isolated",
                        removed: removed,
                        count: removed.length
                    });
                }
            }
            this.neighbors = this.neighbors.filter(n => removed.indexOf(n) === -1);
            this.neighborRemoveTimer = null;
            this.neighborsToRemove = [];
        }, this.neightborWindow);
    });

    this.addEventListener("dragStart", (dragStartEvent) => {
        // console.info("dragStart", dragStartEvent);
        this.snapgrid.neighbors(this.hex).forEach(n => {
            // console.log("dragstart neighbor", n, dragStartEvent.selected.indexOf(n));
            if (dragStartEvent.selected.indexOf(n) === -1) {
                n.dispatchEvent({type: "neighborRemoved", object: this});
                this.dispatchEvent({type: "neighborRemoved", object: n});
            }
        }) 
    });
    this.addEventListener("drag", (dragEvent) => {
        this.position.copy(dragEvent.position);
        this.position.z = 0.2;
    });
    this.addEventListener("dragEnd", () => {
        const hexTarget = snapgrid.nearestHex(this.position);
        this.setHex(hexTarget);
        this.moveToHex();
    });

    this.executor.addEventListener("stateChange", (e) => {
        if (options.debugTextActivated) {
            this.writeDebugText(e.value);
        }
    })
}

Blink.prototype = Object.assign(Object.create(THREE.Group.prototype), {
    constructor: Blink,
    clickEvent: function () {
        switch (this.clickCount) {
            case 0:
                throw new Error("Click event with 0 clicks!");
            case 1:
                return { type: "singleClick" };
            case 2:
                return { type: "doubleClick" };
            case 3:
                return { type: "tripleClick" };
            default:
                return { type: "multiClick", count: this.clickCount };
        }
    },
    render: function () {
        if (this.executor.light instanceof LightInterface) {
            // this.light.color = this.executor.light.color;
            this.primaryMesh.material.color =
                this.executor.light.color.clone().multiplyScalar(0.6);
        }
    },
    writeDebugText: function (msg) {
        if (droidFont === null) {
            console.warn("Font not yet ready for text", msg);
            return;
        }
        this.clearDebugText();
        var debugTextGeometry = new THREE.TextGeometry(msg, {
            font: droidFont,
            size: 0.2,
            height: 0.1
        });
        this.stateDebugText = new THREE.Mesh(debugTextGeometry, new THREE.MeshBasicMaterial());
        this.stateDebugText.position.z = 0.25;
        debugTextGeometry.computeBoundingBox();
        var textWidth = debugTextGeometry.boundingBox.max.x - debugTextGeometry.boundingBox.min.x
        this.stateDebugText.position.x -= textWidth / 2;
        this.stateDebugText.position.y = -0.1;
        this.add(this.stateDebugText);
    },
    clearDebugText: function () {
        this.remove(this.stateDebugText);
        this.stateDebugText = null;
    },
    setHex: function (vector) {
        this.snapgrid.remove(this.hex, this);
        this.hex.copy(vector);
        this.addToHexGrid();
    },
    addToHexGrid: function () {
        this.snapgrid.set(this.hex, this);
        this.snapgrid.neighbors(this.hex).forEach(n => {
            n.dispatchEvent({type: "neighborAdded", object: this});
            this.dispatchEvent({type: "neighborAdded", object: n});
        });
    },
    moveToHex: function (vector) {
        if (!vector)
        {
            vector = this.hex;
        }
        const target = this.snapgrid.toPosition(vector);
        this.position.x = target.x;
        this.position.y = target.y;
        this.position.z = 0;
    },
    uniqueID: function () {
        return this.executor.uniqueID;
    },
    gridNeighbors: function () {
        return this.snapgrid.neighbors(this.hex);
    },
    neighborSanityCheck: function () {
        console.info(
            this.uniqueID() + " has neighbors:",
            this.neighbors.map(n => n.uniqueID())
        );
    },
    clearEvents: function () {
        [
            this.neighborAddTimer,
            this.neighborRemoveTimer,
            this.clickTimer
        ].forEach(t => {
            if (t !== null) {
                clearTimeout(t);
            }
        });
    },
    resetProgram: function (newProgram) {
        if (newProgram) {
            this.currentProgram = newProgram;
        }
        this.executor = new BlinkExecutor(this);
        this.executor.setProgram(this.currentProgram);
        this.executor.turnOn();
    }
});
