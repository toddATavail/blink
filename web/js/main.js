

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
    this.executor.setProgram("deviceOn(() => { alert('starting!'); console.log(this); });");
    this.executor.turnOn();
    console.info(this.executor);

    this.addEventListener("dragEnd", () => {
        const hexTarget = snapgrid.nearestHex(this.position);
        // console.log(hexTarget);
        const snapTarget = snapgrid.toPosition(hexTarget);
        // console.log(snapTarget);
        this.position.x = snapTarget.x;
        this.position.y = snapTarget.y;
        console.log(this.position);
    });
}

Blink.prototype = Object.assign( Object.create(THREE.Group.prototype), {
    constructor: Blink,
    selectForDrag: function () {
        this.add(this.outline);
    },
    unselectForDrag: function () {
        this.remove(this.outline);
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

var options = {
    resetCamera: cameraControls.reset,
}

function initGUI () {
    console.log(blinks[0]);
        var gui = new dat.GUI({width: 512});
        gui.add(ambient, 'intensity').min(0).max(1);
        gui.add(options, 'resetCamera');
        gui.addColor(blinks[0], 'color');
};

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
};
window.addEventListener( 'resize', onWindowResize, false );


var render = function () {
    requestAnimationFrame( render );
    renderer.render(scene, camera);
};

render();
initGUI();