var options = {
    multiClickThreshold: 500,
    longHoldDuration: 1500
};

function createBlinkGeometry (side, thickness, bevel) {
    thickness = thickness || (side / 4);
    bevel = bevel || 0.1;
    var r = side - bevel;
    var shape = new THREE.Shape();
    var angle = Math.PI / 3;
    shape.moveTo( Math.cos(0) * r, Math.sin(0) * r );
    shape.lineTo( Math.cos(angle) * r, Math.sin(angle) * r );
    shape.lineTo( Math.cos(2*angle) * r, Math.sin(2*angle) * r );
    shape.lineTo( Math.cos(3*angle) * r, Math.sin(3*angle) * r );
    shape.lineTo( Math.cos(4*angle) * r, Math.sin(4*angle) * r );
    shape.lineTo( Math.cos(5*angle) * r, Math.sin(5*angle) * r );
    shape.lineTo( Math.cos(0) * r, Math.sin(0) * r );
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

function Blink (sideLength, snapgrid) {
    THREE.Group.call(this);
    const hexGeometry = createBlinkGeometry(sideLength);
    const hexMaterial = new THREE.MeshPhongMaterial( {color: 0x999999} );
    this.hex = new THREE.Mesh( hexGeometry, hexMaterial );
    this.hex.dragParent = true;

    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.BackSide });
    this.outline = new THREE.Mesh( hexGeometry, outlineMaterial );
    this.outline.scale.multiplyScalar(1.05);

    this.light = new THREE.PointLight( 0xffffff, 0.5, 0, 2);
    this.light.position.z = 1;

    this.add(this.hex);
    this.add(this.light);

    this.executor = new BlinkExecutor(this);
    this.executor.setProgram("onDoubleClick(() => { this.light.color = Color.NEON_GREEN; });");
    this.executor.turnOn();
    console.info(this.executor);

    this.addEventListener("dragSelect", () => {
        this.add(this.outline);
    });
    this.addEventListener("dragUnselect", () => {
        this.remove(this.outline);
    });

    this.clickCount = 0;
    this.clickTimer = null;
    this.addEventListener("click", (clickEvent) => {
        this.clickCount += 1;
        if (this.clickTimer) {
            clearTimeout(this.clickTimer);
        }
        if (clickEvent.duration > options.longHoldDuration) {
            this.executor.dispatchEvent({type: "longClick"});
            return;
        }
        this.clickTimer = setTimeout(() => {
            console.log(this.clickCount, this.clickEvent());
            this.executor.dispatchEvent(this.clickEvent());
            this.clickCount = 0;
            this.clickTimer = null;
        }, options.multiClickThreshold);
    });

    this.addEventListener("drag", (dragEvent) => {
        this.position.copy(dragEvent.position);
        this.position.z = 0.2;
    });
    this.addEventListener("dragEnd", () => {
        const hexTarget = snapgrid.nearestHex(this.position);
        const snapTarget = snapgrid.toPosition(hexTarget);

        this.position.x = snapTarget.x;
        this.position.y = snapTarget.y;
        this.position.z = 0;
        // console.log(this.position);
    });
}

Blink.prototype = Object.assign( Object.create(THREE.Group.prototype), {
    constructor: Blink,
    clickEvent: function () {
        switch (this.clickCount) {
            case 0:
                throw new Error("Click event with 0 clicks!");
            case 1:
                return {type: "singleClick"};
            case 2:
                return {type: "doubleClick"};
            case 3:
                return {type: "tripleClick"};
            default:
                return {type: "multiClick", count: this.clickCount};
        }
    },
    render: function () {
        if (this.executor.light instanceof LightInterface)
        {
            // this.light.color = this.executor.light.color;
            this.hex.material.color = this.executor.light.color.clone().multiplyScalar(0.6);
        }
    }
});

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
    remove: function (vector) {
        var i = this.getIndex(vector);
        var result = this.slots[i];
        delete this.slots[i];
        return result;
    },
    move: function (vector1, vector2) {
        this.set(vector2, this.remove(vector1));
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
var bColors = [
    0x4060d0,
    0xd04060,
    0x60d040,
    0xa0a0a0
]

var hexgrid = new HexCoordinates(1);
console.log(hexgrid.nearestHex(new THREE.Vector2(0.2, 0.5)));

for (let i = 0; i < 4; i++)
{
    // var geometry = createBlinkGeometry(1);
    // var material = new THREE.MeshPhongMaterial( { color: bColors[i]} );
    var blink = new Blink(1, hexgrid);

    var p = hexgrid.toPosition(new THREE.Vector2((i > 1) * -1, i));
    blink.position.x = p.x;
    blink.position.y = p.y;
    blink.color = bColors[i];

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

const dragTargets = blinks.map(b => b.hex);
console.info(dragTargets);
var dragControls = new dragGroup(blinks.map(b => b.hex), draggingPlane, camera, renderer.domElement, cameraControls);

var ambient = new THREE.AmbientLight(0xf0f0f0, 0.5)
scene.add( ambient );

Object.assign(options, {
    resetCamera: cameraControls.reset,
});

function initGUI () {
    var gui = new dat.GUI({width: 512});
    gui.add(ambient, 'intensity').min(0).max(1).name("Ambient light level");
    gui.add(options, 'resetCamera').name("Reset camera position");
    gui.add(options, "longHoldDuration").min(0).max(2000).name("Duration of long click (ms)");
    gui.add(options, "multiClickThreshold").min(0).max(1000).name("Max double-/triple-click spacing (ms)");
};

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
};
window.addEventListener( 'resize', onWindowResize, false );


var render = function () {
    requestAnimationFrame( render );
    blinks.forEach(blink => blink.render());
    renderer.render(scene, camera);
};

render();
initGUI();