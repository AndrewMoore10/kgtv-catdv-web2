module controls
{
    import Platform = util.Platform;

    // Wrappers for common HTML controls such as text boxes, checkboxes etc.
    //
    // There are two patterns for creating controls:
    //
    // constructor(element : any) - Wrap an existing DOM element. 
    // 
    //   new Control(element)
    //
    //      element - the element to wrap. Can be a string ID, an HTMLElement that has already been added to the DOM 
    //                or a JQuery object that refers to an element that has already been added to the DOM
    //
    //   Control.create(options: any, parent : any) - create a new intance of the control and add it to the parent
    // 
    //      options - optional settings for the control. Typically these are added as attributes to the HTML element that is created.
    //                e.g. { "id" : "new_control", "class" : "some-css-class", "disabled" : true }
    //
    //      parent  - the parent element that the newly created control will be added to. Can be an ID, an HTMLElement or a JQuery object.

    // Any HTML Element and base class for all Controls
    export class Element
    {
        public elementId: string;
        public $element: JQuery;

        constructor(element: any)
        {
            this.$element = Element.get$(element);
            this.elementId = this.$element.length > 0 ? this.$element.get(0).id : null;
        }

        // Return a JQquery object that wraps the specified element
        // The element parameter may be an element ID string, an HTMLELement or a JQuery object 
        // (in which case it is just returned).
        public static get$(element): JQuery
        {
            if (typeof element === "string")
            {
                return $("#" + <string>element);
            }
            else if (element.$element) // i.e. it's a Control
            {
                return element.$element;
            }
            else if (typeof element === "HTMLElement")
            {
                return $(<HTMLElement>element);
            }
            else
            {
                return <JQuery>element;
            }
        }

        // Utility function to render an HTML tag based on passed in options
        public static render(tag: string, options: any, tagContext: string = "")
        {
            var html = "<" + tag;
            if (options)
            {
                for (var option in options)
                {
                    var optionValue = options[option];
                    if (typeof optionValue == 'Boolean')
                    {
                        if (optionValue)
                        {
                            html += " " + option;
                        }
                    }
                    else if ((typeof optionValue != 'Object') && (typeof optionValue != 'Array'))
                    {
                        html += " " + option + "='" + optionValue + "'";
                    }
                }
            }
            html += ">" + tagContext + "</" + tag + ">";
            return html;
        }

        // Utility function to convert a string into a valid element id
        public static toID(str: string): string
        {
            return str.replace(new RegExp('[^A-Za-z0-9]', 'g'), "_");
        }

        public getElement(): HTMLElement
        {
            return document.getElementById(this.elementId);
        }

        public setSize(width: number, height: number)
        {
            this.setWidth(width);
            this.setHeight(height);
        }

        public getLeft(): number
        {
            return this.$element.position().left;
        }
        public setLeft(left: number)
        {
            this.$element.css({ "left": left });
        }

        public getTop(): number
        {
            return this.$element.position().top;
        }
        public setTop(top: number)
        {
            this.$element.css({ "top": top });
        }

        public getBottom(): number
        {
            return parseInt(this.$element.css("bottom"));
        }
        public setBottom(bottom: number)
        {
            this.$element.css({ "bottom": bottom });
        }

        public getRight(): number
        {
            return parseInt(this.$element.css("right"));
        }
        public setRight(right: number)
        {
            this.$element.css({ "right": right });
        }

        public getWidth(): number
        {
            return this.$element.width();
        }
        public setWidth(width: number)
        {
            this.$element.css({ "width": width });
        }

        public getHeight(): number
        {
            return this.$element.height();
        }
        public setHeight(height: any)
        {
            this.$element.css({ "height": height });
        }

        // Get postiion of element relative to document
        public getAbsoluteLeft(): number
        {
            return this.$element.offset().left;
        }
        public getAbsoluteTop(): number
        {
            return this.$element.offset().top;
        }

        public css(css: any): any
        {
            return this.$element.css(css);
        }

        public show(show?: boolean)
        {
            if ((typeof show == "undefined") || (show == true))
            {
                this.$element.show();
            }
            else
            {
                this.$element.hide();
            }
        }

        public hide()
        {
            this.$element.hide();
        }

        public onClick(clickHandler: (evt: any) => void)
        {
            this.$element.click(function(evt)
            {
                clickHandler(evt);
            });
        }
    }

    export enum Direction
    {
        Horizontal = 1,
        Vertical = 2
    }

    export interface DragElementEvent
    {
        element: HTMLElement;
        position: number;
    }

    export class DraggableElement extends Element
    {
        private element: HTMLElement;
        private gotMouseDown: boolean = false;
        private dragging: boolean = false;
        private disabled: boolean = false;
        private ignoreClick: boolean = false;
        private savedZIndex: String;

        private direction: Direction;
        private minPosition: number;
        private maxPosition: number;

        // Where the mousedown event happened
        private startMouseX: number;
        private startMouseY: number;
        // Initial location of the element
        private startElementLeft: number;
        private startElementTop: number;

        // We need to store references to the closures so we can unregister them
        private mouseMoveHandler: (evt: JQueryMouseEventObject) => boolean;
        private mouseUpHandler: (evt: JQueryMouseEventObject) => boolean;

        private dragHandler: (evt: DragElementEvent) => void = null;
        private dropHandler: (evt: DragElementEvent) => void = null;

        constructor(element: any, direction: Direction, minPosition: number, maxPosition: number)
        {
            super(element);

            this.element = this.$element.get(0);
            this.direction = direction;
            this.setLimits(minPosition, maxPosition);

            this.$element.on("mousedown", (evt) => this.handleMouseDown(evt));
            this.mouseMoveHandler = (evt) => this.handleMouseMove(evt);
            this.mouseUpHandler = (evt) => this.handleMouseUp(evt);

            // stop parent picking up click event at drag end
            //            this.$element.on("click", (evt) =>
            //            {
            //                evt.cancelBubble = true;
            //                evt.preventDefault();
            //                return false;
            //            });
        }

        // Override Element.onClick
        public onClick(clickHandler: (evt: any) => void)
        {
            this.$element.click((evt) =>
            {
                if (!this.ignoreClick)
                {
                    clickHandler(evt);
                }
                else
                {
                    this.ignoreClick = false;
                    evt.cancelBubble = true;
                    evt.preventDefault();
                    return false;
                }
            });
        }

        public onDrag(dragHandler: (evt: DragElementEvent) => void)
        {
            this.dragHandler = dragHandler;
        }

        public onDrop(dropHandler: (evt: DragElementEvent) => void)
        {
            this.dropHandler = dropHandler;
        }

        public isDragging(): boolean
        {
            return this.dragging;
        }

        public setLimits(minPosition: number, maxPosition: number)
        {
            this.minPosition = minPosition;
            this.maxPosition = maxPosition - ((this.direction == Direction.Horizontal) ? this.getWidth() : this.getHeight());

            Console.debug("drag limits minPosition:" + this.minPosition + ",maxPosition:" + this.maxPosition + ",width:" + this.getWidth());
            if (this.direction == Direction.Horizontal)
            {
                this.element.style.left = Math.min(this.maxPosition, Math.max(this.minPosition, this.$element.position().left)) + "px";
            }
            else
            {
                this.element.style.top = Math.min(this.maxPosition, Math.max(this.minPosition, this.$element.position().top)) + "px";
            }
        }

        public setDisabled(disabled: boolean)
        {
            this.disabled = disabled;
            if (disabled)
            {
                this.$element.addClass("disabled");
            }
            else
            {
                this.$element.removeClass("disabled");
            }
        }

        private handleMouseDown(evt: JQueryMouseEventObject): boolean
        {
            if (!this.disabled)
            {
                if (this.element.setCapture)
                {
                    // Firefox, IE
                    this.element.setCapture(false);
                    this.$element.on("mousemove", this.mouseMoveHandler);
                    this.$element.on("mouseup", this.mouseUpHandler);
                }
                else
                {
                    // Chrome doesn't support setCapture() so need to capture all mouse events
                    $(document).on("mousemove", this.mouseMoveHandler);
                    $(document).on("mouseup", this.mouseUpHandler);
                }

                this.startMouseX = evt.clientX;
                this.startMouseY = evt.clientY;
                this.startElementLeft = this.$element.position().left;
                this.startElementTop = this.$element.position().top;

                Console.debug("mousedown clientX:" + evt.clientX + ",offsetX:" + evt.offsetX + ",elementX:" + this.startElementLeft + ",styleLeft:" + this.$element.css("left"));
                this.gotMouseDown = true;
                this.savedZIndex = this.$element.css("z-index");
                this.$element.css({ "z-index": 1000 });
            }
            evt.preventDefault();
            evt.cancelBubble = true;
            return false;
        }

        private handleMouseMove(evt: JQueryMouseEventObject): boolean
        {
            if (!this.dragging && this.gotMouseDown && (evt.clientX != this.startMouseX || evt.clientY != this.startMouseY))
            {
                // mouse has moved since mouse down - start drag
                this.dragging = true;
            }

            if (this.dragging && !this.disabled)
            {
                var position;
                if (this.direction == Direction.Horizontal)
                {
                    var deltaX = evt.clientX - this.startMouseX;
                    position = Math.min(this.maxPosition, Math.max(this.minPosition, this.startElementLeft + deltaX));
                    //                    Console.debug("mousemove clientX:" + evt.clientX + ",deltaX:" + deltaX + ",this.maxPosition:" + this.maxPosition + ",this.minPosition:" + this.minPosition + ", position:" + position);
                    this.element.style.left = position + "px";
                }
                else
                {
                    var deltaY = evt.clientY - this.startMouseY;
                    position = Math.min(this.maxPosition, Math.max(this.minPosition, this.startElementTop + deltaY));
                    this.element.style.top = position + "px";
                }
                if (this.dragHandler)
                {
                    this.dragHandler({ element: this.element, position: position });
                }
                evt.preventDefault();
                evt.cancelBubble = true;
                this.ignoreClick = true;
                return false;
            }
            else
            {
                return true;
            }
        }

        private handleMouseUp(evt: JQueryMouseEventObject): boolean
        {
            this.gotMouseDown = false;

            if (this.dragging && !this.disabled)
            {
                this.dragging = false;
                this.css({ "z-index": this.savedZIndex });

                if (this.element.setCapture)
                {
                    // Firefox, IE
                    this.element.releaseCapture();
                    this.$element.off("mousemove", this.mouseMoveHandler);
                    this.$element.off("mouseup", this.mouseUpHandler);
                }
                else
                {
                    // Chrome doesn't support setCapture()
                    $(document).off("mousemove", this.mouseMoveHandler);
                    $(document).off("mouseup", this.mouseUpHandler);
                }

                if (this.dropHandler)
                {
                    this.dropHandler({ element: this.element, position: parseInt(this.element.style.left) });
                }

                evt.preventDefault();
                return false;
            }
            else
            {
                return true;
            }
        }
    }

    // Base class for Panels (User Controls)
    export class Panel extends Element
    {
        constructor(element: any)
        {
            super(element);
        }

        public clear()
        {
            this.$element.empty();
        }
    }

    // Base class for all controls
    export class Control extends Element
    {
        constructor(element: any)
        {
            super(element);
        }
    }

    // Form controls encompases input controls and action controls (buttons). Support enable/disable.
    export class FormControl extends Control
    {
        public setEnabled(enabled: boolean)       
        {
            if (enabled)
            {
                this.$element.removeAttr("disabled");
            }
            else
            {
                this.$element.attr("disabled", "disabled");
            }
        }

    }

    // Input Controls (<input>, <select> and <textarea>) that support changed events
    export class InputControl extends FormControl
    {
        constructor(element: any)
        {
            super(element);
        }

        public onChanged(changeHandler: (evt: any) => void)
        {
            this.$element.change(function(evt)
            {
                changeHandler(evt);
            });
        }

    }

    export class Button extends FormControl
    {
        constructor(element: any)
        {
            super(element);
        }

        public static create(buttonText: string, options: any, parent: any)
        {
            return new Button($(Element.render("button", options, buttonText)).appendTo(Element.get$(parent)));
        }

    }

    export class Image extends Control
    {
        constructor(element: any)
        {
            super(element);
        }

        public static create(options: any, parent: any)
        {
            return new TextBox($(Element.render("img", options)).appendTo(Element.get$(parent)));
        }

        public setSourceUrl(url: string)
        {
            this.$element.attr("src", url);
        }
    }


    export class TextBox extends InputControl
    {
        constructor(element: any)
        {
            super(element);
        }

        public static create(options: any, parent: any)
        {
            return new TextBox($(Element.render("input", $.extend({ "type": "text" }, options))).appendTo(Element.get$(parent)));
        }

        public setText(value: string)
        {
            this.$element.val(value);
        }
        public getText(): string
        {
            return this.$element.val();
        }

        public setReadOnly(readonly: boolean)
        {
            this.$element.prop("readonly", readonly);
        }

        // Input event fires immediately unlike changed which only fires on lost focus
        public onInput(inputHandler: (evt: any) => void)
        {
            // Something on the Mac eats input, change and keypress events - so we have to use keyup!
            if (Platform.isMac())
            {
                this.$element.on("keyup", function(evt)
                {
                    inputHandler(evt);
                });
            }
            else
            {
                this.$element.on("input", function(evt)
                {
                    inputHandler(evt);
                });
            }
        }
    }

    export class TextArea extends InputControl
    {
        constructor(element: any)
        {
            super(element);
        }

        public static create(options: any, parent: any)
        {
            return new TextArea($(Element.render("textarea", options)).appendTo(Element.get$(parent)));
        }

        public setText(value: string)
        {
            this.$element.val(value);
        }
        public getText(): string
        {
            return this.$element.val();
        }

        public setReadOnly(readonly: boolean)
        {
            this.$element.prop("readonly", readonly);
        }
    }

    // Can wrap any HTML element with text content
    export class Label extends Control
    {
        constructor(element: any)
        {
            super(element);
        }

        public setText(value: string)
        {
            this.$element.text(value);
        }
    }

    export interface ListItem
    {
        value: any;
        text: string;
        tooltip?: string;
        cssClass?: string;
        isSelected?: boolean;
    }

    export class DropDownList extends InputControl
    {
        constructor(element: any)
        {
            super(element);
        }

        public static create(options: any, parent: any): DropDownList
        {
            var newDropDownList = new DropDownList($(Element.render("select", options)).appendTo(Element.get$(parent)));
            if (options.values)
            {
                newDropDownList.setItems(options.values.map((s) => { return { value: s, text: s }; }));
            }
            else if (options.items)
            {
                newDropDownList.setItems(options.items);
            }
            return newDropDownList;
        }

        public clearItems()
        {
            this.$element.empty();
        }

        public setItems(items: ListItem[])
        {
            this.$element.empty();
            if (items)
            {
                items.forEach((item) => this.addItem(item));
            }
        }

        public addItem(item: ListItem)
        {
            var $option = $("<option value='" + item.value + "' " + (item.isSelected ? " selected" : "") + "/>").appendTo(this.$element);
            $option.text(item.text);
        }

        public getSelectedIndex(): number
        {
            return this.$element.find("option:selected").index();
        }

        public getSelectedValue(): string
        {
            return this.$element.val();
        }

        public setSelectedValue(value: string): DropDownList
        {
            this.$element.val(value);
            return this;
        }
    }

    export class MultiSelectDropDownList extends Control
    {
        private dataSource: ListDataSource;
        private fixedValues: boolean;
        private enabled: boolean = true;

        private $inputWrapper: JQuery;
        private $input: JQuery;
        private $arrow: JQuery;
        private $popup: JQuery;

        private popupVisible: boolean = false;

        private listItems: ListItem[] = [];
        private itemCheckBoxes: JQuery[] = [];

        private selectedIndexes: number[] = [];

        // To support user navigating up and down list items with cursor keys
        private currentIndex: number = null;

        private changeHandler: (evt: any) => void = null;

        // Save reference to handler so we can wire/unwire it as required
        private backgroundClickHandler: (evt: any) => void = null;

        constructor(element: any, fixedValues: boolean, dataSource: ListDataSource = null)
        {
            super(element);

            this.fixedValues = fixedValues;
            this.dataSource = dataSource;

            // Replace passed in custom comobo element with actual markup
            var cssClass = this.$element.attr("class") || "";
            var $comboDiv = $("<div id='" + this.elementId + "' class='dropdown-list multi-dropdown' style='position: relative;'/>");
            this.$element.replaceWith($comboDiv);
            this.$element = $comboDiv;
            this.$inputWrapper = $("<div class='input' style='position: relative;'/>").appendTo(this.$element);
            this.$input = $("<input type=text class='" + cssClass + "' readonly />").appendTo(this.$inputWrapper);
            this.$arrow = $("<span class='arrow'/>").appendTo(this.$inputWrapper);
            this.$popup = $("<div class='popup'/>").appendTo(this.$element);
            this.$popup.css({
                "position": "absolute",
                "display": "none",
                "left": "0px",
                "top": "100%",
                "width": "100%",
                "color": this.$input.css("color"),
                "background-color": this.$input.css("background-color"),
                "font-size": this.$input.css("font-size")
            });

            this.backgroundClickHandler = (evt) =>
            {
                if (this.popupVisible) this.showPopup(false);
            };

            this.refreshList();

            this.$inputWrapper.click((evt) =>
            {
                if (this.enabled)
                {
                    this.showPopup(!this.popupVisible);
                    evt.stopPropagation();
                }
            });

            this.$input.keyup((evt) =>
            {
                if (this.enabled)
                {
                    this.input_keyPress(evt);
                }
            });
        }

        public static create(options: any, fixedValues: boolean, dataSource: ListDataSource, parent: any): MultiSelectDropDownList
        {
            return new MultiSelectDropDownList($(Element.render("select", options)).appendTo(Element.get$(parent)), fixedValues, dataSource);
        }

        public onChanged(changeHandler: (evt: any) => void)
        {
            this.changeHandler = changeHandler;
        }

        public setEnabled(enabled: boolean)
        {
            this.enabled = enabled;
        }

        public getSelectedItems(): ListItem[]
        {
            var selectedItems = [];
            this.selectedIndexes.forEach((index, i) =>
            {
                selectedItems.push(this.listItems[index]);
            });
            return selectedItems;
        }

        public getSelectedValues(): any[]
        {
            return this.getSelectedItems().map((item) => item.value);
        }
        public setSelectedValues(values: any[])
        {
            this.selectedIndexes = [];
            this.$popup.find("input[type=checkbox]").prop("checked", false);
            if (values && values.forEach)
            {
                values.forEach((value) =>
                {
                    this.listItems.forEach((item, i) =>
                    {
                        if (item.value == value) 
                        {
                            this.selectedIndexes.push(i);
                            this.itemCheckBoxes[i].prop("checked", true);
                        }
                    });
                });
            }
            this.updateDisplayedValue();
        }

        public getText(): any
        {
            return this.$input.val();
        }

        public setText(text: string)
        {
            this.$input.val(text);
        }

        private refreshList()
        {
            this.$popup.empty();
            this.selectedIndexes = [];
            this.itemCheckBoxes = [];

            this.dataSource.getItems(null, (items) =>
            {
                this.listItems = items;

                this.listItems.forEach((item, i) =>
                {
                    var $item = $("<div class='item " + (item.cssClass || "") + "'>").appendTo(this.$popup);
                    var $checkbox = $("<input type='checkbox'>").appendTo($item);
                    $(document.createTextNode(item.text)).appendTo($item);

                    this.itemCheckBoxes.push($checkbox);

                    $checkbox.click((evt) =>
                    {
                        this.item_selectionUpdated(i, $checkbox.prop("checked") ? true : false);
                        evt.stopPropagation();
                    });

                    $item.click((evt) =>
                    {
                        $checkbox.prop("checked", !($checkbox.prop("checked")));
                        this.item_selectionUpdated(i, $checkbox.prop("checked") ? true : false);
                        evt.stopPropagation();
                    });

                    if (item.isSelected)
                    {
                        this.selectedIndexes.push(i);
                    }
                });

                this.updateDisplayedValue();
            });
        }

        private input_keyPress(evt)
        {
            Console.debug("keyup - evt.keyCode:" + evt.keyCode);

            if (evt.keyCode == 40 /* down arrow */)
            {
                this.showPopup(true);
                this.currentIndex = (this.currentIndex != null) ? Math.min(this.currentIndex + 1, this.listItems.length - 1) : 0;
                this.$popup.children().removeClass("selected");
                this.$popup.children().eq(this.currentIndex).addClass("selected");
            }
            else if ((evt.keyCode == 38  /* up arrow */) && (this.currentIndex != null))
            {
                this.currentIndex = Math.max(this.currentIndex - 1, 0);
                this.$popup.children().removeClass("selected");
                this.$popup.children().eq(this.currentIndex).addClass("selected");
            }
            else if ((evt.keyCode == 32  /* space */) && (this.currentIndex != null))
            {
                var $checkbox = this.itemCheckBoxes[this.currentIndex];
                $checkbox.prop("checked", !($checkbox.prop("checked")));
                this.item_selectionUpdated(this.currentIndex, $checkbox.prop("checked") ? true : false);
            }
            else if (evt.keyCode == 13  /* enter */)
            {
                if (this.currentIndex != null)
                {
                    this.showPopup(false);
                }
            }
        }

        private item_selectionUpdated(itemIndex: number, isSelected: boolean)
        {
            if (isSelected)
            {
                this.selectedIndexes.push(itemIndex);
            }
            else
            {
                this.selectedIndexes = this.selectedIndexes.filter((i) => i != itemIndex);
            }
            this.updateDisplayedValue();

            this.$input.focus();
            this.fireChangeEvent();
        }

        private updateDisplayedValue()
        {
            var value = "";
            this.selectedIndexes.forEach((index, i) =>
            {
                if (i > 0) value += ",";
                value += this.listItems[index].text;
            });
            this.$input.val(value);
        }

        private showPopup(show: boolean)
        {
            if (show != this.popupVisible)
            {
                if (show)
                {
                    this.$popup.show();
                    this.popupVisible = true;
                    // manually add/remove "focus" class so we can arrange for hover outline to 
                    // stay visible in clip details view while pop-up is open. 
                    this.$inputWrapper.addClass("focus");
                    $(document).on("click", this.backgroundClickHandler);
                }
                else
                {
                    this.$popup.hide();
                    this.$popup.children().removeClass("selected");
                    this.popupVisible = false;
                    this.currentIndex = null;
                    // manually add/remove "focus" class 
                    this.$inputWrapper.removeClass("focus");
                    $(document).off("click", this.backgroundClickHandler);
                }
            }
        }


        private fireChangeEvent()
        {
            if (this.changeHandler) this.changeHandler({ "src": this });
        }
    }

   export class ComboBox extends Control
    {
        private dataSource: ListDataSource;
        private fixedValues: boolean;
        private enabled: boolean = true;

        private $inputWrapper: JQuery;
        private $input: JQuery;
        private $previewInput: JQuery;
        private $arrow: JQuery;
        private $popup: JQuery;

        private popupVisible: boolean = false;
        private selectedItem: ListItem = null;
        private inPopupClick = false;

        private allItems: ListItem[] = [];
        private currentItems: ListItem[] = [];
        private currentIndex: number = null;

        private changeHandler: (evt: any) => void = null;

        constructor(element: any, fixedValues: boolean = true, dataSource:ListDataSource = null)
        {
            super(element);

            this.fixedValues = fixedValues;

            if (dataSource != null)
            {
                this.dataSource = dataSource;
            }
            else
            {
                // Read items from existing markup    
                var listItems: ListItem[] = [];
                this.$element.find("option").each((i, element: HTMLOptionElement) =>
                {
                    listItems.push({
                        value: this.getAttribute(element, "value"),
                        tooltip: this.getAttribute(element, "tool-tip"),
                        isSelected: this.getAttribute(element, "selected") ? true : false,
                        text: element.textContent || ""
                    });
                });
                this.dataSource = new SimpleListDataSource(listItems);
            }

            // Replace passed in custom combo element with actual markup
            var cssClass = this.$element.attr("class") || "";
            var $comboDiv = $("<div id='" + this.elementId + "' class='dropdown-list auto-suggest' style='position: relative;'/>");
            this.$element.replaceWith($comboDiv);
            this.$element = $comboDiv;
            this.$inputWrapper = $("<div class='input' style='position: relative;'/>").appendTo(this.$element);
            if (this.fixedValues)
            {
                this.$previewInput = $("<input type=text  class='preview " + cssClass + "'/>").appendTo(this.$inputWrapper);
            }
            this.$input = $("<input type=text  class='" + cssClass + "'/>").appendTo(this.$inputWrapper);
            if (this.fixedValues)
            {
                // Position input in front of the preview box
                this.$input.css({
                    "background-color": "transparent",
                    "position": "absolute",
                    "left": "0px",
                    "top": "0px",
                    "bottom": "0px",
                    "right": "0px",
               });
            }
            this.$arrow = $("<span class='arrow'/>").appendTo(this.$inputWrapper);
            this.$popup = $("<div class='popup'/>").appendTo(this.$element);
            this.$popup.css({
                "position": "absolute",
                "display": "none",
                "left": "0px",
                "top": "100%",
                "width": "100%",
                "color": this.$input.css("color"),
                "font-size": this.$input.css("font-size")
            });

            if (this.fixedValues)
            {
                this.preloadData();
            }

            this.$arrow.click((evt) =>
            {
                if (this.enabled) 
                {
                    this.showPopup(!this.popupVisible);
                }
            });

            this.$input.keydown((evt: JQueryKeyEventObject) =>
            {
                if (!this.enabled || !this.fixedValues) return;

                Console.debug("keydown - evt.keyCode:" + evt.keyCode);
                if ((evt.keyCode == 46  /* delete */) || (evt.keyCode == 8  /* backspace */))
                {
                    // Calculate what text would look like if this key was processed
                    var selection = this.getInputSelection(this.$input.get(0));
                    var oldValue: string = this.$input.val();
                    var textAfterKeyPressApplied;
                    if (selection.start == selection.end)
                    {
                        if (evt.keyCode == 46  /* delete */)
                        {
                            textAfterKeyPressApplied = oldValue.substring(0, selection.start) + oldValue.substring(selection.start + 1);
                        }
                        else
                        {
                            textAfterKeyPressApplied = oldValue.substring(0, selection.start - 1) + oldValue.substring(selection.start);
                        }
                    }
                    else
                    {
                        textAfterKeyPressApplied = oldValue.substring(0, selection.start) + oldValue.substring(selection.end);
                    }

                    var match = this.allItems.find((item) => item.text.toLowerCase().startsWith(textAfterKeyPressApplied.toLowerCase()));
                    Console.debug("match:" + match);
                    return match ? true : false;
                }
            });

            this.$input.keyup((evt: JQueryKeyEventObject) =>
            {
                if (!this.enabled) return;

                // Process control keys
                Console.debug("keyup - evt.keyCode:" + evt.keyCode);
                if (!this.enabled) return;

                if (evt.keyCode == 40 /* down arrow */)
                {
                    this.showPopup(true);
                    this.currentIndex = (this.currentIndex != null) ? Math.min(this.currentIndex + 1, this.currentItems.length - 1) : 0;
                    this.$popup.children().removeClass("selected");
                    this.$popup.children().eq(this.currentIndex).addClass("selected");
                    this.setSelectedItem(this.currentItems[this.currentIndex]);
                }
                else if ((evt.keyCode == 38  /* up arrow */) && (this.currentIndex != null))
                {
                    this.currentIndex = Math.max(this.currentIndex - 1, 0);
                    this.$popup.children().removeClass("selected");
                    this.$popup.children().eq(this.currentIndex).addClass("selected");
                    this.setSelectedItem(this.currentItems[this.currentIndex]);
                }
                else if (evt.keyCode == 13  /* enter */)
                {
                    if (this.currentIndex != null)
                    {
                        this.setSelectedItem(this.currentItems[this.currentIndex]);
                        this.showPopup(false);
                    }
                }
                else if ((evt.keyCode != 9  /* tab */) && (evt.keyCode != 37  /* left */) && (evt.keyCode != 39  /* right */) && (evt.keyCode != 46  /* del */))
                {
                    Console.debug("keyup - default action");
                    Dispatcher.dispatch(() =>
                    {
                        this.showPopup(true);
                        this.refreshList();
                    });
                }
            });

            this.$input.keypress((evt) =>
            {
                if (!this.enabled || !this.fixedValues) return;

                Console.debug("keypress - evt.keyCode:" + evt.keyCode + " String.fromCharCode(evt.charCode): '" + String.fromCharCode(evt.charCode) + "'");

                // Calculate what text would look like if this key was processed
                var selection = this.getInputSelection(this.$input.get(0));
                var oldValue: string = this.$input.val();
                var textAfterKeyPressApplied = oldValue.substring(0, selection.start) + String.fromCharCode(evt.charCode) + oldValue.substring(selection.end);

                Console.debug("textAfterKeyPressApplied:'" + textAfterKeyPressApplied + "'");
                if (this.allItems.find((item) => item.text.toLowerCase().startsWith(textAfterKeyPressApplied.toLowerCase())))
                {
                    Dispatcher.dispatch(() =>
                    {
                        this.showPopup(true);
                        this.refreshList();
                    });
                    Console.debug("OK");
                    return true;
                }
                else
                {
                    Console.debug("Cancel");
                    return false;
                }
            });

            this.$input.blur((evt) =>
            {
                if (!this.enabled) return;

                // Ignore blur if it's because we clicked in the popup
                if (!this.inPopupClick)
                {
                    this.showPopup(false, false);
                    if (this.fixedValues)
                    {
                        // If the user has typed something - but there is no selected item
                        // see if we can find an exact match and use that
                        var userText: string = this.$input.val().trim().toLowerCase();
                        if ((this.selectedItem == null) && (this.$input.val().trim() != ""))
                        {
                            this.currentItems.some((item, i) =>
                            {
                                if (item.text.toLowerCase() == userText)
                                {
                                    this.setSelectedItem(item);
                                    return true;
                                }
                                else
                                {
                                    return false;
                                }
                            });
                        }
                        this.$input.val(this.selectedItem ? this.selectedItem.text : "");
                    }
                }
                this.inPopupClick = false;
            });
        }

        public static create(options: any, fixedValues: boolean, dataSource: ListDataSource, parent: any): ComboBox
        {
            return new ComboBox($(Element.render("select", options)).appendTo(Element.get$(parent)), fixedValues, dataSource);
        }

        public onChanged(changeHandler: (evt: any) => void)
        {
            this.changeHandler = changeHandler;
        }

        public setEnabled(enabled: boolean)
        {
            this.enabled = enabled;
            if (this.enabled)
            {
                this.$input.prop("readonly", false);
                this.$input.addClass("editable");
                this.$arrow.show();
            }
            else
            {
                this.$input.prop("readonly", true);
                this.$input.removeClass("editable");
                this.$arrow.hide();
            }
        }

        public getSelectedItem(): ListItem
        {
            return this.selectedItem;
        }

        public getSelectedValue(): any
        {
            return this.selectedItem != null ? this.selectedItem.value : null;
        }
        public setSelectedValue(value: any)
        {
            this.dataSource.getItems(null,(items) =>
            {
                this.setSelectedItem(items.find((item) => item.value == value));
            });
        }

        public updateDataSource(dataSource: SimpleListDataSource)
        {
            this.dataSource = dataSource;
            this.preloadData();
            this.refreshList();
        }

        public getText(): any
        {
            return this.$input.val();
        }

        public setText(text: string)
        {
            this.$input.val(text);
            this.refreshList();
        }

        private preloadData()
        {
            // We need to perform filtering synchronously so we can check if each keypress is valid so just load all the data up front
            this.dataSource.getItems(null,(items) =>
            {
                this.allItems = items;
                this.allItems.forEach((item) =>
                {
                    if (typeof item.text == "number")
                    {
                        Console.debug("NUMBER!! " + this.elementId);
                    }
                    item.text = (item.text || "").toString();
                });
                this.refreshList();
                this.allItems.forEach((item) =>
                {
                    if (item.isSelected)
                    {
                        this.setSelectedItem(item);
                    }
                });
            });
        }

        private refreshList()
        {
            var filterValue = this.$input.val();
            if (this.fixedValues)
            {
                this.currentItems = this.allItems.filter((item) =>
                {
                    Console.debug("typeof item.text: " + (typeof item.text) + "item.text: " + item.text);
                    return item.text.toLowerCase().startsWith(filterValue.toLowerCase());
                });
                this.populateList();
            }
            else
            {
                this.dataSource.getItems(filterValue, (items) =>
                {
                    this.currentItems = items;
                    this.populateList();
                });
            }
        }

        private populateList()
        {
            this.$popup.empty();
            this.selectedItem = null;
            this.currentIndex = null;

            if (this.currentItems.length > 0)
            {
                this.currentItems.forEach((item, i) =>
                {
                    // breaks focussing because <a> tags get focus then get hidden. need another way to do tootltips
                    // var $item = $("<div class='item " + (item.cssClass || "") + "'><a href='#' title='" + item.tooltip + "' disabled>" + item.text + "</a></div>").appendTo(this.$popup);
                    var $item = $("<div class='item " + (item.cssClass || "") + "'>" + item.text + "</div>").appendTo(this.$popup);
                    $item.click((evt) =>
                    {
                        this.setSelectedItem(item);
                        this.showPopup(false);
                        this.inPopupClick = false;
                    });
                    $item.mousedown((evt) =>
                    {
                        this.inPopupClick = true;
                    });
                });
                if (this.fixedValues)
                {
                    this.selectedItem = this.currentItems[0];
                    this.$previewInput.val(this.selectedItem.text);
                    // If what the user has typed isn't the same case as what's in the list then 'correct' the typed value
                    var textFromValue = this.selectedItem.text.substr(0, this.$input.val().length);
                    if (this.$input.val() !== textFromValue)
                    {
                        this.$input.val(textFromValue);
                    }
                }
            }
            else
            {
                this.$popup.html("<i>No matches</i>");
            }
        }


        private getAttribute(element: HTMLOptionElement, attributeName: string): string
        {
            var attr = element.attributes.getNamedItem(attributeName);
            return attr != null ? attr.value : null;
        }

        private getInputSelection(el)
        {
            if (typeof el.selectionStart == "number" && typeof el.selectionEnd == "number")
            {
                return {
                    start: el.selectionStart,
                    end: el.selectionEnd
                };
            }
            else
            {
                var range = document.selection.createRange();
                var stored_range = range.duplicate();
                stored_range.moveToElementText(el);
                stored_range.setEndPoint('EndToEnd', range);
                return {
                    start: stored_range.text.length - range.text.length,
                    end: el.selectionStart + range.text.length
                };
            }
        }

        private setSelectedItem(item: ListItem)
        {
            var changed = (item != this.selectedItem);
            this.selectedItem = item;
            this.$input.val(this.selectedItem ? this.selectedItem.text : "");
            if (this.fixedValues)
            {
                this.$previewInput.val("");
            }
            if (changed) this.fireChangeEvent();
        }

        private showPopup(show: boolean, keepFocus: boolean = true)
        {
            Console.debug("showPopup(" + show + ")");
            if (show != this.popupVisible)
            {
                if (show)
                {
                    this.$popup.show();
                    this.popupVisible = true;
                }
                else
                {
                    this.$popup.hide();
                    this.$popup.children().removeClass("selected");
                    this.popupVisible = false;
                    this.currentIndex = null;
                    if (keepFocus) this.$input.focus();
                }
            }
        }

        private fireChangeEvent()
        {
            if (this.changeHandler) this.changeHandler({ "src": this });
        }
    }

    export class ListBox extends InputControl
    {
        constructor(element: any)
        {
            super(element);
        }

        public static create(options: any, parent: any): ListBox
        {
            var opts = $.extend({ "size": 5 }, options);
            if (opts.multiselect)
            {
                opts.multiple = "multiple";
            }
            delete opts.multiselect;

            var newListBox = new ListBox($(Element.render("select", opts)).appendTo(Element.get$(parent)));
            if (options.values)
            {
                newListBox.setItems(options.values.map((s) => { return { value: s, text: s }; }));
            }
            else if (options.items)
            {
                newListBox.setItems(options.items);
            }
            return newListBox;
        }

        public clear(): void
        {
            this.$element.empty();
        }

        public add(value: string, text: string = null, tooltip: string = null)
        {
            this.$element.append(this.createOptionElement(value, text, tooltip));
        }

        public addItem(item: ListItem)
        {
            this.$element.append(this.createOptionElement(item.value, item.text, item.tooltip));
        }

        public setItemAt(index: number, value: string, text: string = null, tooltip: string = null)
        {
            this.$element.find("option:nth-child(" + (index + 1) + ")").replaceWith(this.createOptionElement(value, text, tooltip));
        }

        private createOptionElement(value: string, text: string = null, tooltip: string = null)
        {
            return "<option value='" + value + "'" + (tooltip ? " title='" + tooltip + "'" : "") + ">" + (text || value) + "</option>";
        }

        public removeItemAt(index: number)
        {
            this.$element.find("option:nth-child(" + (index + 1) + ")").remove();
        }

        public setItems(items: ListItem[]): void
        {
            this.$element.empty();
            if (items)
            {
                items.forEach((item) =>
                {
                    $("<option value='" + item.value + "' " + (item.isSelected ? " selected" : "") + ">" + item.text + "</option>").appendTo(this.$element);
                });
            }
        }

        public getItems(): ListItem[] 
        {
            var items: ListItem[] = [];
            this.$element.find("option").each(function()
            {
                items.push({ value: $(this).val(), text: $(this).text() });
            });
            return items;
        }

        public getSelectedValue(): string
        {
            return this.$element.val();
        }

        public getSelectedValues(): string[]
        {
            var values: string[] = [];
            this.$element.find("option").each((i, e) => { if ($(e).is(":selected")) values.push($(e).val()); });
            return values;
        }

        public setSelectedValue(value: string)
        {
            this.$element.val(value);
        }

        public getSelectedIndex(): number
        {
            return this.$element.find("option:selected").index();
        }

        public getSelectedIndices(): number[]
        {
            var indices: number[] = [];
            this.$element.find("option").each((i, e) => { if ($(e).is(":selected")) indices.push(i); });
            return indices;
        }

        public setSelectedIndex(index: number) 
        {
            this.$element.find("option").removeAttr('selected');
            this.$element.find("option").eq(index).attr('selected', 'selected');
        }

    }

    export class CheckBox extends InputControl
    {
        constructor(element: any)
        {
            super(element);
        }

        public static create(options: any, parent: any): CheckBox
        {
            return new CheckBox($(Element.render("input type='checkbox'", options)).appendTo(Element.get$(parent)));
        }

        public isChecked(): boolean
        {
            return this.$element.prop("checked") ? true : false;
        }

        public setChecked(checked: boolean): CheckBox
        {
            this.$element.prop("checked", checked ? true : false);
            return this;
        }
    }

    export class MultiCheckBoxes
    {
        private values: string[] = null;
        private checkBoxes: CheckBox[] = null;

        constructor(checkBoxes: CheckBox[], values: string[])
        {
            this.checkBoxes = checkBoxes;
            this.values = values;
        }

        public static create(values: string[], options: any, parent: any): MultiCheckBoxes
        {
            var checkBoxes: CheckBox[] = [];

            values.forEach((value, i) =>
            {
                var $parent = Element.get$(parent);
                var $label = $("<label class='checkbox-inline'>").appendTo($parent);
                var $checkbox = $(Element.render("input type='checkbox'", options)).appendTo($label);
                $(document.createTextNode(value)).appendTo($label);
                checkBoxes.push(new CheckBox($checkbox));
            });
            return new MultiCheckBoxes(checkBoxes, values);
        }

        public setEnabled(enabled: boolean)
        {
            this.checkBoxes.forEach((rdo) => rdo.setEnabled(enabled));
        }

        public setValues(values: string[])
        {
            this.checkBoxes.forEach((checkBox, i) => checkBox.setChecked(values.contains(this.values[i])));
        }

        public getValues(): string[]
        {
            var values: string[] = [];
            this.checkBoxes.forEach((checkBox, i) =>
            {
                if (checkBox.isChecked())
                {
                    values.push(this.values[i]);
                }
            });
            return values;
        }
    }

    export class RadioButton extends InputControl
    {
        constructor(element: any, parent: any = null, options: any = null)
        {
            super(element);
        }

        public static create(options: any, parent: any): RadioButton
        {
            return new RadioButton($(Element.render("input type='radio'", options)).appendTo(Element.get$(parent)));
        }

        public isSelected(): boolean
        {
            return this.$element.prop("checked") ? true : false;
        }

        public setSelected(checked: boolean): RadioButton
        {
            this.$element.prop("checked", checked ? true : false);
            return this;
        }
    }

    export class RadioButtonSet
    {
        private values: string[] = null;
        private radioButtons: RadioButton[] = null;

        constructor(radioButtons: RadioButton[], values: string[])
        {
            this.radioButtons = radioButtons;
            this.values = values;
        }

        public static create(name: string, values: string[], options: any, parent: any): RadioButtonSet
        {
            var radioButtons: RadioButton[] = [];

            values.forEach((value, i) =>
            {
                var $parent = Element.get$(parent);
                var $label = $("<label class='radio-inline'>").appendTo($parent);
                var rdoOptions = $.extend({ "id": name + "_" + i, "name": name }, options);
                var $radio = $(Element.render("input type='radio'", rdoOptions)).appendTo($label);
                $(document.createTextNode(value)).appendTo($label);
                radioButtons.push(new RadioButton($radio));
            });
            return new RadioButtonSet(radioButtons, values);
        }

        public setEnabled(enabled: boolean)
        {
            this.radioButtons.forEach((rdo) => rdo.setEnabled(enabled));
        }

        public setValue(value: string)
        {
            var index = this.values.indexOf(value);
            if ((index >= 0) && (index < this.radioButtons.length))
            {
                this.radioButtons[index].setSelected(true);
            }
        }

        public getValue(): string
        {
            for (var i = 0; i < this.values.length; i++)
            {
                if (this.radioButtons[i].isSelected()) return this.values[i];
            }
            return null;
        }
    }


    // Enables setting focus on a DIV so you can capture keyboard events
    // Creates a hidden text box and sets focus to it when child is clicked on
    export class FocusPanel extends Control
    {
        private $hiddenTextBox: JQuery;
        private keypressHandler: (evt: JQueryKeyEventObject) => void = null;
        private keydownHandler: (evt: JQueryKeyEventObject) => void = null;

        constructor(element: any)
        {
            super(element);

            // This is used to allow a non-input control to capture key input (specifically the video player controls)
            // But on a touch device setting the focus to a text input control causes the keyboard to pop up
            // so lets just not do it on touch device...
            if (!Platform.isTouchDevice())
            {
                this.$hiddenTextBox = $("<input type='text' tabindex='-1' role='presentation' "
                    + "style='opacity: 0; position: absolute; bottom: 0px; right:0px; "
                    + "height: 1px; width: 1px; z-index: -1; overflow: hidden; '>").appendTo($("body"));

                this.$element.on("click", (evt) => this.$hiddenTextBox.focus());

                this.$hiddenTextBox.keypress((evt) =>
                {
                    if (this.keypressHandler) this.keypressHandler(evt);
                });

                this.$hiddenTextBox.keydown((evt) =>
                {
                    if (this.keydownHandler) this.keydownHandler(evt);
                });
            }
        }

        public focus()
        {
            this.$hiddenTextBox.focus();
        }

        public onKeyPress(keypressHandler: (evt: JQueryKeyEventObject) => void)
        {
            this.keypressHandler = keypressHandler;
        }
        public onKeyDown(keydownHandler: (evt: JQueryKeyEventObject) => void)
        {
            this.keydownHandler = keydownHandler;
        }
    }

    export class DraggableListBox extends Control
    {
        private selectionChangedHandler: (evt: any) => void = null;
        private dropHandler: (items: string[]) => void = null;

        private listModel: ListItem[] = [];
        private $UL: JQuery;
        private dragManager = new DragManager();
        private currentDragEvent: DragDropEvent = null;

        constructor(element: any)
        {
            super(element);

            this.$element.addClass("listbox");

            // Create list inside passed in DIV
            this.$UL = $("<ul>").appendTo(this.$element);

            // click on the background of the list de-selects eveything 
            this.$element.on("click", (evt) => this.setSelectedIndex(-1));

            // wire up drag manager events
            this.dragManager.onDragStart((evt) => this.dragManager_onDragStart(evt));
            this.dragManager.onTrackDrag((evt, overTarget) => this.dragManager_onTrackDrag(evt, overTarget));
            this.dragManager.onDrop((evt) => this.dragManager_onDrop(evt));

            // Register the whole control as a drop target
            this.dragManager.registerDropTarget(this.getElement());
        }

        // Register for selection changed events
        public onSelectionChanged(selectionChangedHandler: (evt: any) => void)
        {
            this.selectionChangedHandler = selectionChangedHandler;
        }

        // Register for notification when user drags items to list
        public onDrop(dragDropHandler: (evt: string[]) => void)
        {
            this.dropHandler = dragDropHandler;
        }

        public clear(): void
        {
            this.$UL.empty();
            this.listModel = [];
        }

        public add(value: string, text: string = null, tooltip: string = null)
        {
            var $li = $("<li id='" + this.elementId + "_" + this.listModel.length + "'>" + (text || value) + "</li>").appendTo(this.$UL);

            this.dragManager.$registerDragSource($li);

            $li.on("mousedown", (evt) => this.onItemMouseDown(evt));
            $li.on("click", (evt) =>
            {
                evt.stopPropagation();
                this.onItemClick(evt);
                return false;
            });
            this.listModel.push({ value: value, text: text, tooltip: tooltip, isSelected: false });
        }

        public getSelectedValue(): string
        {
            var selectedValues = this.getSelectedValues();
            return selectedValues.length > 0 ? selectedValues[0] : null;
        }

        public getSelectedValues(): string[]
        {
            return this.listModel.filter((item) => item.isSelected).map((item) => item.value);
        }

        public getAllValues(): string[]
        {
            return this.listModel.map((item) => item.value);
        }

        public getSelectedIndex(): number
        {
            var selectedIndices = this.getSelectedIndices();
            return selectedIndices.length > 0 ? selectedIndices[0] : -1;
        }

        public getSelectedIndices(): number[]
        {
            return this.listModel.map((item, i) => item.isSelected ? i : null).filter((index) => index != null);
        }

        public setSelectedIndex(index: number)
        {
            // clear existing selection
            this.$UL.children().removeClass("selected");
            $.each(this.listModel, (i, item) => { item.isSelected = false; });

            if (index != -1)
            {
                $("#" + this.elementId + "_" + index).addClass("selected");
                this.listModel[index].isSelected = true;
            }
            this.fireSelectionChanged();
        }

        // Handling selection in the presense of drag and drop is fiddly as the use needs selection
        // feedback on mouse down rather than click (so the item to be dragged gets selected before it gets dragged)
        // But, have handle cases where draggin already selected items vs. dragging item that isn't selected
        // when otehr items are.... Fiddly.
        private onItemMouseDown(evt: JQueryEventObject): any
        {
            var selectedIndex = this.getIndexFromElementId((<HTMLElement>evt.delegateTarget).id);

            // handle multi-select
            var oldSelectedIndex = this.getSelectedIndex();
            if (evt.shiftKey && oldSelectedIndex != -1)
            {
                for (var i = Math.min(selectedIndex, oldSelectedIndex); i <= Math.max(selectedIndex, oldSelectedIndex); i++)
                {
                    $("#" + this.elementId + "_" + i).addClass("selected");
                    this.listModel[i].isSelected = true;
                }
                this.getSelectedIndex();
                this.fireSelectionChanged();
            }
            else
            {
                // When user mouse downs on an element that is not already selected and they aren't
                // holding the ctrl key then deselect everything before selecting the clicked item.
                // BUT if user mouse downs on an item that IS selected (and other items are also selected)
                // then we they may either be about to drag the selection or they want to discard the 
                // selection and replace it with the clicked item - but we can't know that until the mouse up
                // so that one case is handled in the click handler)
                if (!evt.ctrlKey && !this.listModel[selectedIndex].isSelected)
                {
                    this.$UL.children().removeClass("selected");
                    $.each(this.listModel, (i, item) => { item.isSelected = false; });
                }
                $(evt.delegateTarget).addClass("selected");
                this.listModel[selectedIndex].isSelected = true;
                this.fireSelectionChanged();
            }
            evt.preventDefault();
            return false;
        }

        private onItemClick(evt: JQueryEventObject)
        {
            // Handle the case where user click on a selected item in a multi-selected set of items
            // and they didn't drag them - so deselect the other items
            var selectedIndex = this.getIndexFromElementId((<HTMLElement>evt.delegateTarget).id);
            if (!evt.ctrlKey && !evt.shiftKey && this.listModel[selectedIndex].isSelected)
            {
                $.each(this.listModel, (i, item) =>
                {
                    if (i != selectedIndex)
                    {
                        item.isSelected = false;
                        $("#" + this.elementId + "_" + i).removeClass("selected");
                    }
                });
                this.fireSelectionChanged();
            }
        }

        // Internal drag-drop handling
        private dragManager_onDragStart(evt: DragDropEvent)
        {
            this.currentDragEvent = evt;

            var selectedValues = this.getSelectedValues().join(",");
            evt.data = selectedValues;
            if (this.getSelectedValues().length > 1)
            {
                // Create a 'stack' image to drag
                var $dragElement = $("<div>");
                $dragElement.css("position", "relative");
                $dragElement.css("width", $(evt.sourceElement).width() + 16);
                $dragElement.css("height", $(evt.sourceElement).height() + 16);

                var backgroundColor = $.Color($(evt.sourceElement).css("background-color"));
                var style = {
                    "position": "absolute",
                    "width": $(evt.sourceElement).width(),
                    "height": $(evt.sourceElement).height(),
                    "top": "",
                    "left": "",
                    "background-color": backgroundColor.toRgbaString(),
                    "cursor": "default"
                };

                var $shadow1 = $("<div>").appendTo($dragElement);
                style.top = style.left = "8px";
                style["background-color"] = backgroundColor.lightness(backgroundColor.lightness() * 0.95).toRgbaString();
                $shadow1.css(style);

                var $shadow2 = $("<div>").appendTo($dragElement);
                style.top = style.left = "4px";
                style["background-color"] = backgroundColor.lightness(backgroundColor.lightness() * 0.975).toRgbaString();
                $shadow2.css(style);

                var $mainElement = $("<div>" + this.listModel[this.getSelectedIndex()].text + "</div>").appendTo($dragElement);
                style.top = style.left = "0px";
                style["background-color"] = backgroundColor.toRgbaString();
                $mainElement.css(style);

                evt.visualDragElement = $dragElement.get(0);
            }
        }

        private dragManager_onTrackDrag(evt: DragDropEvent, overTarget: boolean)
        {
            if (overTarget && (this.currentDragEvent !== evt))
            {
                this.$element.addClass("dragover");
            }
            else
            {
                this.$element.removeClass("dragover");
            }
        }

        private dragManager_onDrop(evt: DragDropEvent)
        {
            if (this.dropHandler)
            {
                this.dropHandler(evt.data ? evt.data.split(",") : []);
            }
        }


        private getIndexFromElementId(elementId: string): number
        {
            return Number(elementId.substring(elementId.lastIndexOf("_") + 1));
        }

        private fireSelectionChanged()
        {
            if (this.selectionChangedHandler)
            {
                this.selectionChangedHandler({ src: this });
            }
        }

    }

    export class Timer
    {
        private intervalMilliseconds: number;
        private timerHandle: number = null;
        private task: () => void;

        constructor(intervalMilliseconds: number, task: () => void)
        {
            this.intervalMilliseconds = intervalMilliseconds;
            this.task = task;
        }

        public start()
        {
            if (this.timerHandle) 
            {
                this.stop();
            }
            this.timerHandle = window.setInterval(this.task, this.intervalMilliseconds);
        }

        public stop()
        {
            window.clearInterval(this.timerHandle);
            this.timerHandle = null;
        }

        public static defer(delayMilliseconds: number, task: () => void)
        {
            // It can be useful to have an optional delay - so allow zero to mean just call task
            if (delayMilliseconds == 0) 
            {
                task()
            }
            else
            {
                window.setTimeout(task, delayMilliseconds);
            }
        }
    }

    export class Dispatcher
    {
        private static messageName = "dispatch-task";
        private static tasks: { (): void }[] = null;

        public static dispatch(task: () => void)
        {
            if (Dispatcher.tasks == null)
            {
                Dispatcher.tasks = [task];
                if (window.addEventListener)
                {
                    window.addEventListener("message", Dispatcher.messagehandler, true);
                }
                else
                {
                    window.attachEvent("onmessage", Dispatcher.messagehandler);
                }
            }
            else
            {
                Dispatcher.tasks.push(task);
            }
            window.postMessage(Dispatcher.messageName, "*");
        }

        private static messagehandler(event: MessageEvent)
        {
            if (event.source == window && event.data == Dispatcher.messageName)
            {
                if (event.stopPropagation)
                {
                    event.stopPropagation();
                } 
                else
                {
                    // IE
                    (<any>event).returnValue = false;
                }
                
                if (Dispatcher.tasks.length > 0)
                {
                    var task = Dispatcher.tasks.shift();
                    task();
                }
            }
        }
    }

    interface EventListener<T>
    {
        (evt: T): void;
    }

    export class EventListeners<T>
    {
        private listeners: EventListener<T>[] = [];

        constructor()
        { }

        public addListener(listener: (evt: T) => void)
        {
            this.listeners.push(listener);
        }

        public removeListener(listener: (evt: T) => void)
        {
            this.listeners = this.listeners.filter((l) => listener !== l);
        }

        public notifyListeners(evt: T)
        {
            for (var i = 0; i < this.listeners.length; i++)
            {
                this.listeners[i](evt);
            }
        }
    }


    export class Console
    {
        public static debug(msg: string)
        {
            if (typeof console != "undefined") { console.log(msg); }
        }
    }


}