module controls
{
    import Control = controls.Control;

    interface AccordianItem
    {
        id: string;
        title: string;
        $body: JQuery;
    }

    export class Accordian extends Control
    {
        private items: AccordianItem[] = [];

        constructor(element: any)
        {
            super(element);
            this.$element.addClass("panel-group");
        }

        public clear()
        {
            this.$element.empty();
        }

        public addItem(title: string, expanded: boolean): JQuery
        {
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
        }
    }

    export class Modal extends Control
    {
        private okHandler: (...args: any[]) => void;
        private cancelHandler: () => void;

        constructor(element: any)
        {
            super(element);
            // clear all input fields
            this.$element.find("input").val("");
        }

        public show()
        {
            // Workaround for Bootstrap bug - need to wait for previous instance to close before re-opening
            var modal = this.$element.data("bs.modal");
            if (modal && modal.$backdrop)
            {
                window.setTimeout(() => this.show(), 250);
            }
            else
            {
                Modal.setOverlayShowing(true);
                this.$element.modal("show");

                window.setTimeout(() =>
                {
                    this.$element.find("input:first").focus().select();
                }, 250);
            }

            // Wire up Modal's magic cancel/close buttons dismiss overlay styles
            this.$element.on('click.dismiss.modal', '[data-dismiss="modal"]', () => Modal.setOverlayShowing(false));
        }

        public close(ok: boolean, ...args: any[])
        {
            this.$element.modal("hide");
            Modal.setOverlayShowing(false);
 
            if (ok)
            {
                if (this.okHandler) this.okHandler.apply(this, args);
            }
            else
            {
                if (this.cancelHandler) this.cancelHandler();
            }
        }


        public onOK(okHandler: (...args: any[]) => void)
        {
            this.okHandler = okHandler;
        }

        public onCancel(cancelHandler: () => void)
        {
            this.cancelHandler = cancelHandler;
        }

        // Allows us to have css rules triggered when a dialog is displayed
        // Currently used by QuickTime player which doesn't support things appearing in front of it
        public static setOverlayShowing(overlayShowing: boolean)
        {
            if (overlayShowing)
            {
                $("body").addClass("dialogShowing");
            }
            else
            {
                $("body").removeClass("dialogShowing");
            }
        }
    }


    export class MessageBox extends Modal
    {
        constructor(message: string, title: string = null)
        {
            super(MessageBox.createDiv(message, title));

            $("#messagebox_okButton").on("click", (evt) => this.close(true));
        }

        public static showMessage(message: string, title: string = null)
        {
            new MessageBox(message, title).show();
        }

        private static createDiv(message: string, title: string): JQuery
        {
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
        }
    }

    export class Alert extends Control
    {
        constructor(element: any)
        {
            super(element);
            // hide by default
            this.hide();
        }

        public show()
        {
            this.$element.removeClass("hide");
        }

        public hide()
        {
            this.$element.addClass("hide");
        }
    }

    export class TabPanel extends Control
    {
        private tabSelectedHandler: (selectedTabName: string) => void = null;
        private ignoreEvents = false;

        private $tabs: JQuery;
        private $panels: JQuery;

        constructor(element: any)
        {
            super(element);

            // Tab control consists of a <ul> for the tabs and then a separate <div> that contains the panels
            // We are passed in the <ul> - need to find the <div>
            this.$tabs = this.$element;
            this.$panels = this.$tabs.next();

            // Select first tab (if present)
            this.$tabs.find('a:first').tab('show');

            this.$tabs.find('a[data-toggle="tab"]').on('shown.bs.tab', (e) => this.tab_onShown(e));
        }

        public static create(parent: any)
        {
            // First create the tabs <ul>
            var $tabs = $("<ul class='nav nav-tabs' role='tablist'></ul>").appendTo(Element.get$(parent));
            // then add the <div> that will contain the panels
            $tabs.after("<div class='tab-content'></div>");
            return new TabPanel($tabs);
        }

        public addTab(name: string, selected: boolean): JQuery
        {
            var identifier = Element.toID(name);
            var $tab = $("<li><a href='#" + identifier + "' role='tab' data-toggle='tab'>" + name + "</a></li>").appendTo(this.$tabs);
            $tab.on('shown.bs.tab', (e) => this.tab_onShown(e));
            var $panel = $("<div class='tab-pane' id='" + identifier + "'>").appendTo(this.$panels);
            if (selected)
            {
                $tab.find('a:first').tab('show');
            }
            return $panel;
        }

        public showTab(name: string)
        {
            this.ignoreEvents = true;
            this.$element.find("a[href=#" + Element.toID(name) + "]").tab('show');
            this.ignoreEvents = false;
        }

        public clear()
        {
            this.$tabs.empty();
            this.$panels.empty();
        }

        public onTabSelected(tabSelectedHandler: (selectedTabIdentifer: string) => void)
        {
            this.tabSelectedHandler = tabSelectedHandler;
        }

        private tab_onShown(e: JQueryEventObject)
        {
            if (!this.ignoreEvents)
            {
                var selectedTabIdentifer: string = (<string>(<HTMLElement>e.target).attributes["href"].value).substring(1); // activated tab
                // e.relatedTarget; // previous tab
                if (this.tabSelectedHandler)
                {
                    this.tabSelectedHandler(selectedTabIdentifer);
                }
            }
        }
    }

    export class ButtonDropDown extends Control
    {
        constructor(element: any)
        {
            super(element);
        }

        public setEnabled(enabled: boolean)       
        {
            if (enabled)
            {
                this.$element.find("button").removeAttr("disabled");
            }
            else
            {
                this.$element.find("button").attr("disabled", "disabled");
            }
        }

        // Override
        public onClick(clickHandler: (evt: any, dropDownItemId: string) => void)
        {
            this.$element.find("li > a").click(function(evt)
            {
                clickHandler(evt, evt.delegateTarget.getAttribute("id"));
            });
        }
    }

    export class OptionsButton extends Control
    {
        private $button: JQuery;
        private $arrow: JQuery;
        private $menu: JQuery;

        private options: string[];
        private selectedOption: string;
        private clickHandler: (evt: any, option: string) => void;

        constructor(element: any, icon: string, options: string[]= null, selectedOption: string = null)
        {
            super(element);

            this.$element.addClass("btn-group");

            this.$button = $("<button type='button' class='btn btn-sm '><span class='" + icon + "'></span></button>").appendTo(this.$element);
            this.$button.on("click", (evt) =>
            {
                if (this.clickHandler)
                {
                    this.clickHandler(evt, this.selectedOption);
                }
            });

            this.$arrow = $("<button type='button' class='btn btn-sm btn-compact dropdown-toggle' data-toggle='dropdown'>" +
                "<span class='catdvicon catdvicon-pulldown_arrow'></span> <span class='sr-only'>Toggle Dropdown</span></button>").appendTo(this.$element);

            this.$menu = $("<ul class='dropdown-menu dropdown-menu-right' role='menu'>").appendTo(this.$element);

            this.setOptions(options, selectedOption);

        }

        public setOptions(options: string[], selectedOption: string)
        {
            this.options = options;
            this.selectedOption = selectedOption;

            this.$menu.empty();
            if (options)
            {
                options.forEach((option) =>
                {
                    var $li = $("<li>").appendTo(this.$menu);
                    var visibility = (option == this.selectedOption) ? "visible" : "hidden";
                    var $link = $("<a href='#'><span class='catdvicon catdvicon-tick_min' style='visibility:" + visibility + "'> </span> " + option + "</a>").appendTo($li);
                    $link.on("click", (evt) =>
                    {
                        this.selectedOption = option;
                        if (this.clickHandler)
                        {
                            this.clickHandler(evt, option);
                        }
                        this.$menu.find("li > a > span").css("visibility", "hidden");
                        $link.find("span").css("visibility", "visible");
                    });
                });
            }
        }

        // Override
        public onClick(clickHandler: (evt: any, option: string) => void)
        {
            this.clickHandler = clickHandler;
        }

        public setOption(option: string)
        {
            for (var i = 0; i < this.options.length; i++)
            {
                if (this.options[i].toLowerCase() == option.toLowerCase())
                {
                    this.$menu.find("li > a > span").css("visibility", "hidden").eq(i).css("visibility", "visible");
                    break;
                }
            }
        }
    }
}