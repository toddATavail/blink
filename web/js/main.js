

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

function Blink (side) {
    this.side = side;
    this.geometry = createBlinkGeometry(side);
    this.material = new THREE.MeshPhongMaterial( { color: 0x999999} );
    this.mesh = new THREE.Mesh( this.geometry, this.material );
    this.mesh.dragParent = true;
    this.light = new THREE.PointLight( 0xffffff, 0.5, 0, 2);
    this.light.position.z = 1;
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.group.add(this.light);

    this.outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.BackSide});
    this.outlineMesh = new THREE.Mesh(this.geometry, this.outlineMaterial);
    this.outlineMesh.scale.multiplyScalar(1.05);

    this.group.material = this.material;

    Object.defineProperty(this.group, "color", {
        get: () => {return this.material.color.getStyle()},
        set: (c) => {console.log(c); this.material.color.setStyle(c)}
    });
    this.group.mesh = this.mesh;

    this.group.selectForDrag = () => this.group.add(this.outlineMesh);
    this.group.unselectForDrag = () =>this.group.remove(this.outlineMesh);
    
    return this.group;
}

function HexCoordinates (side) {
    side = side || 1;
    this.v_y = Math.sqrt(3) * side;
    this.ne_y = this.v_y / 2;
    this.ne_x = 3 * side / 2;
    return {
        toPosition : (v, ne) => new THREE.Vector2(ne * this.ne_x, v * this.v_y + ne * this.ne_y ),
        fromPosition : () => {throw new Error("Unimplemented")}
    }
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

for (let i = 0; i < 4; i++)
{
    // var geometry = createBlinkGeometry(1);
    // var material = new THREE.MeshPhongMaterial( { color: bColors[i]} );
    var blink = new Blink(1);

    var p = hexgrid.toPosition((i > 1) * -1, i);
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

var dragControls = new dragGroup(blinks.map(b => b.mesh), draggingPlane, camera, renderer.domElement, cameraControls);

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