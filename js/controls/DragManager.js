var controls;
(function (controls) {
    var DropTarget = (function () {
        function DropTarget() {
        }
        return DropTarget;
    })();
    var DragManager = (function () {
        function DragManager() {
            var _this = this;
            // The current drag event state
            this.dragging = false;
            this.currentDragEvent = null;
            this.dragStartHandler = null;
            this.trackDragHandler = null;
            this.dropHandler = null;
            $(document).on("mousemove", function (evt) { return _this.onDocumenttMouseMove(evt); });
            $(document).on("mouseup", function (evt) { return _this.onDocumentMouseUp(evt); });
        }
        DragManager.prototype.onDragStart = function (dragStartHandler) {
            this.dragStartHandler = dragStartHandler;
        };
        DragManager.prototype.onTrackDrag = function (trackDragHandler) {
            this.trackDragHandler = trackDragHandler;
        };
        DragManager.prototype.onDrop = function (dropHandler) {
            this.dropHandler = dropHandler;
        };
        DragManager.prototype.registerDropTarget = function (dropTarget) {
            DragManager.dropTargets.push({ element: dropTarget, dragManager: this });
        };
        DragManager.prototype.$registerDragSource = function (jQuery) {
            this.registerDragSource(jQuery.get(0));
        };
        DragManager.prototype.registerDragSource = function (element) {
            var _this = this;
            // don't hold reference to element, as could cause leaks if it is removed from DOM - just attach events
            $(element).on("mousedown", function (evt) { return _this.onElementMouseDown(evt); });
            element.style.cursor = "default";
        };
        DragManager.prototype.onElementMouseDown = function (evt) {
            this.currentDragEvent = { sourceElement: evt.target, mouseDownX: evt.clientX, mouseDownY: evt.clientY, offsetX: evt.offsetX, offsetY: evt.offsetY };
        };
        DragManager.prototype.onDocumenttMouseMove = function (evt) {
            var mouseOverElement = evt.target;
            if (this.dragging) {
                // drag drag feedback
                this.currentDragEvent.visualDragElement.style.left = (evt.clientX - this.currentDragEvent.offsetX) + "px";
                this.currentDragEvent.visualDragElement.style.top = (evt.clientY - this.currentDragEvent.offsetY) + "px";
                var dropTarget = this.findDropTarget(evt);
                if (dropTarget && this.trackDragHandler) {
                    if (this.overTarget && this.overTarget.element !== dropTarget.element) {
                        dropTarget.dragManager.dispatchTrackDragEvent(this.currentDragEvent, false);
                        this.overTarget = null;
                    }
                    if (!this.overTarget) {
                        dropTarget.dragManager.dispatchTrackDragEvent(this.currentDragEvent, true);
                        this.overTarget = dropTarget;
                    }
                }
                else if (this.overTarget) {
                    this.overTarget.dragManager.dispatchTrackDragEvent(this.currentDragEvent, false);
                    this.overTarget = null;
                }
                evt.preventDefault();
                return false;
            }
            else if ((this.currentDragEvent != null) && (mouseOverElement === this.currentDragEvent.sourceElement)) {
                // only start the drag if the mouse has moved away from the initial mousedown location
                if ((this.currentDragEvent.mouseDownX != evt.clientX) || (this.currentDragEvent.mouseDownY != evt.clientY)) {
                    this.dragging = true;
                    if (this.dragStartHandler) {
                        this.dragStartHandler(this.currentDragEvent);
                    }
                    if (!this.currentDragEvent.visualDragElement) {
                        // Caller has not set a feedback element so create a default one by attempting to 'clone' the target
                        this.currentDragEvent.visualDragElement = document.createElement("div");
                        this.currentDragEvent.visualDragElement.innerText = this.currentDragEvent.sourceElement.innerText;
                        this.currentDragEvent.visualDragElement.style.width = this.currentDragEvent.sourceElement.clientWidth + "px";
                        this.currentDragEvent.visualDragElement.style.height = this.currentDragEvent.sourceElement.clientHeight + "px";
                        this.currentDragEvent.visualDragElement.style.cursor = "default";
                        var targetStyle = window.getComputedStyle(this.currentDragEvent.sourceElement);
                        this.currentDragEvent.visualDragElement.style.backgroundColor = targetStyle.backgroundColor;
                    }
                    document.body.appendChild(this.currentDragEvent.visualDragElement);
                    this.currentDragEvent.visualDragElement.style.position = "absolute";
                    this.currentDragEvent.visualDragElement.style.zIndex = "2000";
                    this.currentDragEvent.visualDragElement.style.left = (evt.clientX - this.currentDragEvent.offsetX) + "px";
                    this.currentDragEvent.visualDragElement.style.top = (evt.clientY - this.currentDragEvent.offsetY) + "px";
                }
                evt.preventDefault();
                return false;
            }
            else {
                return true;
            }
        };
        DragManager.prototype.onDocumentMouseUp = function (evt) {
            if (this.overTarget) {
                this.overTarget.dragManager.dispatchTrackDragEvent(this.currentDragEvent, false);
                this.overTarget = null;
            }
            if (this.dragging) {
                var dropTarget = this.findDropTarget(evt);
                if (dropTarget != null) {
                    dropTarget.dragManager.dispatchDropEvent(this.currentDragEvent);
                }
                document.body.removeChild(this.currentDragEvent.visualDragElement);
                this.currentDragEvent = null;
                this.dragging = false;
                evt.preventDefault();
                return false;
            }
            else {
                this.currentDragEvent = null;
                return true;
            }
        };
        DragManager.prototype.dispatchTrackDragEvent = function (dragEvent, overTarget) {
            if (this.trackDragHandler) {
                this.trackDragHandler(dragEvent, overTarget);
            }
        };
        DragManager.prototype.dispatchDropEvent = function (dragEvent) {
            if (this.dropHandler) {
                this.dropHandler(dragEvent);
            }
        };
        DragManager.prototype.findDropTarget = function (evt) {
            for (var i = 0; i < DragManager.dropTargets.length; i++) {
                var target = DragManager.dropTargets[i];
                var targetRect = target.element.getBoundingClientRect();
                if ((evt.clientX >= targetRect.left) && (evt.clientX <= targetRect.right) && (evt.clientY >= targetRect.top) && (evt.clientY <= targetRect.bottom)) {
                    return target;
                }
            }
            return null;
        };
        // List of registered drop targets - shared amongst all instaces of DragManager
        DragManager.dropTargets = [];
        return DragManager;
    })();
    controls.DragManager = DragManager;
})(controls || (controls = {}));
