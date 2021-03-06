var options = {
    multiClickThreshold: 500,
    longHoldDuration: 1000,
    debugTextActivated: true
};

Number.prototype.mod = function (n) {
    return ((this % n) + n) % n;
}

const Arrangements = {
    TwoByOne: function (i) {
        return new THREE.Vector2(
            Math.floor(j/3) * -1,
            (j.mod(3)) + 2*Math.floor(j/3) - 1
        );
    }
}

function HexCoordinates (side) {
    side = side || 1;
    this.v_y = Math.sqrt(3) * side;
    this.ne_y = this.v_y / 2;
    this.ne_x = 3 * side / 2;
    this.slots = {};
}
HexCoordinates.prototype = {
    constructor: HexCoordinates,
    toPosition : function (vector) {
        const v = vector.x;
        const ne = vector.y;
        return new THREE.Vector2(ne * this.ne_x, v * this.v_y + ne * this.ne_y )
    },
    fromPosition : function (vector) {
        const ne = vector.x / this.ne_x;
        const y = vector.y - ne * this.ne_y;
        const v = y / this.v_y;
        return new THREE.Vector2(v, ne);
    },
    nearestHex : function (vector) {
        const hex = this.fromPosition(vector);
        const v = hex.x;
        const ne = hex.y;
        const possibles = [
            new THREE.Vector2(Math.floor(v), Math.floor(ne)),
            new THREE.Vector2(Math.floor(v), Math.ceil(ne)),
            new THREE.Vector2(Math.ceil(v),  Math.floor(ne)),
            new THREE.Vector2(Math.ceil(v),  Math.ceil(ne))
        ];
        const distanceTo = possibles.map(
            (hex) => truncateToXY(vector).distanceTo(this.toPosition(hex))
        );
        const i = distanceTo.indexOf(Math.min(...distanceTo));
        return possibles[i];
    },
    getIndex: function (vector) {
        return vector.x + ":" + vector.y;
    },
    set: function (vector, item) {
        this.slots[this.getIndex(vector)] = item;
    },
    get: function (vector) {
        return this.slots[this.getIndex(vector)];
    },
    remove: function (vector, compare) {
        var i = this.getIndex(vector);
        var result = this.slots[i];
        if (compare && compare !== result) {
            return;
        }
        delete this.slots[i];
        return result;
    },
    move: function (vector1, vector2) {
        this.set(vector2, this.remove(vector1));
    },
    neighborhood: [
        new THREE.Vector2(-1, 0),
        new THREE.Vector2(-1, 1),
        new THREE.Vector2(0, -1),
        new THREE.Vector2(0, 1),
        new THREE.Vector2(1, -1),
        new THREE.Vector2(1, 0)
    ],
    neighbors: function (vector) {
        const neighborVectors =
            this.neighborhood.map(v => vector.clone().add(v));
        return neighborVectors.map(n => this.get(n)).filter(n => !!n);
    }
}

function truncateToXY (vector) {
    if (vector instanceof THREE.Vector2)
    {
        return vector;
    }
    if (!(vector instanceof THREE.Vector3) && !(vector instanceof THREE.Vector4))
    {
        console.error(vector);
        throw new Error("Can only truncate Vector3 or Vector4");
    }
    return new THREE.Vector2(vector.x, vector.y);
}


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 ); // FOV, aspect, near plane, far plane
camera.position.z = 8;

var axisHelper = new THREE.AxisHelper( 1 );
scene.add( axisHelper );


var renderer = new THREE.WebGLRenderer();
renderer.setClearColor( 0xf0f0f0 );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
cameraControls.mouseButtons =  { ORBIT: THREE.MOUSE.RIGHT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.LEFT };

var blinks = [];

var hexgrid = new HexCoordinates(1);

for (let i = 0; i < 6; i++) {
    var j = i - 1; 
    var hex = Arrangements.TwoByOne(j);
    console.log(hex);
    var blink = new Blink(1, hexgrid, hex);
    scene.add( blink );
    blinks.push( blink );
}

var helper = new THREE.GridHelper( 20, 20 );
helper.rotateX( - Math.PI / 2);
helper.material.opacity = 0.25;
helper.material.transparent = true;
scene.add( helper );
var draggingPlane = new THREE.Plane();
draggingPlane.setComponents(0, 0, 1, 0);

const dragTargets = blinks.map(b => b.primaryMesh);
var dragControls = new dragGroup(blinks.map(b => b.primaryMesh), draggingPlane, camera, renderer.domElement, cameraControls, hexgrid);

var ambient = new THREE.AmbientLight(0xf0f0f0, 0)
scene.add( ambient );

Object.assign(options, {
    resetCamera: cameraControls.reset,
});


var programLoader = new THREE.FileLoader();
function initProgram  (program) {
    if (!program) {
        return console.error("Blank program!");
    }
    console.log("Loaded program. Start:", program.substring(0, 20));
    blinks.forEach(b => b.resetProgram(program));
}
var lastCustomProgram = "throw new Error('No custom program entered');";

const guiHelpers = {
    resetProgram: () => blinks.forEach(b => b.resetProgram()),
    loadProgramFile: (file) => {
        if (file === "") {
            return initProgram(lastCustomProgram);
        }
        programLoader.load(
            file + "?" + Math.floor(Math.random()*10000),
            (program) => initProgram(program)
        );
    },
    currentProgram: "games/mortals.handwritten.js",
    programNames: {
        "Mortals v2 (handwritten)": "games/mortals.handwritten.js",
        "Mortals v2 (compiled)": "games/mortals.compiled.js",
        "Toy - Infect": "games/toy_infect.js",
        "Toy - Colors": "games/toy_random_colors.js",
        "last custom program": ""
    },
    loadProgramString: () => {
        lastCustomProgram = prompt("Paste program code in the textbox below:");
        initProgram(lastCustomProgram);
    }
}

guiHelpers.loadProgramFile(guiHelpers.currentProgram);

function initGUI () {
    var gui = new dat.GUI({width: 512});
    gui.add(ambient, 'intensity').min(0).max(1).name("Ambient light level");
    gui.add(options, 'resetCamera').name("Reset camera position");
    gui.add(options, "longHoldDuration").min(0).max(2000).name("Duration of long click (ms)");
    gui.add(options, "multiClickThreshold").min(0).max(1000).name("Max double-/triple-click spacing (ms)");
    gui.add(options, "debugTextActivated")
        .name("Display blink state names?")
        .onFinishChange(function (textActive) {
            if (textActive) {
                blinks.forEach(blink => blink.writeDebugText(blink.executor.state));
            } else {
                blinks.forEach(blink => blink.clearDebugText());
            }
        });
    
    gui.add(guiHelpers, "resetProgram").name("Reset all blink state");
    gui.add(guiHelpers, "currentProgram", guiHelpers.programNames)
        .onFinishChange(file => guiHelpers.loadProgramFile(file));
    gui.add(guiHelpers, "loadProgramString").name("Load custom program...");
};

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
};
window.addEventListener( 'resize', onWindowResize, false );

let renderErrorCount = 0;
const RENDER_ERROR_MAX = 100;
var render = function () {
    try {
        blinks.forEach(blink => blink.render());
        renderer.render(scene, camera);
    } catch (e) {
        console.error(e);
        renderErrorCount++;
    }

    if (renderErrorCount >= RENDER_ERROR_MAX) {
        console.error("Maximum render failures reached, aborting app!");
    } else {
        requestAnimationFrame( render );
    }
};

render();
initGUI();