module ui
{
    import Button = controls.Button;
    import Label = controls.Label;
    import TextBox = controls.TextBox;
    import TextArea = controls.TextArea;
    import DropDownList = controls.DropDownList;
    import ListBox = controls.ListBox;
    import CheckBox = controls.CheckBox;
    import RadioButtonSet = controls.RadioButtonSet;
    import MultiCheckBoxes = controls.MultiCheckBoxes;
    import Modal = controls.Modal;
    import Timer = controls.Timer;

    import $catdv = catdv.RestApi;
    import Clip = catdv.Clip;
    import ServerCommand = catdv.ServerCommand;
    import CommandParams = catdv.CommandParams;
    import CommandResults = catdv.CommandResults;
    import QueryDefinition = catdv.QueryDefinition;

    interface ArgumentControl
    {
        controlType: string;
        inputControl: any;
    }

    export class ServerCommandDialog extends Modal
    {
        private lblTitle = new Label("svrCmdArgsDlg_lblTitle");
        private $divArguments = $("#svrCmdArgsDlg_divArguments");
        private $buttonPanel = $("#svrCmdArgsDlg_buttonPanel");

        constructor(element: any)
        {
            super(element);
        }

        public setCommand(cmd: ServerCommand)
        {
            this.lblTitle.setText(cmd.name);

            var argControls: ArgumentControl[] = [];

            var submitBtns: string[] = null;

            this.$divArguments.empty();
            var $form = $("<form class='form-horizontal' role='form'></form>").appendTo(this.$divArguments);

            for (var i = 0; i < cmd.arguments.length; ++i)
            {
                var arg = cmd.arguments[i];

                var $row = $("<div class='form-group form-group-sm'>").appendTo($form);
                var $inputControl: JQuery;

                if (arg.type == "submit")
                {
                    submitBtns = arg.options;
                    if (arg.label)
                    {
                        // Custom window title
                        this.lblTitle.setText(arg.label);
                    }
                    argControls.push(null);
                    continue;
                }

                if ((arg.label == null) || (arg.type == "label") || ((arg.type == "html") && (arg.initialValue == null)))
                {
                    // no label or type label means span the component over two columns
                    $inputControl = $("<div class='col-sm-12'>" + arg.initialValue + "</div>").appendTo($row);
                }
                else 
                {
                    // normal case: label and a widget (plus the case where there's no widget and we span label over two columns)
                    $("<label for='cmdarg_" + i + "' class='col-sm-3 control-label'>" + arg.label + "</label>").appendTo($row);
                    $inputControl = $("<div class='col-sm-9'>").appendTo($row);
                }

                if (((arg.type == "list") || (arg.type == "combo") || (arg.type == "autolist")) && arg.options != null)
                {
                    var dropDownList = DropDownList.create({ "class": "form-control input-sm" }, $inputControl);
                    arg.options.forEach((option) =>
                    {
                        dropDownList.addItem({
                            value: option,
                            text: option,
                            isSelected: option == arg.initialValue
                        });
                    });

                    if (arg.type == "autolist")
                    {
                        dropDownList.onChanged((evt) =>
                        {
                            var submitTxt = arg.label;
                            this.onSubmit(argControls, submitTxt, cmd);
                        });
                    }
                    argControls.push({
                        controlType: "dropDownList",
                        inputControl: dropDownList
                    });
                }
                else if ((arg.type == "multiselect") && arg.options != null)
                {
                    // this is a multi row, multi select, potentially multi column list, so we should maybe use a data grid
                    // but that's really just cosmetic to get the columns to line up
                    $row.removeClass("form-group-sm");
                    var listBox = ListBox.create({ "class": "form-control", "multiselect": true }, $inputControl);
                    arg.options.forEach((option) =>
                    {
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
                else if (arg.type == "label") 
                {
                    $inputControl.text(arg.label);
                    argControls.push(null);
                }
                else if (arg.type == "html")
                {
                    $inputControl.html(arg.initialValue || arg.label);
                    argControls.push(null);
                }
                else if ((arg.type == "radio") && arg.options != null)
                {
                    var radioButtonSet = RadioButtonSet.create("rdo" + i, arg.options, {}, $inputControl);
                    radioButtonSet.setValue(arg.initialValue);
                    argControls.push({
                        controlType: "radiobuttons",
                        inputControl: radioButtonSet
                    });
                }
                else if ((arg.type == "checkbox") && arg.options != null)
                {
                    var checkboxes = MultiCheckBoxes.create(arg.options, {}, $inputControl);
                    checkboxes.setValues(arg.initialValue ? arg.initialValue.split(",") : []);
                    argControls.push({
                        controlType: "checkboxes",
                        inputControl: checkboxes
                    });
                }
                else if (arg.type == "checkbox")
                {
                    var $label = $("<label class='checkbox-inline'>").appendTo($inputControl)
                    var checkbox = CheckBox.create({}, $label);
                    $(document.createTextNode(arg.label)).appendTo($label);
                    checkbox.setChecked((arg.initialValue != null) && (arg.initialValue == "1"));
                    argControls.push({
                        controlType: "checkbox",
                        inputControl: checkbox
                    });
                }
                else if (arg.type == "password")
                {
                    var text = TextBox.create({ "type": "password", "class": "form-control input-sm" }, $inputControl);
                    text.setText(arg.initialValue);
                    argControls.push({
                        controlType: "textbox",
                        inputControl: text
                    });
                }
                // TODO: need to do multi-select-picklist-field as well
                //                else if ((arg.type == "multilist") && arg.options != null)
                //                {
                //                    var multilist = MultiPicklistField.create({}, arg.options, $inputControl);
                //                    multilist.setFieldValue(arg.initialValue);
                //                    argControls.push({
                //                        controlType: "multilist",
                //                        inputControl: multilist
                //                    });
                //                }
                else if (arg.type == "multiline")
                {
                    $row.removeClass("form-group-sm");
                    var textarea = TextArea.create({ "class": "form-control", "rows": 4, "width": "20em" }, $inputControl);
                    textarea.setText(arg.initialValue);
                    argControls.push({
                        controlType: "textarea",
                        inputControl: textarea
                    });
                }
                else
                {
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
            submitBtns.forEach((submitButtonText, i) =>
            {
                var submitButton
                if (submitButtonText == "Cancel")
                {
                    submitButton = Button.create(submitButtonText, { "class": "btn btn-sm btn-primary", "data-dismiss": "modal" }, this.$buttonPanel);
                }
                else
                {
                    submitButton = Button.create(submitButtonText, { "class": "btn btn-sm btn-primary" }, this.$buttonPanel);
                    submitButton.onClick((evt) =>
                    {
                        this.onSubmit(argControls, submitButtonText, cmd);
                    });
                }
            });
        }

        /**
         * User pressed OK or otherwise chose to close the dialog and submit its contents
         */
        private onSubmit(argControls: ArgumentControl[], submitTxt: string, cmd: ServerCommand)
        {
            var values: string[] = [];

            cmd.arguments.forEach((cmdArg, i) =>
            {
                if (argControls[i] != null)
                {
                    if (argControls[i].controlType == "textbox")
                    {
                        values[i] = (<TextBox>(argControls[i].inputControl)).getText();
                    }
                    else if (argControls[i].controlType == "textarea")
                    {
                        values[i] = (<TextArea>(argControls[i].inputControl)).getText();
                    }
                    else if (argControls[i].controlType == "checkbox")
                    {
                        values[i] = (<CheckBox>(argControls[i].inputControl)).isChecked() ? "1" : "0";
                    }
                    else if (argControls[i].controlType == "dropDownList")
                    {
                        values[i] = (<DropDownList>(argControls[i].inputControl)).getSelectedValue();
                    }
                    else if (argControls[i].controlType == "listBox")
                    {
                        var selectedValues = (<ListBox>(argControls[i].inputControl)).getSelectedValues();
                        values[i] = selectedValues.length ? selectedValues.reduce((a, b) => a + "," + b) : null;
                    }
                    //                else if (argControls[i].controlType == "listBox")
                    //                {
                    //                    var multi = <MultiPicklistField>(argControls[i].inputControl);
                    //                    values[i] = <string> multi.getFieldValue();
                    //                }
                    else if (argControls[i].controlType == "checkboxes")
                    {
                        var selectedValues = (<MultiCheckBoxes>(argControls[i].inputControl)).getValues();
                        values[i] = selectedValues.length ? selectedValues.reduce((a, b) => a + "," + b) : null;
                    }
                    else if (argControls[i].controlType == "radiobuttons")
                    {
                        values[i] = (<RadioButtonSet> (argControls[i].inputControl)).getValue();
                    }
                    else
                    {
                        values[i] = null;
                    }
                }
                else if ((submitTxt != null) && (i == cmd.arguments.length - 1))
                {
                    values[i] = submitTxt;
                }
                else
                {
                    values[i] = null;
                }
            });

            this.close(true, cmd, values);
        }

    }
}

