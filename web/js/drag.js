"use strict";

function dragGroup(_targets, _plane, _camera, _domElement, _cameraControls) {
    var dragging = false;
    var draggedObjects = [];
    var intersects = [];
    // var enabled = true;
    var cachedCameraState;
    
	var mouse = new THREE.Vector2();
    function updateMouse (event) {
        var rect = _domElement.getBoundingClientRect();
		mouse.x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
		mouse.y = - ( (event.clientY - rect.top) / rect.height ) * 2 + 1;
    }

    var raycaster = new THREE.Raycaster();

    function onDocumentMouseMove(event) {
        updateMouse(event);
        raycaster.setFromCamera(mouse, _camera);
        if (dragging)
        {
            draggedObjects.forEach((obj) => {
                var moveTarget = raycaster.ray.intersectPlane(_plane);
                if (moveTarget)
                {
                    obj.position.copy(moveTarget);
                }
            });
        }
    }
    function onDocumentMouseDown(event) {
        event.preventDefault();
        raycaster.setFromCamera(mouse, _camera);
        intersects = raycaster.intersectObjects(_targets);
        console.log("found intersections:", intersects);

        if (intersects.length > 0)
        {
            dragging = true;
            var dragTarget = intersects[0].object;
            while (dragTarget.dragParent && dragTarget.parent)
            {
                dragTarget = dragTarget.parent;
            }
            if (event.shiftKey)
            {
                draggedObjects.push(dragTarget);
            }
            else
            {
                draggedObjects.forEach((o) => o.unselectForDrag());
                draggedObjects = [dragTarget];
            }
            dragTarget.selectForDrag();
            cachedCameraState = _cameraControls.enabled;
            _cameraControls.enabled = false;
        }
    }
    function onDocumentMouseUp(event) {
        event.preventDefault();
        dragging = false;
        draggedObjects.forEach(
            obj => obj.dispatchEvent({type: "dragEnd"}));
        // draggedObjects.forEach((o) => o.unselectForDrag());
        // draggedObjects = [];
        _cameraControls.enabled = cachedCameraState;
    }

    _domElement.addEventListener('mousemove', onDocumentMouseMove, false);
    _domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    _domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
}
