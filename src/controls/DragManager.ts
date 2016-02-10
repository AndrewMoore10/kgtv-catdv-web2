module controls
{
    class DropTarget
    {
        public element: HTMLElement;
        public dragManager: DragManager;
    }

    export interface DragDropEvent
    {
        sourceElement: HTMLElement; // element user dragged 
        mouseDownX: number; // X coordinate of initial mouse down event that started the drag
        mouseDownY: number; // Y coordinate of initial mouse down event that started the drag
        offsetX: number; // X offset of mousedown location within the dragged element bounds
        offsetY: number; // Y offset of mousedown location within the dragged element bounds
        data?: string; // data to be sent to drop target
        visualDragElement?: HTMLElement; // HTMLElement displayed under the cursor as user drags
    }


    export class DragManager
    {
        // The current drag event state
        private dragging: boolean = false;
        private currentDragEvent: DragDropEvent = null;
        private overTarget: DropTarget; // Drop target we are currently hovering over

        // List of registered drop targets - shared amongst all instaces of DragManager
        private static dropTargets: DropTarget[] = [];
 
        private dragStartHandler: (evt: DragDropEvent) => void = null
        private trackDragHandler: (evt: DragDropEvent, overTarget: boolean) => void = null;
        private dropHandler: (evt: DragDropEvent) => void = null;

        constructor()
        {
            $(document).on("mousemove", (evt) => this.onDocumenttMouseMove(evt));
            $(document).on("mouseup", (evt) => this.onDocumentMouseUp(evt));
        }

        public onDragStart(dragStartHandler: (evt: DragDropEvent) => void)
        {
            this.dragStartHandler = dragStartHandler;
        }

        public onTrackDrag(trackDragHandler: (evt: DragDropEvent, overTarget: boolean) => void)
        {
            this.trackDragHandler = trackDragHandler;
        }

        public onDrop(dropHandler: (evt: DragDropEvent) => void)
        {
            this.dropHandler = dropHandler;
        }

        public registerDropTarget(dropTarget: HTMLElement)
        {
            DragManager.dropTargets.push({ element: dropTarget, dragManager: this });
        }

        public $registerDragSource(jQuery: JQuery)
        {
            this.registerDragSource(jQuery.get(0));
        }

        public registerDragSource(element: HTMLElement)
        {
            // don't hold reference to element, as could cause leaks if it is removed from DOM - just attach events
            $(element).on("mousedown", (evt) => this.onElementMouseDown(evt));
            element.style.cursor = "default";
        }

        private onElementMouseDown(evt: JQueryMouseEventObject): any
        {
            this.currentDragEvent = { sourceElement: <HTMLElement>evt.target, mouseDownX: evt.clientX, mouseDownY: evt.clientY, offsetX: evt.offsetX, offsetY: evt.offsetY };
        }

        private onDocumenttMouseMove(evt: JQueryMouseEventObject): any
        {
            var mouseOverElement = <HTMLElement>evt.target;
            if (this.dragging)
            {
                // drag drag feedback
                this.currentDragEvent.visualDragElement.style.left = (evt.clientX - this.currentDragEvent.offsetX) + "px";
                this.currentDragEvent.visualDragElement.style.top = (evt.clientY - this.currentDragEvent.offsetY) + "px";

                var dropTarget = this.findDropTarget(evt);
                if (dropTarget && this.trackDragHandler)
                {
                    if (this.overTarget && this.overTarget.element !== dropTarget.element)
                    {
                        dropTarget.dragManager.dispatchTrackDragEvent(this.currentDragEvent, false);
                        this.overTarget = null;
                    }
                    if (!this.overTarget)
                    {
                        dropTarget.dragManager.dispatchTrackDragEvent(this.currentDragEvent, true);
                        this.overTarget = dropTarget;
                    }
                }
                else if (this.overTarget)
                {
                    this.overTarget.dragManager.dispatchTrackDragEvent(this.currentDragEvent, false);
                    this.overTarget = null;
                }

                evt.preventDefault();
                return false;
            }
            else if ((this.currentDragEvent != null) && (mouseOverElement === this.currentDragEvent.sourceElement))
            {
                // only start the drag if the mouse has moved away from the initial mousedown location
                if ((this.currentDragEvent.mouseDownX != evt.clientX) || (this.currentDragEvent.mouseDownY != evt.clientY))
                {
                    this.dragging = true;
                    if (this.dragStartHandler)
                    {
                        this.dragStartHandler(this.currentDragEvent);
                    }
                    if (!this.currentDragEvent.visualDragElement)
                    {
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
            else 
            {
                return true;
            }
        }

        private onDocumentMouseUp(evt: JQueryMouseEventObject): any
        {
            if (this.overTarget)
            {
                this.overTarget.dragManager.dispatchTrackDragEvent(this.currentDragEvent, false);
                this.overTarget = null;
            }

            if (this.dragging)
            {
                var dropTarget = this.findDropTarget(evt);
                if (dropTarget != null)
                {
                    dropTarget.dragManager.dispatchDropEvent(this.currentDragEvent);
                }
                document.body.removeChild(this.currentDragEvent.visualDragElement);
                this.currentDragEvent = null;
                this.dragging = false;
                evt.preventDefault();
                return false;
            }
            else
            {
                this.currentDragEvent = null;
                return true;
            }
        }

        private dispatchTrackDragEvent(dragEvent: DragDropEvent, overTarget: boolean)
        {
            if (this.trackDragHandler)
            {
                this.trackDragHandler(dragEvent, overTarget);
            }
        }

        private dispatchDropEvent(dragEvent: DragDropEvent)
        {
            if (this.dropHandler)
            {
                this.dropHandler(dragEvent);
            }
        }

        private findDropTarget(evt: JQueryMouseEventObject): DropTarget
        {
            for (var i = 0; i < DragManager.dropTargets.length; i++)
            {
                var target = DragManager.dropTargets[i];
                var targetRect = target.element.getBoundingClientRect();
                if ((evt.clientX >= targetRect.left) && (evt.clientX <= targetRect.right) && (evt.clientY >= targetRect.top) && (evt.clientY <= targetRect.bottom))                  
                {
                    return target;
                }
            }
            return null;
        }

    }
}