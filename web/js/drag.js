"use strict";

const DragState = {
    None: 0,
    FreePlay: 1,
    Drag: 2
}

const FREE_PLAY_THRESHOLD = 0.05;

function dragGroup(_targets, _plane, _camera, _domElement, _cameraControls, _grid) {
    var state = DragState.None;
    var selected = [];
    var anchor;
    var moveTarget;
    var delta;

    var dragStartPosition;
    var dragStartTime;
    var cachedCameraState;
    // var enabled = true;
    
	var mouse = new THREE.Vector2();
    function updateMouse (event) {
        var rect = _domElement.getBoundingClientRect();
		mouse.x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
		mouse.y = - ( (event.clientY - rect.top) / rect.height ) * 2 + 1;
    }

    var raycaster = new THREE.Raycaster();

    function deselectAll () {
        selected.forEach(s => s.object.dispatchEvent({type: "dragUnselect"}));
        selected = [];
    }

    function select (target) {
        selected.push({
            object: target,
            initial: target.position.clone()
        });
        target.dispatchEvent({type: "dragSelect"});
    }

    function onDocumentMouseDown(event) {
        event.preventDefault();
        updateMouse(event);
        raycaster.setFromCamera(mouse, _camera);
        const intersectedObjects = raycaster.intersectObjects(_targets);

        if (intersectedObjects.length > 0) {
            var dragTarget = intersectedObjects[0].object;
            while (dragTarget.dragParent && dragTarget.parent) {
                dragTarget = dragTarget.parent;
            }
            anchor = dragTarget;

            var alreadySelected = !!selected.find(o => (o.object === dragTarget));
            if (event.shiftKey) {
                if (!alreadySelected) {
                    select(dragTarget);
                }
            } else { // no shift key
                if (!alreadySelected) {
                    deselectAll();
                    select(dragTarget);            
                }
                state = DragState.FreePlay;
                dragStartPosition = raycaster.ray.intersectPlane(_plane);
                dragStartTime = Date.now();
            }
            cachedCameraState = _cameraControls.enabled;
            _cameraControls.enabled = false;
        } else { // no intersected blink
            deselectAll();
        }
    }
    function onDocumentMouseMove(event) {
        if (state === DragState.None)
        {
            return;
        }
        updateMouse(event);
        raycaster.setFromCamera(mouse, _camera);
        moveTarget = raycaster.ray.intersectPlane(_plane);
        delta = moveTarget.sub(dragStartPosition);
        if (state === DragState.FreePlay) {
            if (delta.length() > FREE_PLAY_THRESHOLD) {
                state = DragState.Drag;
                selected.forEach(s => {
                    s.object.dispatchEvent({type: "dragStart", selected: selected});
                });
            }
        }
        if (state === DragState.Drag) {
            selected.forEach(s => {
                s.object.dispatchEvent({type: "drag", position: s.initial.clone().add(delta)});
            });
        }
    }
    function onDocumentKeyDown(event) {
        // console.log(event);
        if (state === DragState.Drag) {
            if (event.key === "q" || event.key === "PageUp") {
                // CCW
                selected.forEach(s => {
                    let fromAnchor = s.object.hex.clone().sub(anchor.hex);
                    let rotation = new THREE.Vector2(fromAnchor.y, - fromAnchor.x-fromAnchor.y);
                    s.object.hex.add(rotation);
                    s.initial.add(_grid.toPosition(rotation));
                    s.object.dispatchEvent({type: "drag", position: s.initial.clone().add(delta)});
                });
            } else if (event.key === "e" || event.key === "PageDown") {
                // CW
                selected.forEach(s => {
                    let fromAnchor = s.object.hex.clone().sub(anchor.hex);
                    let rotation = new THREE.Vector2(-fromAnchor.x - fromAnchor.y, fromAnchor.x);
                    s.object.setHex(s.object.hex.clone().add(rotation));
                    s.initial.add(_grid.toPosition(rotation));
                    s.object.dispatchEvent({type: "drag", position: s.initial.clone().add(delta)});
                });
            }
        }
    }
    function onDocumentMouseUp(event) {
        event.preventDefault();
        if (state === DragState.FreePlay) {
            selected.forEach(s => s.object.dispatchEvent(
                {type: "click", duration: (Date.now() - dragStartTime)}
            ));
        } else if (state === DragState.Drag) {
            selected.forEach(s => s.object.dispatchEvent({type: "dragEnd"}));
            deselectAll();
        }
        state = DragState.None;
        anchor = null;
        _cameraControls.enabled = cachedCameraState;
    }

    _domElement.addEventListener('mousemove', onDocumentMouseMove, false);
    _domElement.addEventListener('mousedown', onDocumentMouseDown, false );
    _domElement.addEventListener('mouseup', onDocumentMouseUp, false );
    window.addEventListener('keydown', onDocumentKeyDown, true );
}
