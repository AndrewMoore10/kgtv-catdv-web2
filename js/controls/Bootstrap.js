var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var controls;
(function (controls) {
    var Control = controls.Control;
    var Accordian = (function (_super) {
        __extends(Accordian, _super);
        function Accordian(element) {
            _super.call(this, element);
            this.items = [];
            this.$element.addClass("panel-group");
        }
        Accordian.prototype.clear = function () {
            this.$element.empty();
        };
        Accordian.prototype.addItem = function (title, expanded) {
            var itemId = this.elementId + "_" + (this.items.length + 1);
            var html = "";
            html += "<div class='panel panel-default'>";
            html += "  <div class='panel-heading'>";
            html += "    <h4 class='panel-title'>";
            html += "      <a data-toggle='collapse' data-parent='#" + this.elementId + "' href='#" + itemId + "'>";
            html += title;
            html += "      </a>";
            html += "    </h4>";
            html += "  </div>";
            html += "  <div id='" + itemId + "' class='panel-collapse " + (expanded ? "in" : "collapse") + "'>";
            html += "    <div id='" + itemId + "_body' class='panel-body'>";
            html += "    </div>";
            html += "  </div>";
            html += "</div>";
            this.$element.append(html);
            var $body = $("#" + itemId + "_body");
            this.items.push({ id: itemId, title: title, $body: $body });
            return $body;
        };
        return Accordian;
    })(Control);
    controls.Accordian = Accordian;
    var Modal = (function (_super) {
        __extends(Modal, _super);
        function Modal(element) {
            _super.call(this, element);
            // clear all input fields
            this.$element.find("input").val("");
        }
        Modal.prototype.show = function () {
            var _this = this;
            // Workaround for Bootstrap bug - need to wait for previous instance to close before re-opening
            var modal = this.$element.data("bs.modal");
            if (modal && modal.$backdrop) {
                window.setTimeout(function () { return _this.show(); }, 250);
            }
            else {
                Modal.setOverlayShowing(true);
                this.$element.modal("show");
                window.setTimeout(function () {
                    _this.$element.find("input:first").focus().select();
                }, 250);
            }
            // Wire up Modal's magic cancel/close buttons dismiss overlay styles
            this.$element.on('click.dismiss.modal', '[data-dismiss="modal"]', function () { return Modal.setOverlayShowing(false); });
        };
        Modal.prototype.close = function (ok) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            this.$element.modal("hide");
            Modal.setOverlayShowing(false);
            if (ok) {
                if (this.okHandler)
                    this.okHandler.apply(this, args);
            }
            else {
                if (this.cancelHandler)
                    this.cancelHandler();
            }
        };
        Modal.prototype.onOK = function (okHandler) {
            this.okHandler = okHandler;
        };
        Modal.prototype.onCancel = function (cancelHandler) {
            this.cancelHandler = cancelHandler;
        };
        // Allows us to have css rules triggered when a dialog is displayed
        // Currently used by QuickTime player which doesn't support things appearing in front of it
        Modal.setOverlayShowing = function (overlayShowing) {
            if (overlayShowing) {
                $("body").addClass("dialogShowing");
            }
            else {
                $("body").removeClass("dialogShowing");
            }
        };
        return Modal;
    })(Control);
    controls.Modal = Modal;
    var MessageBox = (function (_super) {
        __extends(MessageBox, _super);
        function MessageBox(message, title) {
            var _this = this;
            if (title === void 0) { title = null; }
            _super.call(this, MessageBox.createDiv(message, title));
            $("#messagebox_okButton").on("click", function (evt) { return _this.close(true); });
        }
        MessageBox.showMessage = function (message, title) {
            if (title === void 0) { title = null; }
            new MessageBox(message, title).show();
        };
        MessageBox.createDiv = function (message, title) {
            $("#messagebox_dialog").remove();
            var html = "<div id='id='id='messagebox_dialog' style='display: none;' class='modal fade bs-modal-lg'>";
            html += "  <div class='modal-dialog  modal-lg'>";
            html += "    <div class='modal-content'>";
            html += "      <div class='modal-header'>";
            html += "        <h4 class='modal-title'>" + (title || "Alert") + "</h4>";
            html += "      </div>";
            html += "      <div class='modal-body' id='messagebox_content'>" + message.replaceAll("\n", "<br/>") + "</div>";
            html += "      <div class='modal-footer'>";
            html += "        <button id='messagebox_okButton' class='btn btn-sm btn-primary' data-dismiss='modal'>OK</button>";
            html += "      </div>";
            html += "    </div>";
            html += "  </div>";
            html += "</div>";
            return $(html).appendTo($("body"));
        };
        return MessageBox;
    })(Modal);
    controls.MessageBox = MessageBox;
    var Alert = (function (_super) {
        __extends(Alert, _super);
        function Alert(element) {
            _super.call(this, element);
            // hide by default
            this.hide();
        }
        Alert.prototype.show = function () {
            this.$element.removeClass("hide");
        };
        Alert.prototype.hide = function () {
            this.$element.addClass("hide");
        };
        return Alert;
    })(Control);
    controls.Alert = Alert;
    var TabPanel = (function (_super) {
        __extends(TabPanel, _super);
        function TabPanel(element) {
            var _this = this;
            _super.call(this, element);
            this.tabSelectedHandler = null;
            this.ignoreEvents = false;
            // Tab control consists of a <ul> for the tabs and then a separate <div> that contains the panels
            // We are passed in the <ul> - need to find the <div>
            this.$tabs = this.$element;
            this.$panels = this.$tabs.next();
            // Select first tab (if present)
            this.$tabs.find('a:first').tab('show');
            this.$tabs.find('a[data-toggle="tab"]').on('shown.bs.tab', function (e) { return _this.tab_onShown(e); });
        }
        TabPanel.create = function (parent) {
            // First create the tabs <ul>
            var $tabs = $("<ul class='nav nav-tabs' role='tablist'></ul>").appendTo(controls.Element.get$(parent));
            // then add the <div> that will contain the panels
            $tabs.after("<div class='tab-content'></div>");
            return new TabPanel($tabs);
        };
        TabPanel.prototype.addTab = function (name, selected) {
            var _this = this;
            var identifier = controls.Element.toID(name);
            var $tab = $("<li><a href='#" + identifier + "' role='tab' data-toggle='tab'>" + name + "</a></li>").appendTo(this.$tabs);
            $tab.on('shown.bs.tab', function (e) { return _this.tab_onShown(e); });
            var $panel = $("<div class='tab-pane' id='" + identifier + "'>").appendTo(this.$panels);
            if (selected) {
                $tab.find('a:first').tab('show');
            }
            return $panel;
        };
        TabPanel.prototype.showTab = function (name) {
            this.ignoreEvents = true;
            this.$element.find("a[href=#" + controls.Element.toID(name) + "]").tab('show');
            this.ignoreEvents = false;
        };
        TabPanel.prototype.clear = function () {
            this.$tabs.empty();
            this.$panels.empty();
        };
        TabPanel.prototype.onTabSelected = function (tabSelectedHandler) {
            this.tabSelectedHandler = tabSelectedHandler;
        };
        TabPanel.prototype.tab_onShown = function (e) {
            if (!this.ignoreEvents) {
                var selectedTabIdentifer = e.target.attributes["href"].value.substring(1); // activated tab
                // e.relatedTarget; // previous tab
                if (this.tabSelectedHandler) {
                    this.tabSelectedHandler(selectedTabIdentifer);
                }
            }
        };
        return TabPanel;
    })(Control);
    controls.TabPanel = TabPanel;
    var ButtonDropDown = (function (_super) {
        __extends(ButtonDropDown, _super);
        function ButtonDropDown(element) {
            _super.call(this, element);
        }
        ButtonDropDown.prototype.setEnabled = function (enabled) {
            if (enabled) {
                this.$element.find("button").removeAttr("disabled");
            }
            else {
                this.$element.find("button").attr("disabled", "disabled");
            }
        };
        // Override
        ButtonDropDown.prototype.onClick = function (clickHandler) {
            this.$element.find("li > a").click(function (evt) {
                clickHandler(evt, evt.delegateTarget.getAttribute("id"));
            });
        };
        return ButtonDropDown;
    })(Control);
    controls.ButtonDropDown = ButtonDropDown;
    var OptionsButton = (function (_super) {
        __extends(OptionsButton, _super);
        function OptionsButton(element, icon, options, selectedOption) {
            var _this = this;
            if (options === void 0) { options = null; }
            if (selectedOption === void 0) { selectedOption = null; }
            _super.call(this, element);
            this.$element.addClass("btn-group");
            this.$button = $("<button type='button' class='btn btn-sm '><span class='" + icon + "'></span></button>").appendTo(this.$element);
            this.$button.on("click", function (evt) {
                if (_this.clickHandler) {
                    _this.clickHandler(evt, _this.selectedOption);
                }
            });
            this.$arrow = $("<button type='button' class='btn btn-sm btn-compact dropdown-toggle' data-toggle='dropdown'>" + "<span class='catdvicon catdvicon-pulldown_arrow'></span> <span class='sr-only'>Toggle Dropdown</span></button>").appendTo(this.$element);
            this.$menu = $("<ul class='dropdown-menu dropdown-menu-right' role='menu'>").appendTo(this.$element);
            this.setOptions(options, selectedOption);
        }
        OptionsButton.prototype.setOptions = function (options, selectedOption) {
            var _this = this;
            this.options = options;
            this.selectedOption = selectedOption;
            this.$menu.empty();
            if (options) {
                options.forEach(function (option) {
                    var $li = $("<li>").appendTo(_this.$menu);
                    var visibility = (option == _this.selectedOption) ? "visible" : "hidden";
                    var $link = $("<a href='#'><span class='catdvicon catdvicon-tick_min' style='visibility:" + visibility + "'> </span> " + option + "</a>").appendTo($li);
                    $link.on("click", function (evt) {
                        _this.selectedOption = option;
                        if (_this.clickHandler) {
                            _this.clickHandler(evt, option);
                        }
                        _this.$menu.find("li > a > span").css("visibility", "hidden");
                        $link.find("span").css("visibility", "visible");
                    });
                });
            }
        };
        // Override
        OptionsButton.prototype.onClick = function (clickHandler) {
            this.clickHandler = clickHandler;
        };
        OptionsButton.prototype.setOption = function (option) {
            for (var i = 0; i < this.options.length; i++) {
                if (this.options[i].toLowerCase() == option.toLowerCase()) {
                    this.$menu.find("li > a > span").css("visibility", "hidden").eq(i).css("visibility", "visible");
                    break;
                }
            }
        };
        return OptionsButton;
    })(Control);
    controls.OptionsButton = OptionsButton;
})(controls || (controls = {}));
