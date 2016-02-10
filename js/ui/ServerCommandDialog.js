var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ui;
(function (ui) {
    var Button = controls.Button;
    var Label = controls.Label;
    var TextBox = controls.TextBox;
    var TextArea = controls.TextArea;
    var DropDownList = controls.DropDownList;
    var ListBox = controls.ListBox;
    var CheckBox = controls.CheckBox;
    var RadioButtonSet = controls.RadioButtonSet;
    var MultiCheckBoxes = controls.MultiCheckBoxes;
    var Modal = controls.Modal;
    var ServerCommandDialog = (function (_super) {
        __extends(ServerCommandDialog, _super);
        function ServerCommandDialog(element) {
            _super.call(this, element);
            this.lblTitle = new Label("svrCmdArgsDlg_lblTitle");
            this.$divArguments = $("#svrCmdArgsDlg_divArguments");
            this.$buttonPanel = $("#svrCmdArgsDlg_buttonPanel");
        }
        ServerCommandDialog.prototype.setCommand = function (cmd) {
            var _this = this;
            this.lblTitle.setText(cmd.name);
            var argControls = [];
            var submitBtns = null;
            this.$divArguments.empty();
            var $form = $("<form class='form-horizontal' role='form'></form>").appendTo(this.$divArguments);
            for (var i = 0; i < cmd.arguments.length; ++i) {
                var arg = cmd.arguments[i];
                var $row = $("<div class='form-group form-group-sm'>").appendTo($form);
                var $inputControl;
                if (arg.type == "submit") {
                    submitBtns = arg.options;
                    if (arg.label) {
                        // Custom window title
                        this.lblTitle.setText(arg.label);
                    }
                    argControls.push(null);
                    continue;
                }
                if ((arg.label == null) || (arg.type == "label") || ((arg.type == "html") && (arg.initialValue == null))) {
                    // no label or type label means span the component over two columns
                    $inputControl = $("<div class='col-sm-12'>" + arg.initialValue + "</div>").appendTo($row);
                }
                else {
                    // normal case: label and a widget (plus the case where there's no widget and we span label over two columns)
                    $("<label for='cmdarg_" + i + "' class='col-sm-3 control-label'>" + arg.label + "</label>").appendTo($row);
                    $inputControl = $("<div class='col-sm-9'>").appendTo($row);
                }
                if (((arg.type == "list") || (arg.type == "combo") || (arg.type == "autolist")) && arg.options != null) {
                    var dropDownList = DropDownList.create({ "class": "form-control input-sm" }, $inputControl);
                    arg.options.forEach(function (option) {
                        dropDownList.addItem({
                            value: option,
                            text: option,
                            isSelected: option == arg.initialValue
                        });
                    });
                    if (arg.type == "autolist") {
                        dropDownList.onChanged(function (evt) {
                            var submitTxt = arg.label;
                            _this.onSubmit(argControls, submitTxt, cmd);
                        });
                    }
                    argControls.push({
                        controlType: "dropDownList",
                        inputControl: dropDownList
                    });
                }
                else if ((arg.type == "multiselect") && arg.options != null) {
                    // this is a multi row, multi select, potentially multi column list, so we should maybe use a data grid
                    // but that's really just cosmetic to get the columns to line up
                    $row.removeClass("form-group-sm");
                    var listBox = ListBox.create({ "class": "form-control", "multiselect": true }, $inputControl);
                    arg.options.forEach(function (option) {
                        listBox.addItem({
                            value: option,
                            text: option,
                            isSelected: option == arg.initialValue
                        });
                    });
                    argControls.push({
                        controlType: "listBox",
                        inputControl: listBox
                    });
                }
                else if (arg.type == "label") {
                    $inputControl.text(arg.label);
                    argControls.push(null);
                }
                else if (arg.type == "html") {
                    $inputControl.html(arg.initialValue || arg.label);
                    argControls.push(null);
                }
                else if ((arg.type == "radio") && arg.options != null) {
                    var radioButtonSet = RadioButtonSet.create("rdo" + i, arg.options, {}, $inputControl);
                    radioButtonSet.setValue(arg.initialValue);
                    argControls.push({
                        controlType: "radiobuttons",
                        inputControl: radioButtonSet
                    });
                }
                else if ((arg.type == "checkbox") && arg.options != null) {
                    var checkboxes = MultiCheckBoxes.create(arg.options, {}, $inputControl);
                    checkboxes.setValues(arg.initialValue ? arg.initialValue.split(",") : []);
                    argControls.push({
                        controlType: "checkboxes",
                        inputControl: checkboxes
                    });
                }
                else if (arg.type == "checkbox") {
                    var $label = $("<label class='checkbox-inline'>").appendTo($inputControl);
                    var checkbox = CheckBox.create({}, $label);
                    $(document.createTextNode(arg.label)).appendTo($label);
                    checkbox.setChecked((arg.initialValue != null) && (arg.initialValue == "1"));
                    argControls.push({
                        controlType: "checkbox",
                        inputControl: checkbox
                    });
                }
                else if (arg.type == "password") {
                    var text = TextBox.create({ "type": "password", "class": "form-control input-sm" }, $inputControl);
                    text.setText(arg.initialValue);
                    argControls.push({
                        controlType: "textbox",
                        inputControl: text
                    });
                }
                else if (arg.type == "multiline") {
                    $row.removeClass("form-group-sm");
                    var textarea = TextArea.create({ "class": "form-control", "rows": 4, "width": "20em" }, $inputControl);
                    textarea.setText(arg.initialValue);
                    argControls.push({
                        controlType: "textarea",
                        inputControl: textarea
                    });
                }
                else {
                    var textbox = TextBox.create({ "class": "form-control input-sm", "width": "20em" }, $inputControl);
                    textbox.setText(arg.initialValue);
                    argControls.push({
                        controlType: "textbox",
                        inputControl: textbox
                    });
                }
            }
            // Either default OK/Cancel buttons or override by specifying a final argument of type "submit"
            this.$buttonPanel.empty();
            submitBtns = submitBtns || ["OK", "Cancel"];
            submitBtns.forEach(function (submitButtonText, i) {
                var submitButton;
                if (submitButtonText == "Cancel") {
                    submitButton = Button.create(submitButtonText, { "class": "btn btn-sm btn-primary", "data-dismiss": "modal" }, _this.$buttonPanel);
                }
                else {
                    submitButton = Button.create(submitButtonText, { "class": "btn btn-sm btn-primary" }, _this.$buttonPanel);
                    submitButton.onClick(function (evt) {
                        _this.onSubmit(argControls, submitButtonText, cmd);
                    });
                }
            });
        };
        /**
         * User pressed OK or otherwise chose to close the dialog and submit its contents
         */
        ServerCommandDialog.prototype.onSubmit = function (argControls, submitTxt, cmd) {
            var values = [];
            cmd.arguments.forEach(function (cmdArg, i) {
                if (argControls[i] != null) {
                    if (argControls[i].controlType == "textbox") {
                        values[i] = (argControls[i].inputControl).getText();
                    }
                    else if (argControls[i].controlType == "textarea") {
                        values[i] = (argControls[i].inputControl).getText();
                    }
                    else if (argControls[i].controlType == "checkbox") {
                        values[i] = (argControls[i].inputControl).isChecked() ? "1" : "0";
                    }
                    else if (argControls[i].controlType == "dropDownList") {
                        values[i] = (argControls[i].inputControl).getSelectedValue();
                    }
                    else if (argControls[i].controlType == "listBox") {
                        var selectedValues = (argControls[i].inputControl).getSelectedValues();
                        values[i] = selectedValues.length ? selectedValues.reduce(function (a, b) { return a + "," + b; }) : null;
                    }
                    else if (argControls[i].controlType == "checkboxes") {
                        var selectedValues = (argControls[i].inputControl).getValues();
                        values[i] = selectedValues.length ? selectedValues.reduce(function (a, b) { return a + "," + b; }) : null;
                    }
                    else if (argControls[i].controlType == "radiobuttons") {
                        values[i] = (argControls[i].inputControl).getValue();
                    }
                    else {
                        values[i] = null;
                    }
                }
                else if ((submitTxt != null) && (i == cmd.arguments.length - 1)) {
                    values[i] = submitTxt;
                }
                else {
                    values[i] = null;
                }
            });
            this.close(true, cmd, values);
        };
        return ServerCommandDialog;
    })(Modal);
    ui.ServerCommandDialog = ServerCommandDialog;
})(ui || (ui = {}));
