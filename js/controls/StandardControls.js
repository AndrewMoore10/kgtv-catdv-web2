var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var controls;
(function (controls) {
    var Platform = util.Platform;
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
    var Element = (function () {
        function Element(element) {
            this.$element = Element.get$(element);
            this.elementId = this.$element.length > 0 ? this.$element.get(0).id : null;
        }
        // Return a JQquery object that wraps the specified element
        // The element parameter may be an element ID string, an HTMLELement or a JQuery object 
        // (in which case it is just returned).
        Element.get$ = function (element) {
            if (typeof element === "string") {
                return $("#" + element);
            }
            else if (element.$element) {
                return element.$element;
            }
            else if (typeof element === "HTMLElement") {
                return $(element);
            }
            else {
                return element;
            }
        };
        // Utility function to render an HTML tag based on passed in options
        Element.render = function (tag, options, tagContext) {
            if (tagContext === void 0) { tagContext = ""; }
            var html = "<" + tag;
            if (options) {
                for (var option in options) {
                    var optionValue = options[option];
                    if (typeof optionValue == 'Boolean') {
                        if (optionValue) {
                            html += " " + option;
                        }
                    }
                    else if ((typeof optionValue != 'Object') && (typeof optionValue != 'Array')) {
                        html += " " + option + "='" + optionValue + "'";
                    }
                }
            }
            html += ">" + tagContext + "</" + tag + ">";
            return html;
        };
        // Utility function to convert a string into a valid element id
        Element.toID = function (str) {
            return str.replace(new RegExp('[^A-Za-z0-9]', 'g'), "_");
        };
        Element.prototype.getElement = function () {
            return document.getElementById(this.elementId);
        };
        Element.prototype.setSize = function (width, height) {
            this.setWidth(width);
            this.setHeight(height);
        };
        Element.prototype.getLeft = function () {
            return this.$element.position().left;
        };
        Element.prototype.setLeft = function (left) {
            this.$element.css({ "left": left });
        };
        Element.prototype.getTop = function () {
            return this.$element.position().top;
        };
        Element.prototype.setTop = function (top) {
            this.$element.css({ "top": top });
        };
        Element.prototype.getBottom = function () {
            return parseInt(this.$element.css("bottom"));
        };
        Element.prototype.setBottom = function (bottom) {
            this.$element.css({ "bottom": bottom });
        };
        Element.prototype.getRight = function () {
            return parseInt(this.$element.css("right"));
        };
        Element.prototype.setRight = function (right) {
            this.$element.css({ "right": right });
        };
        Element.prototype.getWidth = function () {
            return this.$element.width();
        };
        Element.prototype.setWidth = function (width) {
            this.$element.css({ "width": width });
        };
        Element.prototype.getHeight = function () {
            return this.$element.height();
        };
        Element.prototype.setHeight = function (height) {
            this.$element.css({ "height": height });
        };
        // Get postiion of element relative to document
        Element.prototype.getAbsoluteLeft = function () {
            return this.$element.offset().left;
        };
        Element.prototype.getAbsoluteTop = function () {
            return this.$element.offset().top;
        };
        Element.prototype.css = function (css) {
            return this.$element.css(css);
        };
        Element.prototype.show = function (show) {
            if ((typeof show == "undefined") || (show == true)) {
                this.$element.show();
            }
            else {
                this.$element.hide();
            }
        };
        Element.prototype.hide = function () {
            this.$element.hide();
        };
        Element.prototype.onClick = function (clickHandler) {
            this.$element.click(function (evt) {
                clickHandler(evt);
            });
        };
        return Element;
    })();
    controls.Element = Element;
    (function (Direction) {
        Direction[Direction["Horizontal"] = 1] = "Horizontal";
        Direction[Direction["Vertical"] = 2] = "Vertical";
    })(controls.Direction || (controls.Direction = {}));
    var Direction = controls.Direction;
    var DraggableElement = (function (_super) {
        __extends(DraggableElement, _super);
        function DraggableElement(element, direction, minPosition, maxPosition) {
            var _this = this;
            _super.call(this, element);
            this.gotMouseDown = false;
            this.dragging = false;
            this.disabled = false;
            this.ignoreClick = false;
            this.dragHandler = null;
            this.dropHandler = null;
            this.element = this.$element.get(0);
            this.direction = direction;
            this.setLimits(minPosition, maxPosition);
            this.$element.on("mousedown", function (evt) { return _this.handleMouseDown(evt); });
            this.mouseMoveHandler = function (evt) { return _this.handleMouseMove(evt); };
            this.mouseUpHandler = function (evt) { return _this.handleMouseUp(evt); };
            // stop parent picking up click event at drag end
            //            this.$element.on("click", (evt) =>
            //            {
            //                evt.cancelBubble = true;
            //                evt.preventDefault();
            //                return false;
            //            });
        }
        // Override Element.onClick
        DraggableElement.prototype.onClick = function (clickHandler) {
            var _this = this;
            this.$element.click(function (evt) {
                if (!_this.ignoreClick) {
                    clickHandler(evt);
                }
                else {
                    _this.ignoreClick = false;
                    evt.cancelBubble = true;
                    evt.preventDefault();
                    return false;
                }
            });
        };
        DraggableElement.prototype.onDrag = function (dragHandler) {
            this.dragHandler = dragHandler;
        };
        DraggableElement.prototype.onDrop = function (dropHandler) {
            this.dropHandler = dropHandler;
        };
        DraggableElement.prototype.isDragging = function () {
            return this.dragging;
        };
        DraggableElement.prototype.setLimits = function (minPosition, maxPosition) {
            this.minPosition = minPosition;
            this.maxPosition = maxPosition - ((this.direction == 1 /* Horizontal */) ? this.getWidth() : this.getHeight());
            Console.debug("drag limits minPosition:" + this.minPosition + ",maxPosition:" + this.maxPosition + ",width:" + this.getWidth());
            if (this.direction == 1 /* Horizontal */) {
                this.element.style.left = Math.min(this.maxPosition, Math.max(this.minPosition, this.$element.position().left)) + "px";
            }
            else {
                this.element.style.top = Math.min(this.maxPosition, Math.max(this.minPosition, this.$element.position().top)) + "px";
            }
        };
        DraggableElement.prototype.setDisabled = function (disabled) {
            this.disabled = disabled;
            if (disabled) {
                this.$element.addClass("disabled");
            }
            else {
                this.$element.removeClass("disabled");
            }
        };
        DraggableElement.prototype.handleMouseDown = function (evt) {
            if (!this.disabled) {
                if (this.element.setCapture) {
                    // Firefox, IE
                    this.element.setCapture(false);
                    this.$element.on("mousemove", this.mouseMoveHandler);
                    this.$element.on("mouseup", this.mouseUpHandler);
                }
                else {
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
        };
        DraggableElement.prototype.handleMouseMove = function (evt) {
            if (!this.dragging && this.gotMouseDown && (evt.clientX != this.startMouseX || evt.clientY != this.startMouseY)) {
                // mouse has moved since mouse down - start drag
                this.dragging = true;
            }
            if (this.dragging && !this.disabled) {
                var position;
                if (this.direction == 1 /* Horizontal */) {
                    var deltaX = evt.clientX - this.startMouseX;
                    position = Math.min(this.maxPosition, Math.max(this.minPosition, this.startElementLeft + deltaX));
                    //                    Console.debug("mousemove clientX:" + evt.clientX + ",deltaX:" + deltaX + ",this.maxPosition:" + this.maxPosition + ",this.minPosition:" + this.minPosition + ", position:" + position);
                    this.element.style.left = position + "px";
                }
                else {
                    var deltaY = evt.clientY - this.startMouseY;
                    position = Math.min(this.maxPosition, Math.max(this.minPosition, this.startElementTop + deltaY));
                    this.element.style.top = position + "px";
                }
                if (this.dragHandler) {
                    this.dragHandler({ element: this.element, position: position });
                }
                evt.preventDefault();
                evt.cancelBubble = true;
                this.ignoreClick = true;
                return false;
            }
            else {
                return true;
            }
        };
        DraggableElement.prototype.handleMouseUp = function (evt) {
            this.gotMouseDown = false;
            if (this.dragging && !this.disabled) {
                this.dragging = false;
                this.css({ "z-index": this.savedZIndex });
                if (this.element.setCapture) {
                    // Firefox, IE
                    this.element.releaseCapture();
                    this.$element.off("mousemove", this.mouseMoveHandler);
                    this.$element.off("mouseup", this.mouseUpHandler);
                }
                else {
                    // Chrome doesn't support setCapture()
                    $(document).off("mousemove", this.mouseMoveHandler);
                    $(document).off("mouseup", this.mouseUpHandler);
                }
                if (this.dropHandler) {
                    this.dropHandler({ element: this.element, position: parseInt(this.element.style.left) });
                }
                evt.preventDefault();
                return false;
            }
            else {
                return true;
            }
        };
        return DraggableElement;
    })(Element);
    controls.DraggableElement = DraggableElement;
    // Base class for Panels (User Controls)
    var Panel = (function (_super) {
        __extends(Panel, _super);
        function Panel(element) {
            _super.call(this, element);
        }
        Panel.prototype.clear = function () {
            this.$element.empty();
        };
        return Panel;
    })(Element);
    controls.Panel = Panel;
    // Base class for all controls
    var Control = (function (_super) {
        __extends(Control, _super);
        function Control(element) {
            _super.call(this, element);
        }
        return Control;
    })(Element);
    controls.Control = Control;
    // Form controls encompases input controls and action controls (buttons). Support enable/disable.
    var FormControl = (function (_super) {
        __extends(FormControl, _super);
        function FormControl() {
            _super.apply(this, arguments);
        }
        FormControl.prototype.setEnabled = function (enabled) {
            if (enabled) {
                this.$element.removeAttr("disabled");
            }
            else {
                this.$element.attr("disabled", "disabled");
            }
        };
        return FormControl;
    })(Control);
    controls.FormControl = FormControl;
    // Input Controls (<input>, <select> and <textarea>) that support changed events
    var InputControl = (function (_super) {
        __extends(InputControl, _super);
        function InputControl(element) {
            _super.call(this, element);
        }
        InputControl.prototype.onChanged = function (changeHandler) {
            this.$element.change(function (evt) {
                changeHandler(evt);
            });
        };
        return InputControl;
    })(FormControl);
    controls.InputControl = InputControl;
    var Button = (function (_super) {
        __extends(Button, _super);
        function Button(element) {
            _super.call(this, element);
        }
        Button.create = function (buttonText, options, parent) {
            return new Button($(Element.render("button", options, buttonText)).appendTo(Element.get$(parent)));
        };
        return Button;
    })(FormControl);
    controls.Button = Button;
    var Image = (function (_super) {
        __extends(Image, _super);
        function Image(element) {
            _super.call(this, element);
        }
        Image.create = function (options, parent) {
            return new TextBox($(Element.render("img", options)).appendTo(Element.get$(parent)));
        };
        Image.prototype.setSourceUrl = function (url) {
            this.$element.attr("src", url);
        };
        return Image;
    })(Control);
    controls.Image = Image;
    var TextBox = (function (_super) {
        __extends(TextBox, _super);
        function TextBox(element) {
            _super.call(this, element);
        }
        TextBox.create = function (options, parent) {
            return new TextBox($(Element.render("input", $.extend({ "type": "text" }, options))).appendTo(Element.get$(parent)));
        };
        TextBox.prototype.setText = function (value) {
            this.$element.val(value);
        };
        TextBox.prototype.getText = function () {
            return this.$element.val();
        };
        TextBox.prototype.setReadOnly = function (readonly) {
            this.$element.prop("readonly", readonly);
        };
        // Input event fires immediately unlike changed which only fires on lost focus
        TextBox.prototype.onInput = function (inputHandler) {
            // Something on the Mac eats input, change and keypress events - so we have to use keyup!
            if (Platform.isMac()) {
                this.$element.on("keyup", function (evt) {
                    inputHandler(evt);
                });
            }
            else {
                this.$element.on("input", function (evt) {
                    inputHandler(evt);
                });
            }
        };
        return TextBox;
    })(InputControl);
    controls.TextBox = TextBox;
    var TextArea = (function (_super) {
        __extends(TextArea, _super);
        function TextArea(element) {
            _super.call(this, element);
        }
        TextArea.create = function (options, parent) {
            return new TextArea($(Element.render("textarea", options)).appendTo(Element.get$(parent)));
        };
        TextArea.prototype.setText = function (value) {
            this.$element.val(value);
        };
        TextArea.prototype.getText = function () {
            return this.$element.val();
        };
        TextArea.prototype.setReadOnly = function (readonly) {
            this.$element.prop("readonly", readonly);
        };
        return TextArea;
    })(InputControl);
    controls.TextArea = TextArea;
    // Can wrap any HTML element with text content
    var Label = (function (_super) {
        __extends(Label, _super);
        function Label(element) {
            _super.call(this, element);
        }
        Label.prototype.setText = function (value) {
            this.$element.text(value);
        };
        return Label;
    })(Control);
    controls.Label = Label;
    var DropDownList = (function (_super) {
        __extends(DropDownList, _super);
        function DropDownList(element) {
            _super.call(this, element);
        }
        DropDownList.create = function (options, parent) {
            var newDropDownList = new DropDownList($(Element.render("select", options)).appendTo(Element.get$(parent)));
            if (options.values) {
                newDropDownList.setItems(options.values.map(function (s) {
                    return { value: s, text: s };
                }));
            }
            else if (options.items) {
                newDropDownList.setItems(options.items);
            }
            return newDropDownList;
        };
        DropDownList.prototype.clearItems = function () {
            this.$element.empty();
        };
        DropDownList.prototype.setItems = function (items) {
            var _this = this;
            this.$element.empty();
            if (items) {
                items.forEach(function (item) { return _this.addItem(item); });
            }
        };
        DropDownList.prototype.addItem = function (item) {
            var $option = $("<option value='" + item.value + "' " + (item.isSelected ? " selected" : "") + "/>").appendTo(this.$element);
            $option.text(item.text);
        };
        DropDownList.prototype.getSelectedIndex = function () {
            return this.$element.find("option:selected").index();
        };
        DropDownList.prototype.getSelectedValue = function () {
            return this.$element.val();
        };
        DropDownList.prototype.setSelectedValue = function (value) {
            this.$element.val(value);
            return this;
        };
        return DropDownList;
    })(InputControl);
    controls.DropDownList = DropDownList;
    var MultiSelectDropDownList = (function (_super) {
        __extends(MultiSelectDropDownList, _super);
        function MultiSelectDropDownList(element, fixedValues, dataSource) {
            var _this = this;
            if (dataSource === void 0) { dataSource = null; }
            _super.call(this, element);
            this.enabled = true;
            this.popupVisible = false;
            this.listItems = [];
            this.itemCheckBoxes = [];
            this.selectedIndexes = [];
            // To support user navigating up and down list items with cursor keys
            this.currentIndex = null;
            this.changeHandler = null;
            // Save reference to handler so we can wire/unwire it as required
            this.backgroundClickHandler = null;
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
            this.backgroundClickHandler = function (evt) {
                if (_this.popupVisible)
                    _this.showPopup(false);
            };
            this.refreshList();
            this.$inputWrapper.click(function (evt) {
                if (_this.enabled) {
                    _this.showPopup(!_this.popupVisible);
                    evt.stopPropagation();
                }
            });
            this.$input.keyup(function (evt) {
                if (_this.enabled) {
                    _this.input_keyPress(evt);
                }
            });
        }
        MultiSelectDropDownList.create = function (options, fixedValues, dataSource, parent) {
            return new MultiSelectDropDownList($(Element.render("select", options)).appendTo(Element.get$(parent)), fixedValues, dataSource);
        };
        MultiSelectDropDownList.prototype.onChanged = function (changeHandler) {
            this.changeHandler = changeHandler;
        };
        MultiSelectDropDownList.prototype.setEnabled = function (enabled) {
            this.enabled = enabled;
        };
        MultiSelectDropDownList.prototype.getSelectedItems = function () {
            var _this = this;
            var selectedItems = [];
            this.selectedIndexes.forEach(function (index, i) {
                selectedItems.push(_this.listItems[index]);
            });
            return selectedItems;
        };
        MultiSelectDropDownList.prototype.getSelectedValues = function () {
            return this.getSelectedItems().map(function (item) { return item.value; });
        };
        MultiSelectDropDownList.prototype.setSelectedValues = function (values) {
            var _this = this;
            this.selectedIndexes = [];
            this.$popup.find("input[type=checkbox]").prop("checked", false);
            if (values && values.forEach) {
                values.forEach(function (value) {
                    _this.listItems.forEach(function (item, i) {
                        if (item.value == value) {
                            _this.selectedIndexes.push(i);
                            _this.itemCheckBoxes[i].prop("checked", true);
                        }
                    });
                });
            }
            this.updateDisplayedValue();
        };
        MultiSelectDropDownList.prototype.getText = function () {
            return this.$input.val();
        };
        MultiSelectDropDownList.prototype.setText = function (text) {
            this.$input.val(text);
        };
        MultiSelectDropDownList.prototype.refreshList = function () {
            var _this = this;
            this.$popup.empty();
            this.selectedIndexes = [];
            this.itemCheckBoxes = [];
            this.dataSource.getItems(null, function (items) {
                _this.listItems = items;
                _this.listItems.forEach(function (item, i) {
                    var $item = $("<div class='item " + (item.cssClass || "") + "'>").appendTo(_this.$popup);
                    var $checkbox = $("<input type='checkbox'>").appendTo($item);
                    $(document.createTextNode(item.text)).appendTo($item);
                    _this.itemCheckBoxes.push($checkbox);
                    $checkbox.click(function (evt) {
                        _this.item_selectionUpdated(i, $checkbox.prop("checked") ? true : false);
                        evt.stopPropagation();
                    });
                    $item.click(function (evt) {
                        $checkbox.prop("checked", !($checkbox.prop("checked")));
                        _this.item_selectionUpdated(i, $checkbox.prop("checked") ? true : false);
                        evt.stopPropagation();
                    });
                    if (item.isSelected) {
                        _this.selectedIndexes.push(i);
                    }
                });
                _this.updateDisplayedValue();
            });
        };
        MultiSelectDropDownList.prototype.input_keyPress = function (evt) {
            Console.debug("keyup - evt.keyCode:" + evt.keyCode);
            if (evt.keyCode == 40) {
                this.showPopup(true);
                this.currentIndex = (this.currentIndex != null) ? Math.min(this.currentIndex + 1, this.listItems.length - 1) : 0;
                this.$popup.children().removeClass("selected");
                this.$popup.children().eq(this.currentIndex).addClass("selected");
            }
            else if ((evt.keyCode == 38) && (this.currentIndex != null)) {
                this.currentIndex = Math.max(this.currentIndex - 1, 0);
                this.$popup.children().removeClass("selected");
                this.$popup.children().eq(this.currentIndex).addClass("selected");
            }
            else if ((evt.keyCode == 32) && (this.currentIndex != null)) {
                var $checkbox = this.itemCheckBoxes[this.currentIndex];
                $checkbox.prop("checked", !($checkbox.prop("checked")));
                this.item_selectionUpdated(this.currentIndex, $checkbox.prop("checked") ? true : false);
            }
            else if (evt.keyCode == 13) {
                if (this.currentIndex != null) {
                    this.showPopup(false);
                }
            }
        };
        MultiSelectDropDownList.prototype.item_selectionUpdated = function (itemIndex, isSelected) {
            if (isSelected) {
                this.selectedIndexes.push(itemIndex);
            }
            else {
                this.selectedIndexes = this.selectedIndexes.filter(function (i) { return i != itemIndex; });
            }
            this.updateDisplayedValue();
            this.$input.focus();
            this.fireChangeEvent();
        };
        MultiSelectDropDownList.prototype.updateDisplayedValue = function () {
            var _this = this;
            var value = "";
            this.selectedIndexes.forEach(function (index, i) {
                if (i > 0)
                    value += ",";
                value += _this.listItems[index].text;
            });
            this.$input.val(value);
        };
        MultiSelectDropDownList.prototype.showPopup = function (show) {
            if (show != this.popupVisible) {
                if (show) {
                    this.$popup.show();
                    this.popupVisible = true;
                    // manually add/remove "focus" class so we can arrange for hover outline to 
                    // stay visible in clip details view while pop-up is open. 
                    this.$inputWrapper.addClass("focus");
                    $(document).on("click", this.backgroundClickHandler);
                }
                else {
                    this.$popup.hide();
                    this.$popup.children().removeClass("selected");
                    this.popupVisible = false;
                    this.currentIndex = null;
                    // manually add/remove "focus" class 
                    this.$inputWrapper.removeClass("focus");
                    $(document).off("click", this.backgroundClickHandler);
                }
            }
        };
        MultiSelectDropDownList.prototype.fireChangeEvent = function () {
            if (this.changeHandler)
                this.changeHandler({ "src": this });
        };
        return MultiSelectDropDownList;
    })(Control);
    controls.MultiSelectDropDownList = MultiSelectDropDownList;
    var ComboBox = (function (_super) {
        __extends(ComboBox, _super);
        function ComboBox(element, fixedValues, dataSource) {
            var _this = this;
            if (fixedValues === void 0) { fixedValues = true; }
            if (dataSource === void 0) { dataSource = null; }
            _super.call(this, element);
            this.enabled = true;
            this.popupVisible = false;
            this.selectedItem = null;
            this.inPopupClick = false;
            this.allItems = [];
            this.currentItems = [];
            this.currentIndex = null;
            this.changeHandler = null;
            this.fixedValues = fixedValues;
            if (dataSource != null) {
                this.dataSource = dataSource;
            }
            else {
                // Read items from existing markup    
                var listItems = [];
                this.$element.find("option").each(function (i, element) {
                    listItems.push({
                        value: _this.getAttribute(element, "value"),
                        tooltip: _this.getAttribute(element, "tool-tip"),
                        isSelected: _this.getAttribute(element, "selected") ? true : false,
                        text: element.textContent || ""
                    });
                });
                this.dataSource = new controls.SimpleListDataSource(listItems);
            }
            // Replace passed in custom combo element with actual markup
            var cssClass = this.$element.attr("class") || "";
            var $comboDiv = $("<div id='" + this.elementId + "' class='dropdown-list auto-suggest' style='position: relative;'/>");
            this.$element.replaceWith($comboDiv);
            this.$element = $comboDiv;
            this.$inputWrapper = $("<div class='input' style='position: relative;'/>").appendTo(this.$element);
            if (this.fixedValues) {
                this.$previewInput = $("<input type=text  class='preview " + cssClass + "'/>").appendTo(this.$inputWrapper);
            }
            this.$input = $("<input type=text  class='" + cssClass + "'/>").appendTo(this.$inputWrapper);
            if (this.fixedValues) {
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
            if (this.fixedValues) {
                this.preloadData();
            }
            this.$arrow.click(function (evt) {
                if (_this.enabled) {
                    _this.showPopup(!_this.popupVisible);
                }
            });
            this.$input.keydown(function (evt) {
                if (!_this.enabled || !_this.fixedValues)
                    return;
                Console.debug("keydown - evt.keyCode:" + evt.keyCode);
                if ((evt.keyCode == 46) || (evt.keyCode == 8)) {
                    // Calculate what text would look like if this key was processed
                    var selection = _this.getInputSelection(_this.$input.get(0));
                    var oldValue = _this.$input.val();
                    var textAfterKeyPressApplied;
                    if (selection.start == selection.end) {
                        if (evt.keyCode == 46) {
                            textAfterKeyPressApplied = oldValue.substring(0, selection.start) + oldValue.substring(selection.start + 1);
                        }
                        else {
                            textAfterKeyPressApplied = oldValue.substring(0, selection.start - 1) + oldValue.substring(selection.start);
                        }
                    }
                    else {
                        textAfterKeyPressApplied = oldValue.substring(0, selection.start) + oldValue.substring(selection.end);
                    }
                    var match = _this.allItems.find(function (item) { return item.text.toLowerCase().startsWith(textAfterKeyPressApplied.toLowerCase()); });
                    Console.debug("match:" + match);
                    return match ? true : false;
                }
            });
            this.$input.keyup(function (evt) {
                if (!_this.enabled)
                    return;
                // Process control keys
                Console.debug("keyup - evt.keyCode:" + evt.keyCode);
                if (!_this.enabled)
                    return;
                if (evt.keyCode == 40) {
                    _this.showPopup(true);
                    _this.currentIndex = (_this.currentIndex != null) ? Math.min(_this.currentIndex + 1, _this.currentItems.length - 1) : 0;
                    _this.$popup.children().removeClass("selected");
                    _this.$popup.children().eq(_this.currentIndex).addClass("selected");
                    _this.setSelectedItem(_this.currentItems[_this.currentIndex]);
                }
                else if ((evt.keyCode == 38) && (_this.currentIndex != null)) {
                    _this.currentIndex = Math.max(_this.currentIndex - 1, 0);
                    _this.$popup.children().removeClass("selected");
                    _this.$popup.children().eq(_this.currentIndex).addClass("selected");
                    _this.setSelectedItem(_this.currentItems[_this.currentIndex]);
                }
                else if (evt.keyCode == 13) {
                    if (_this.currentIndex != null) {
                        _this.setSelectedItem(_this.currentItems[_this.currentIndex]);
                        _this.showPopup(false);
                    }
                }
                else if ((evt.keyCode != 9) && (evt.keyCode != 37) && (evt.keyCode != 39) && (evt.keyCode != 46)) {
                    Console.debug("keyup - default action");
                    Dispatcher.dispatch(function () {
                        _this.showPopup(true);
                        _this.refreshList();
                    });
                }
            });
            this.$input.keypress(function (evt) {
                if (!_this.enabled || !_this.fixedValues)
                    return;
                Console.debug("keypress - evt.keyCode:" + evt.keyCode + " String.fromCharCode(evt.charCode): '" + String.fromCharCode(evt.charCode) + "'");
                // Calculate what text would look like if this key was processed
                var selection = _this.getInputSelection(_this.$input.get(0));
                var oldValue = _this.$input.val();
                var textAfterKeyPressApplied = oldValue.substring(0, selection.start) + String.fromCharCode(evt.charCode) + oldValue.substring(selection.end);
                Console.debug("textAfterKeyPressApplied:'" + textAfterKeyPressApplied + "'");
                if (_this.allItems.find(function (item) { return item.text.toLowerCase().startsWith(textAfterKeyPressApplied.toLowerCase()); })) {
                    Dispatcher.dispatch(function () {
                        _this.showPopup(true);
                        _this.refreshList();
                    });
                    Console.debug("OK");
                    return true;
                }
                else {
                    Console.debug("Cancel");
                    return false;
                }
            });
            this.$input.blur(function (evt) {
                if (!_this.enabled)
                    return;
                // Ignore blur if it's because we clicked in the popup
                if (!_this.inPopupClick) {
                    _this.showPopup(false, false);
                    if (_this.fixedValues) {
                        // If the user has typed something - but there is no selected item
                        // see if we can find an exact match and use that
                        var userText = _this.$input.val().trim().toLowerCase();
                        if ((_this.selectedItem == null) && (_this.$input.val().trim() != "")) {
                            _this.currentItems.some(function (item, i) {
                                if (item.text.toLowerCase() == userText) {
                                    _this.setSelectedItem(item);
                                    return true;
                                }
                                else {
                                    return false;
                                }
                            });
                        }
                        _this.$input.val(_this.selectedItem ? _this.selectedItem.text : "");
                    }
                }
                _this.inPopupClick = false;
            });
        }
        ComboBox.create = function (options, fixedValues, dataSource, parent) {
            return new ComboBox($(Element.render("select", options)).appendTo(Element.get$(parent)), fixedValues, dataSource);
        };
        ComboBox.prototype.onChanged = function (changeHandler) {
            this.changeHandler = changeHandler;
        };
        ComboBox.prototype.setEnabled = function (enabled) {
            this.enabled = enabled;
            if (this.enabled) {
                this.$input.prop("readonly", false);
                this.$input.addClass("editable");
                this.$arrow.show();
            }
            else {
                this.$input.prop("readonly", true);
                this.$input.removeClass("editable");
                this.$arrow.hide();
            }
        };
        ComboBox.prototype.getSelectedItem = function () {
            return this.selectedItem;
        };
        ComboBox.prototype.getSelectedValue = function () {
            return this.selectedItem != null ? this.selectedItem.value : null;
        };
        ComboBox.prototype.setSelectedValue = function (value) {
            var _this = this;
            this.dataSource.getItems(null, function (items) {
                _this.setSelectedItem(items.find(function (item) { return item.value == value; }));
            });
        };
        ComboBox.prototype.updateDataSource = function (dataSource) {
            this.dataSource = dataSource;
            this.preloadData();
            this.refreshList();
        };
        ComboBox.prototype.getText = function () {
            return this.$input.val();
        };
        ComboBox.prototype.setText = function (text) {
            this.$input.val(text);
            this.refreshList();
        };
        ComboBox.prototype.preloadData = function () {
            var _this = this;
            // We need to perform filtering synchronously so we can check if each keypress is valid so just load all the data up front
            this.dataSource.getItems(null, function (items) {
                _this.allItems = items;
                _this.allItems.forEach(function (item) {
                    if (typeof item.text == "number") {
                        Console.debug("NUMBER!! " + _this.elementId);
                    }
                    item.text = (item.text || "").toString();
                });
                _this.refreshList();
                _this.allItems.forEach(function (item) {
                    if (item.isSelected) {
                        _this.setSelectedItem(item);
                    }
                });
            });
        };
        ComboBox.prototype.refreshList = function () {
            var _this = this;
            var filterValue = this.$input.val();
            if (this.fixedValues) {
                this.currentItems = this.allItems.filter(function (item) {
                    Console.debug("typeof item.text: " + (typeof item.text) + "item.text: " + item.text);
                    return item.text.toLowerCase().startsWith(filterValue.toLowerCase());
                });
                this.populateList();
            }
            else {
                this.dataSource.getItems(filterValue, function (items) {
                    _this.currentItems = items;
                    _this.populateList();
                });
            }
        };
        ComboBox.prototype.populateList = function () {
            var _this = this;
            this.$popup.empty();
            this.selectedItem = null;
            this.currentIndex = null;
            if (this.currentItems.length > 0) {
                this.currentItems.forEach(function (item, i) {
                    // breaks focussing because <a> tags get focus then get hidden. need another way to do tootltips
                    // var $item = $("<div class='item " + (item.cssClass || "") + "'><a href='#' title='" + item.tooltip + "' disabled>" + item.text + "</a></div>").appendTo(this.$popup);
                    var $item = $("<div class='item " + (item.cssClass || "") + "'>" + item.text + "</div>").appendTo(_this.$popup);
                    $item.click(function (evt) {
                        _this.setSelectedItem(item);
                        _this.showPopup(false);
                        _this.inPopupClick = false;
                    });
                    $item.mousedown(function (evt) {
                        _this.inPopupClick = true;
                    });
                });
                if (this.fixedValues) {
                    this.selectedItem = this.currentItems[0];
                    this.$previewInput.val(this.selectedItem.text);
                    // If what the user has typed isn't the same case as what's in the list then 'correct' the typed value
                    var textFromValue = this.selectedItem.text.substr(0, this.$input.val().length);
                    if (this.$input.val() !== textFromValue) {
                        this.$input.val(textFromValue);
                    }
                }
            }
            else {
                this.$popup.html("<i>No matches</i>");
            }
        };
        ComboBox.prototype.getAttribute = function (element, attributeName) {
            var attr = element.attributes.getNamedItem(attributeName);
            return attr != null ? attr.value : null;
        };
        ComboBox.prototype.getInputSelection = function (el) {
            if (typeof el.selectionStart == "number" && typeof el.selectionEnd == "number") {
                return {
                    start: el.selectionStart,
                    end: el.selectionEnd
                };
            }
            else {
                var range = document.selection.createRange();
                var stored_range = range.duplicate();
                stored_range.moveToElementText(el);
                stored_range.setEndPoint('EndToEnd', range);
                return {
                    start: stored_range.text.length - range.text.length,
                    end: el.selectionStart + range.text.length
                };
            }
        };
        ComboBox.prototype.setSelectedItem = function (item) {
            var changed = (item != this.selectedItem);
            this.selectedItem = item;
            this.$input.val(this.selectedItem ? this.selectedItem.text : "");
            if (this.fixedValues) {
                this.$previewInput.val("");
            }
            if (changed)
                this.fireChangeEvent();
        };
        ComboBox.prototype.showPopup = function (show, keepFocus) {
            if (keepFocus === void 0) { keepFocus = true; }
            Console.debug("showPopup(" + show + ")");
            if (show != this.popupVisible) {
                if (show) {
                    this.$popup.show();
                    this.popupVisible = true;
                }
                else {
                    this.$popup.hide();
                    this.$popup.children().removeClass("selected");
                    this.popupVisible = false;
                    this.currentIndex = null;
                    if (keepFocus)
                        this.$input.focus();
                }
            }
        };
        ComboBox.prototype.fireChangeEvent = function () {
            if (this.changeHandler)
                this.changeHandler({ "src": this });
        };
        return ComboBox;
    })(Control);
    controls.ComboBox = ComboBox;
    var ListBox = (function (_super) {
        __extends(ListBox, _super);
        function ListBox(element) {
            _super.call(this, element);
        }
        ListBox.create = function (options, parent) {
            var opts = $.extend({ "size": 5 }, options);
            if (opts.multiselect) {
                opts.multiple = "multiple";
            }
            delete opts.multiselect;
            var newListBox = new ListBox($(Element.render("select", opts)).appendTo(Element.get$(parent)));
            if (options.values) {
                newListBox.setItems(options.values.map(function (s) {
                    return { value: s, text: s };
                }));
            }
            else if (options.items) {
                newListBox.setItems(options.items);
            }
            return newListBox;
        };
        ListBox.prototype.clear = function () {
            this.$element.empty();
        };
        ListBox.prototype.add = function (value, text, tooltip) {
            if (text === void 0) { text = null; }
            if (tooltip === void 0) { tooltip = null; }
            this.$element.append(this.createOptionElement(value, text, tooltip));
        };
        ListBox.prototype.addItem = function (item) {
            this.$element.append(this.createOptionElement(item.value, item.text, item.tooltip));
        };
        ListBox.prototype.setItemAt = function (index, value, text, tooltip) {
            if (text === void 0) { text = null; }
            if (tooltip === void 0) { tooltip = null; }
            this.$element.find("option:nth-child(" + (index + 1) + ")").replaceWith(this.createOptionElement(value, text, tooltip));
        };
        ListBox.prototype.createOptionElement = function (value, text, tooltip) {
            if (text === void 0) { text = null; }
            if (tooltip === void 0) { tooltip = null; }
            return "<option value='" + value + "'" + (tooltip ? " title='" + tooltip + "'" : "") + ">" + (text || value) + "</option>";
        };
        ListBox.prototype.removeItemAt = function (index) {
            this.$element.find("option:nth-child(" + (index + 1) + ")").remove();
        };
        ListBox.prototype.setItems = function (items) {
            var _this = this;
            this.$element.empty();
            if (items) {
                items.forEach(function (item) {
                    $("<option value='" + item.value + "' " + (item.isSelected ? " selected" : "") + ">" + item.text + "</option>").appendTo(_this.$element);
                });
            }
        };
        ListBox.prototype.getItems = function () {
            var items = [];
            this.$element.find("option").each(function () {
                items.push({ value: $(this).val(), text: $(this).text() });
            });
            return items;
        };
        ListBox.prototype.getSelectedValue = function () {
            return this.$element.val();
        };
        ListBox.prototype.getSelectedValues = function () {
            var values = [];
            this.$element.find("option").each(function (i, e) {
                if ($(e).is(":selected"))
                    values.push($(e).val());
            });
            return values;
        };
        ListBox.prototype.setSelectedValue = function (value) {
            this.$element.val(value);
        };
        ListBox.prototype.getSelectedIndex = function () {
            return this.$element.find("option:selected").index();
        };
        ListBox.prototype.getSelectedIndices = function () {
            var indices = [];
            this.$element.find("option").each(function (i, e) {
                if ($(e).is(":selected"))
                    indices.push(i);
            });
            return indices;
        };
        ListBox.prototype.setSelectedIndex = function (index) {
            this.$element.find("option").removeAttr('selected');
            this.$element.find("option").eq(index).attr('selected', 'selected');
        };
        return ListBox;
    })(InputControl);
    controls.ListBox = ListBox;
    var CheckBox = (function (_super) {
        __extends(CheckBox, _super);
        function CheckBox(element) {
            _super.call(this, element);
        }
        CheckBox.create = function (options, parent) {
            return new CheckBox($(Element.render("input type='checkbox'", options)).appendTo(Element.get$(parent)));
        };
        CheckBox.prototype.isChecked = function () {
            return this.$element.prop("checked") ? true : false;
        };
        CheckBox.prototype.setChecked = function (checked) {
            this.$element.prop("checked", checked ? true : false);
            return this;
        };
        return CheckBox;
    })(InputControl);
    controls.CheckBox = CheckBox;
    var MultiCheckBoxes = (function () {
        function MultiCheckBoxes(checkBoxes, values) {
            this.values = null;
            this.checkBoxes = null;
            this.checkBoxes = checkBoxes;
            this.values = values;
        }
        MultiCheckBoxes.create = function (values, options, parent) {
            var checkBoxes = [];
            values.forEach(function (value, i) {
                var $parent = Element.get$(parent);
                var $label = $("<label class='checkbox-inline'>").appendTo($parent);
                var $checkbox = $(Element.render("input type='checkbox'", options)).appendTo($label);
                $(document.createTextNode(value)).appendTo($label);
                checkBoxes.push(new CheckBox($checkbox));
            });
            return new MultiCheckBoxes(checkBoxes, values);
        };
        MultiCheckBoxes.prototype.setEnabled = function (enabled) {
            this.checkBoxes.forEach(function (rdo) { return rdo.setEnabled(enabled); });
        };
        MultiCheckBoxes.prototype.setValues = function (values) {
            var _this = this;
            this.checkBoxes.forEach(function (checkBox, i) { return checkBox.setChecked(values.contains(_this.values[i])); });
        };
        MultiCheckBoxes.prototype.getValues = function () {
            var _this = this;
            var values = [];
            this.checkBoxes.forEach(function (checkBox, i) {
                if (checkBox.isChecked()) {
                    values.push(_this.values[i]);
                }
            });
            return values;
        };
        return MultiCheckBoxes;
    })();
    controls.MultiCheckBoxes = MultiCheckBoxes;
    var RadioButton = (function (_super) {
        __extends(RadioButton, _super);
        function RadioButton(element, parent, options) {
            if (parent === void 0) { parent = null; }
            if (options === void 0) { options = null; }
            _super.call(this, element);
        }
        RadioButton.create = function (options, parent) {
            return new RadioButton($(Element.render("input type='radio'", options)).appendTo(Element.get$(parent)));
        };
        RadioButton.prototype.isSelected = function () {
            return this.$element.prop("checked") ? true : false;
        };
        RadioButton.prototype.setSelected = function (checked) {
            this.$element.prop("checked", checked ? true : false);
            return this;
        };
        return RadioButton;
    })(InputControl);
    controls.RadioButton = RadioButton;
    var RadioButtonSet = (function () {
        function RadioButtonSet(radioButtons, values) {
            this.values = null;
            this.radioButtons = null;
            this.radioButtons = radioButtons;
            this.values = values;
        }
        RadioButtonSet.create = function (name, values, options, parent) {
            var radioButtons = [];
            values.forEach(function (value, i) {
                var $parent = Element.get$(parent);
                var $label = $("<label class='radio-inline'>").appendTo($parent);
                var rdoOptions = $.extend({ "id": name + "_" + i, "name": name }, options);
                var $radio = $(Element.render("input type='radio'", rdoOptions)).appendTo($label);
                $(document.createTextNode(value)).appendTo($label);
                radioButtons.push(new RadioButton($radio));
            });
            return new RadioButtonSet(radioButtons, values);
        };
        RadioButtonSet.prototype.setEnabled = function (enabled) {
            this.radioButtons.forEach(function (rdo) { return rdo.setEnabled(enabled); });
        };
        RadioButtonSet.prototype.setValue = function (value) {
            var index = this.values.indexOf(value);
            if ((index >= 0) && (index < this.radioButtons.length)) {
                this.radioButtons[index].setSelected(true);
            }
        };
        RadioButtonSet.prototype.getValue = function () {
            for (var i = 0; i < this.values.length; i++) {
                if (this.radioButtons[i].isSelected())
                    return this.values[i];
            }
            return null;
        };
        return RadioButtonSet;
    })();
    controls.RadioButtonSet = RadioButtonSet;
    // Enables setting focus on a DIV so you can capture keyboard events
    // Creates a hidden text box and sets focus to it when child is clicked on
    var FocusPanel = (function (_super) {
        __extends(FocusPanel, _super);
        function FocusPanel(element) {
            var _this = this;
            _super.call(this, element);
            this.keypressHandler = null;
            this.keydownHandler = null;
            // This is used to allow a non-input control to capture key input (specifically the video player controls)
            // But on a touch device setting the focus to a text input control causes the keyboard to pop up
            // so lets just not do it on touch device...
            if (!Platform.isTouchDevice()) {
                this.$hiddenTextBox = $("<input type='text' tabindex='-1' role='presentation' " + "style='opacity: 0; position: absolute; bottom: 0px; right:0px; " + "height: 1px; width: 1px; z-index: -1; overflow: hidden; '>").appendTo($("body"));
                this.$element.on("click", function (evt) { return _this.$hiddenTextBox.focus(); });
                this.$hiddenTextBox.keypress(function (evt) {
                    if (_this.keypressHandler)
                        _this.keypressHandler(evt);
                });
                this.$hiddenTextBox.keydown(function (evt) {
                    if (_this.keydownHandler)
                        _this.keydownHandler(evt);
                });
            }
        }
        FocusPanel.prototype.focus = function () {
            this.$hiddenTextBox.focus();
        };
        FocusPanel.prototype.onKeyPress = function (keypressHandler) {
            this.keypressHandler = keypressHandler;
        };
        FocusPanel.prototype.onKeyDown = function (keydownHandler) {
            this.keydownHandler = keydownHandler;
        };
        return FocusPanel;
    })(Control);
    controls.FocusPanel = FocusPanel;
    var DraggableListBox = (function (_super) {
        __extends(DraggableListBox, _super);
        function DraggableListBox(element) {
            var _this = this;
            _super.call(this, element);
            this.selectionChangedHandler = null;
            this.dropHandler = null;
            this.listModel = [];
            this.dragManager = new controls.DragManager();
            this.currentDragEvent = null;
            this.$element.addClass("listbox");
            // Create list inside passed in DIV
            this.$UL = $("<ul>").appendTo(this.$element);
            // click on the background of the list de-selects eveything 
            this.$element.on("click", function (evt) { return _this.setSelectedIndex(-1); });
            // wire up drag manager events
            this.dragManager.onDragStart(function (evt) { return _this.dragManager_onDragStart(evt); });
            this.dragManager.onTrackDrag(function (evt, overTarget) { return _this.dragManager_onTrackDrag(evt, overTarget); });
            this.dragManager.onDrop(function (evt) { return _this.dragManager_onDrop(evt); });
            // Register the whole control as a drop target
            this.dragManager.registerDropTarget(this.getElement());
        }
        // Register for selection changed events
        DraggableListBox.prototype.onSelectionChanged = function (selectionChangedHandler) {
            this.selectionChangedHandler = selectionChangedHandler;
        };
        // Register for notification when user drags items to list
        DraggableListBox.prototype.onDrop = function (dragDropHandler) {
            this.dropHandler = dragDropHandler;
        };
        DraggableListBox.prototype.clear = function () {
            this.$UL.empty();
            this.listModel = [];
        };
        DraggableListBox.prototype.add = function (value, text, tooltip) {
            var _this = this;
            if (text === void 0) { text = null; }
            if (tooltip === void 0) { tooltip = null; }
            var $li = $("<li id='" + this.elementId + "_" + this.listModel.length + "'>" + (text || value) + "</li>").appendTo(this.$UL);
            this.dragManager.$registerDragSource($li);
            $li.on("mousedown", function (evt) { return _this.onItemMouseDown(evt); });
            $li.on("click", function (evt) {
                evt.stopPropagation();
                _this.onItemClick(evt);
                return false;
            });
            this.listModel.push({ value: value, text: text, tooltip: tooltip, isSelected: false });
        };
        DraggableListBox.prototype.getSelectedValue = function () {
            var selectedValues = this.getSelectedValues();
            return selectedValues.length > 0 ? selectedValues[0] : null;
        };
        DraggableListBox.prototype.getSelectedValues = function () {
            return this.listModel.filter(function (item) { return item.isSelected; }).map(function (item) { return item.value; });
        };
        DraggableListBox.prototype.getAllValues = function () {
            return this.listModel.map(function (item) { return item.value; });
        };
        DraggableListBox.prototype.getSelectedIndex = function () {
            var selectedIndices = this.getSelectedIndices();
            return selectedIndices.length > 0 ? selectedIndices[0] : -1;
        };
        DraggableListBox.prototype.getSelectedIndices = function () {
            return this.listModel.map(function (item, i) { return item.isSelected ? i : null; }).filter(function (index) { return index != null; });
        };
        DraggableListBox.prototype.setSelectedIndex = function (index) {
            // clear existing selection
            this.$UL.children().removeClass("selected");
            $.each(this.listModel, function (i, item) {
                item.isSelected = false;
            });
            if (index != -1) {
                $("#" + this.elementId + "_" + index).addClass("selected");
                this.listModel[index].isSelected = true;
            }
            this.fireSelectionChanged();
        };
        // Handling selection in the presense of drag and drop is fiddly as the use needs selection
        // feedback on mouse down rather than click (so the item to be dragged gets selected before it gets dragged)
        // But, have handle cases where draggin already selected items vs. dragging item that isn't selected
        // when otehr items are.... Fiddly.
        DraggableListBox.prototype.onItemMouseDown = function (evt) {
            var selectedIndex = this.getIndexFromElementId(evt.delegateTarget.id);
            // handle multi-select
            var oldSelectedIndex = this.getSelectedIndex();
            if (evt.shiftKey && oldSelectedIndex != -1) {
                for (var i = Math.min(selectedIndex, oldSelectedIndex); i <= Math.max(selectedIndex, oldSelectedIndex); i++) {
                    $("#" + this.elementId + "_" + i).addClass("selected");
                    this.listModel[i].isSelected = true;
                }
                this.getSelectedIndex();
                this.fireSelectionChanged();
            }
            else {
                // When user mouse downs on an element that is not already selected and they aren't
                // holding the ctrl key then deselect everything before selecting the clicked item.
                // BUT if user mouse downs on an item that IS selected (and other items are also selected)
                // then we they may either be about to drag the selection or they want to discard the 
                // selection and replace it with the clicked item - but we can't know that until the mouse up
                // so that one case is handled in the click handler)
                if (!evt.ctrlKey && !this.listModel[selectedIndex].isSelected) {
                    this.$UL.children().removeClass("selected");
                    $.each(this.listModel, function (i, item) {
                        item.isSelected = false;
                    });
                }
                $(evt.delegateTarget).addClass("selected");
                this.listModel[selectedIndex].isSelected = true;
                this.fireSelectionChanged();
            }
            evt.preventDefault();
            return false;
        };
        DraggableListBox.prototype.onItemClick = function (evt) {
            var _this = this;
            // Handle the case where user click on a selected item in a multi-selected set of items
            // and they didn't drag them - so deselect the other items
            var selectedIndex = this.getIndexFromElementId(evt.delegateTarget.id);
            if (!evt.ctrlKey && !evt.shiftKey && this.listModel[selectedIndex].isSelected) {
                $.each(this.listModel, function (i, item) {
                    if (i != selectedIndex) {
                        item.isSelected = false;
                        $("#" + _this.elementId + "_" + i).removeClass("selected");
                    }
                });
                this.fireSelectionChanged();
            }
        };
        // Internal drag-drop handling
        DraggableListBox.prototype.dragManager_onDragStart = function (evt) {
            this.currentDragEvent = evt;
            var selectedValues = this.getSelectedValues().join(",");
            evt.data = selectedValues;
            if (this.getSelectedValues().length > 1) {
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
        };
        DraggableListBox.prototype.dragManager_onTrackDrag = function (evt, overTarget) {
            if (overTarget && (this.currentDragEvent !== evt)) {
                this.$element.addClass("dragover");
            }
            else {
                this.$element.removeClass("dragover");
            }
        };
        DraggableListBox.prototype.dragManager_onDrop = function (evt) {
            if (this.dropHandler) {
                this.dropHandler(evt.data ? evt.data.split(",") : []);
            }
        };
        DraggableListBox.prototype.getIndexFromElementId = function (elementId) {
            return Number(elementId.substring(elementId.lastIndexOf("_") + 1));
        };
        DraggableListBox.prototype.fireSelectionChanged = function () {
            if (this.selectionChangedHandler) {
                this.selectionChangedHandler({ src: this });
            }
        };
        return DraggableListBox;
    })(Control);
    controls.DraggableListBox = DraggableListBox;
    var Timer = (function () {
        function Timer(intervalMilliseconds, task) {
            this.timerHandle = null;
            this.intervalMilliseconds = intervalMilliseconds;
            this.task = task;
        }
        Timer.prototype.start = function () {
            if (this.timerHandle) {
                this.stop();
            }
            this.timerHandle = window.setInterval(this.task, this.intervalMilliseconds);
        };
        Timer.prototype.stop = function () {
            window.clearInterval(this.timerHandle);
            this.timerHandle = null;
        };
        Timer.defer = function (delayMilliseconds, task) {
            // It can be useful to have an optional delay - so allow zero to mean just call task
            if (delayMilliseconds == 0) {
                task();
            }
            else {
                window.setTimeout(task, delayMilliseconds);
            }
        };
        return Timer;
    })();
    controls.Timer = Timer;
    var Dispatcher = (function () {
        function Dispatcher() {
        }
        Dispatcher.dispatch = function (task) {
            if (Dispatcher.tasks == null) {
                Dispatcher.tasks = [task];
                if (window.addEventListener) {
                    window.addEventListener("message", Dispatcher.messagehandler, true);
                }
                else {
                    window.attachEvent("onmessage", Dispatcher.messagehandler);
                }
            }
            else {
                Dispatcher.tasks.push(task);
            }
            window.postMessage(Dispatcher.messageName, "*");
        };
        Dispatcher.messagehandler = function (event) {
            if (event.source == window && event.data == Dispatcher.messageName) {
                if (event.stopPropagation) {
                    event.stopPropagation();
                }
                else {
                    // IE
                    event.returnValue = false;
                }
                if (Dispatcher.tasks.length > 0) {
                    var task = Dispatcher.tasks.shift();
                    task();
                }
            }
        };
        Dispatcher.messageName = "dispatch-task";
        Dispatcher.tasks = null;
        return Dispatcher;
    })();
    controls.Dispatcher = Dispatcher;
    var EventListeners = (function () {
        function EventListeners() {
            this.listeners = [];
        }
        EventListeners.prototype.addListener = function (listener) {
            this.listeners.push(listener);
        };
        EventListeners.prototype.removeListener = function (listener) {
            this.listeners = this.listeners.filter(function (l) { return listener !== l; });
        };
        EventListeners.prototype.notifyListeners = function (evt) {
            for (var i = 0; i < this.listeners.length; i++) {
                this.listeners[i](evt);
            }
        };
        return EventListeners;
    })();
    controls.EventListeners = EventListeners;
    var Console = (function () {
        function Console() {
        }
        Console.debug = function (msg) {
            if (typeof console != "undefined") {
                console.log(msg);
            }
        };
        return Console;
    })();
    controls.Console = Console;
})(controls || (controls = {}));
