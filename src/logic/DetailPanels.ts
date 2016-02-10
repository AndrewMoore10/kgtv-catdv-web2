module logic
{
    import Clip = catdv.Clip;
    import FieldDefinition = catdv.FieldDefinition;
    import PanelDefinition = catdv.PanelDefinition;
    import PanelField = catdv.PanelField;
    import DateUtil = catdv.DateUtil;
    import TimecodeUtil = catdv.TimecodeUtil;
    import ClipHistoryEntry = catdv.ClipHistoryEntry;

    import Element = controls.Element;
    import Panel = controls.Panel;
    import TextBox = controls.TextBox;
    import TextArea = controls.TextArea;
    import CheckBox = controls.CheckBox;
    import RadioButton = controls.RadioButton;
    import DropDownList = controls.DropDownList;
    import MultiSelectDropDownList = controls.MultiSelectDropDownList;
    import ComboBox = controls.ComboBox;
    import ListItem = controls.ListItem;
    import ListDataSource = controls.ListDataSource;
    import SimpleListDataSource = controls.SimpleListDataSource;

    import PanelSettingsManager = logic.PanelSettingsManager;
    import FieldSettingsManager = logic.FieldSettingsManager;

    export class DetailsPanelManager
    {
        private static summaryDetailFields: string[] = [
            "NM1", "NT", "BIG", "RTG", "BN", "CREF", "RID", "CGRP", "OWNER",
            "TF", "STS", "HIS", "CAT", "TP", "TY1", "TY2", "I1", "O1",
            "IO", "I2", "O2", "IO2", "D1", "D2", "FF", "NT2", "MK", "HID",
            "RD1", "MD1", "VF", "FR", "FS", "AF", "ACHN", "AR", "ABIT", "MTI",
            "ARCHV", "MI", "ID1", "IS1", "MF", "PF", "ASP", "MS", "MD2", "QT",
        ];

        public static getPanelDefinitions(clip: Clip, callback: (panelDefs: PanelDefinition[]) => void)
        {
            PanelSettingsManager.getPanelDefinitions(clip.groupID, (panels) =>
            {
                if ((panels != null) && (panels.length > 0))
                {
                    callback(panels);
                }
                else
                {
                    DetailsPanelManager.getDefaultPanelDefs(clip, callback);
                }
            });
        }

        private static getDefaultPanelDefs(clip: Clip, callback: (panelDefs: PanelDefinition[]) => void)
        {
            var summaryPanel: PanelDefinition = { name: "Summary", fields: [] };
            DetailsPanelManager.summaryDetailFields.forEach((fieldDefID) =>
            {
                var fieldDef = BuiltInFields[fieldDefID];
                if (fieldDef)
                {
                    summaryPanel.fields.push({
                        fieldDefID: fieldDefID,
                        fieldDefinition: fieldDef
                    });
                }
            });

            var userfieldPanel: PanelDefinition = { name: "Log Notes", fields: [] };
            FieldSettingsManager.getUserFieldDefinitions(clip.groupID, (fieldDefinitions: FieldDefinition[]) =>
            {
                var fieldDefLookup: { [id: string]: FieldDefinition } = {};
                fieldDefinitions.forEach((fieldDefinition) =>
                {
                    fieldDefLookup[fieldDefinition.identifier] = fieldDefinition;
                });

                if (clip.userFields)
                {
                    for(var propertyName in clip.userFields)
                    {
                        var fieldDef = fieldDefLookup[propertyName];
                        if (fieldDef)
                        {
                            userfieldPanel.fields.push({
                                fieldDefinition: fieldDef
                            });
                        }
                        else
                        {
                            userfieldPanel.fields.push({
                                fieldDefinition: {
                                    fieldType: "text",
                                    memberOf: "clip",
                                    fieldGroupID: null,
                                    identifier: propertyName,
                                    name: propertyName.replace(new RegExp('^U'), "User "),
                                    isEditable: false,
                                    isMandatory: false,
                                    isMultiValue: false,
                                    isList: false
                                }
                            });
                        }
                   }
                }

                var metadataPanel: PanelDefinition = { name: "Technical", fields: [] };

                // Build list of metadata attributes based on the metadata for this clip
                if (clip.media && clip.media.metadata)
                {
                    for (var metadataField in clip.media.metadata)
                    {
                        metadataPanel.fields.push({
                            fieldDefinition: {
                                fieldType: "text",
                                memberOf: "media",
                                identifier: metadataField,
                                name: metadataField,
                                isEditable: false,
                                isMandatory: false,
                                isMultiValue: false,
                                isList: false
                            }
                        });
                    }
                }

                callback([summaryPanel, userfieldPanel, metadataPanel]);
            });
        }
    }

    export class DetailField
    {
        public fieldID: string;
        public fieldDef: FieldDefinition;

        constructor(fieldID: string, fieldDef: FieldDefinition)
        {
            this.fieldID = fieldID;
            this.fieldDef = fieldDef;
        }

        public setEditable(editable: boolean) {/* abstract */}

        public getValue(): any {/* abstract */}
        public setValue(value: any): void {/* abstract */}
    }

    export class TextField extends DetailField
    {
        private textBox: TextBox;

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);
            this.textBox = TextBox.create({ "id": this.fieldID, "type": "text", "readonly": true }, $parent);
        }

        public setEditable(editable: boolean)
        {
            this.textBox.setReadOnly(!this.fieldDef.isEditable || !editable);
        }

        public getValue(): any
        {
            return this.textBox.getText();
        }

        public setValue(value: any)
        {
            this.textBox.setText(value);
        }
    }

    export class DateTimeField extends DetailField
    {
        private textBox: TextBox;

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            var inputType;
            switch (this.fieldDef.fieldType)
            {
                case "date":
                    inputType = "date";
                    break;
                case "datetime":
                    inputType = "datetime";
                    break;
                case "time":
                    inputType = "time";
                    break;
                case "number":
                    inputType = "number";
                    break;
                default:
                    inputType = "text";
                    break;
            }

            this.textBox = TextBox.create({ "id": this.fieldID, "type": inputType, "readonly": true }, $parent);
        }

        public setEditable(editable: boolean)
        {
            this.textBox.setReadOnly(!this.fieldDef.isEditable || !editable);
        }

        public getValue(): any
        {
            var value = this.textBox.getText().trim();
            if (value)
            {
                switch (this.fieldDef.fieldType)
                {
                    case "date":
                        return DateUtil.parse(value, DateUtil.ISO_DATE_FORMAT);
                    case "datetime":
                        return DateUtil.parse(value, DateUtil.ISO_DATETIME_FORMAT);
                    case "time":
                        return DateUtil.parse(value, DateUtil.ISO_TIME_FORMAT);
                    default:
                        return value;
                }
            }
            else
            {
                return null;
            }
        }

        public setValue(value: any)
        {
            this.textBox.setText(this.formatValue(value));
        }

        // TODO: We are using HTML input type="date/datetime/time" which use ISO as their wire format
        // but display the date in the local machine's format. However, not all browsers support this
        // so ideally we'd format the dates using the server-side date format preference, if it's a browser
        // that doesn't support type="date". Or we need to write our own date picker control....
        private formatValue(value: any)
        {
            if (!value) return "";

            switch (this.fieldDef.fieldType)
            {
                case "date":
                    return DateUtil.format(<Date>value, DateUtil.ISO_DATE_FORMAT);
                case "datetime":
                    return DateUtil.format(<Date>value, DateUtil.ISO_DATETIME_FORMAT);
                case "time":
                    return DateUtil.format(<Date>value, DateUtil.ISO_TIME_FORMAT);
                default:
                    return value;
            }
        }
    }

    export class MultilineField extends DetailField
    {
        private textarea: TextArea;

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            this.textarea = TextArea.create({ "id": this.fieldID, "rows": 4, "readonly": true }, $parent);
        }

        public setEditable(editable: boolean)
        {
            this.textarea.setReadOnly(!this.fieldDef.isEditable || !editable);
        }

        public getValue(): any
        {
            return this.textarea.getText();
        }

        public setValue(value: any)
        {
            this.textarea.setText(value);
        }
    }

    export class CheckBoxField extends DetailField
    {
        private checkbox: CheckBox;

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            this.checkbox = CheckBox.create({ "id": this.fieldID, "disabled": "true" }, $parent);
        }

        public setEditable(editable: boolean)
        {
            this.checkbox.setEnabled(this.fieldDef.isEditable && editable);
        }

        public getValue(): any
        {
            return this.checkbox.isChecked();
        }

        public setValue(value: any)
        {
            this.checkbox.setChecked(value && (String(value) == "true"));
        }
    }

    export class RadioButtonsField extends DetailField
    {
        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            var html = "";
            if (this.fieldDef.values)
            {
                for (var p = 0; p < this.fieldDef.values.length; p++)
                {
                    var picklistValue = this.fieldDef.values[p];
                    html += "<input type='radio' name='" + this.fieldID + "' value='" + this.fieldDef.values[p] + "' disabled>" + picklistValue;
                }
            }

            $parent.html(html);
        }

        public setEditable(editable: boolean)
        {
            if (this.fieldDef.isEditable)
            {
                $("input[name=" + this.fieldID + "]").prop("disabled", !editable);
            }
        }

        public getValue(): any
        {
            return $("input[name=" + this.fieldID + "]:checked").val();
        }

        public setValue(value: any)
        {
            $("input[name=" + this.fieldID + "][value='" + value + "']").prop("checked", true);
        }
    }

    export class MultiCheckboxField extends DetailField
    {
        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            var html = "";
            if (this.fieldDef.values)
            {
                for (var p = 0; p < this.fieldDef.values.length; p++)
                {
                    var picklistValue = this.fieldDef.values[p];
                    html += "<input type='checkbox' id='" + this.fieldID + "_" + p + "' name='" + this.fieldID + "' disabled >" + picklistValue;
                }
            }
            $parent.html(html);
        }

        public setEditable(editable: boolean)
        {
            if (this.fieldDef.isEditable)
            {
                $("input[id^=" + this.fieldID + "]").prop("disabled", !editable);
            }
        }

        public getValue(): any
        {
            var selectedCheckboxes = $("input[id^=" + this.fieldID + "]:checked");
            if (selectedCheckboxes.length > 0)
            {
                var values: string[] = [];
                selectedCheckboxes.each((i, selectedCheckbox: HTMLElement) =>
                {
                    var valueIndex = Number(selectedCheckbox.id.substring(selectedCheckbox.id.lastIndexOf("_") + 1));
                    values.push(this.fieldDef.values[valueIndex]);
                });
                return values;
            }
            else
            {
                return null;
            }
        }

        public setValue(value: any)
        {
            var values = <string[]>value;
            if (values)
            {
                for (var p = 0; p < this.fieldDef.values.length; p++)
                {
                    var picklistValue = this.fieldDef.values[p];
                    var isSelected = values.contains(picklistValue);
                    $("#" + this.fieldID + "_" + p).prop("checked", isSelected ? true : false);
                }
            }
        }
    }

    export class PicklistField extends DetailField
    {
        private comboBox: ComboBox;
        private originalValues: string[];
        private dataSourceItems: ListItem[];

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            this.originalValues = [""].concat(fieldDef.values || []);
            this.dataSourceItems = this.originalValues.map((s) => { return { value: s, text: s }; });
            this.comboBox = ComboBox.create({ "id": fieldID }, true, new SimpleListDataSource(this.dataSourceItems), $parent);
        }

        public setEditable(editable: boolean)
        {
            this.comboBox.setEnabled(this.fieldDef.isEditable && editable);
        }

        public getValue(): any
        {
            return this.comboBox.getSelectedValue();
        }

        public setValue(value: any)
        {
            var unknownValue = (value && !this.originalValues.contains(value));
            if ((this.dataSourceItems.length != this.originalValues.length) || unknownValue)
            {
                var values = this.originalValues;
                if (unknownValue)
                {
                    values = ["", value].concat(this.fieldDef.values || []);
                }
                this.dataSourceItems = values.map((s) => { return { value: s, text: s }; });
                this.comboBox.updateDataSource(new SimpleListDataSource(this.dataSourceItems));
            }
            this.comboBox.setSelectedValue(value);
        }
    }

    export class MultiSelectPicklistField extends DetailField
    {
        private dropDownList: MultiSelectDropDownList;

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            var dataSource = new SimpleListDataSource(fieldDef.values ? fieldDef.values.map(value =>
            {
                return {
                    value: value,
                    text: value
                };
            }) : []);

            this.dropDownList = MultiSelectDropDownList.create({ "id": fieldID }, true, dataSource, $parent);
        }

        public setEditable(editable: boolean)
        {
            this.dropDownList.setEnabled(this.fieldDef.isEditable && editable);
        }

        public getValue(): any
        {
            return this.dropDownList.getSelectedValues();
        }

        public setValue(value: any)
        {
            var values = <string[]> value;
            this.dropDownList.setSelectedValues(values);
        }
    }

    export class AutoSuggestField extends DetailField
    {
        private comboBox: ComboBox;
        private originalValues: string[];
        private dataSourceItems: ListItem[];

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            this.originalValues = [""].concat(fieldDef.values || []);
            this.dataSourceItems = this.originalValues.map((s) => { return { value: s, text: s }; });
            this.comboBox = ComboBox.create({ "id": fieldID }, false, new SimpleListDataSource(this.dataSourceItems), $parent);
        }

        public setEditable(editable: boolean)
        {
            this.comboBox.setEnabled(this.fieldDef.isEditable && editable);
        }

        public getValue(): any
        {
            return this.comboBox.getText();
        }

        public setValue(value: any)
        {
            var unknownValue = (value && !this.originalValues.contains(value));
            if ((this.dataSourceItems.length != this.originalValues.length) || unknownValue)
            {
                var values = this.originalValues;
                if (unknownValue)
                {
                    values = ["", value].concat(this.fieldDef.values || []);
                }
                this.dataSourceItems = values.map((s) => { return { value: s, text: s }; });
                this.comboBox.updateDataSource(new SimpleListDataSource(this.dataSourceItems));
            }
            this.comboBox.setSelectedValue(value);
        }
    }

    export class HtmlField extends DetailField
    {
        private div: Element;

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            this.div = new Element($("<div id='" + this.fieldID + "'></div>").appendTo($parent));
        }

        public setEditable(editable: boolean)
        {
            // never editable
        }
        public getValue(): any
        {
            // readonly
        }

        public setValue(value: any)
        {
            this.div.$element.html(value);
        }
    }

    export class MediaPathField extends DetailField
    {
        private div: Element;

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            this.div = new Element($("<div id='" + this.fieldID + "'></div>").appendTo($parent));
        }

        public setEditable(editable: boolean)
        {
            // never editable
        }
        public getValue(): any
        {
            // readonly
        }

        public setValue(value: any)
        {
            if (value)
            {
                var path: string = value.path;
                var downloadUrl: string = value.downloadUrl;

                this.div.$element.empty();
                if (path)
                {
                    if (downloadUrl)
                    {
                        var $link = $("<a href='" + downloadUrl + "'>" + path + "</a>").appendTo(this.div.$element);
                    }
                    else
                    {
                        this.div.$element.text(path);
                    }
                }
            }
            else
            {
                this.div.$element.text("");
            }
        }
    }

    export class RatingField extends DetailField
    {
        private static OUTLINE_STAR = "&#9734;";
        private static SOLID_STAR = "&#9733;";

        private div: Element;
        private stars: Element[] = [];
        private rating: number;
        private editable: boolean = true;

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);
            this.div = new Element($("<div id='" + this.fieldID + "' class='ratings'></div>").appendTo($parent));

            for (var i = 0; i <= 5; i++)
            {
                this.stars[i] = new Element($("<span>" + (i > 0 ? RatingField.OUTLINE_STAR : "&nbsp;" ) + "</span>").appendTo(this.div.$element));
                this.attachClickEvent(this.stars[i], i);
            }
        }

        public setEditable(editable: boolean)
        {
            this.editable = editable;
        }

        public getValue(): any
        {
            return this.rating;
        }

        public setValue(value: any)
        {
            this.rating = Number(value);
            var numStars = Math.min(Math.max(this.rating || 0, 0), 5);
            for (var j = 1; j <= 5; j++)
            { 
                this.stars[j].$element.html(j <= numStars ? RatingField.SOLID_STAR : RatingField.OUTLINE_STAR );
            }
       }

        // This is in its own method so it gets the current value of index
        private attachClickEvent(star: Element, index: number)
        {
            star.onClick(() =>
            {
                this.setValue(index);
            });
        }
    }

    export class HistoryField extends DetailField
    {
        private div: Element;

        constructor(fieldID: string, fieldDef: FieldDefinition, $parent: JQuery)
        {
            super(fieldID, fieldDef);

            this.div = new Element($("<div id='" + this.fieldID + "'></div>").appendTo($parent));
        }

        public setEditable(editable: boolean)
        {
            // never editable
        }
        public getValue(): any
        {
            // readonly
        }

        public setValue(value: any)
        {
            var historyItems = <ClipHistoryEntry[]>value;
            var html = "";
            if (historyItems != null)
            {
                html += "<table class='history'>";
                html += "<tr><th>Action</th><th>Date</th><th>User</th></tr>";
                for (var i = 0; i < historyItems.length; i++)
                {
                    var item = historyItems[i];
                    html += "<tr><td>" + item.action + "</td><td>" + new Date(Number(item.date)).toDateString() + "</td><td>" + item.user + "</td></tr>";
                }

                html += "</table>";
            }

            this.div.$element.html(html);
        }
    }

    export class DetailFieldFactory
    {
        public static createField(fieldID: string, panelField: PanelField, fieldDef: FieldDefinition, $parent: JQuery): DetailField
        {
            if ((fieldDef.ID == "MF") || (fieldDef.ID == "PF"))
            {
                return new MediaPathField(fieldID, fieldDef, $parent);
            }
            else if ((fieldDef.ID == "RTG") || (fieldDef.ID == "RTGTYP"))
            {
                return new RatingField(fieldID, fieldDef, $parent);
            }
            else if ((fieldDef.fieldType == "date") || (fieldDef.fieldType == "time") || (fieldDef.fieldType == "datetime"))
            {
                return new DateTimeField(fieldID, fieldDef, $parent);
            }
            else if ((fieldDef.fieldType == "multiline") || ((fieldDef.fieldType == "text") && panelField.multiline))
            {
                return new MultilineField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "checkbox")
            {
                return new CheckBoxField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "radio")
            {
                return new RadioButtonsField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "multi-checkbox")
            {
                return new MultiCheckboxField(fieldID, fieldDef, $parent);
            }
            else if ((fieldDef.fieldType == "multi-picklist") || (fieldDef.fieldType == "multi-hierarchy") || (fieldDef.fieldType == "linked-multi-hierarchy"))
            {
                return new MultiSelectPicklistField(fieldID, fieldDef, $parent);
            }
            else if ((fieldDef.fieldType == "picklist") || (fieldDef.fieldType == "hierarchy") || (fieldDef.fieldType == "linked-hierarchy"))
            {
                return new PicklistField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "auto-suggest")
            {
                return new AutoSuggestField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType.contains("multi-auto-suggest"))
            {
                // TODO: implement MultiAutoSuggestField
                return new MultilineField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "html")
            {
                return new HtmlField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "history")
            {
                return new HistoryField(fieldID, fieldDef, $parent);
            }
            else
            {
                return new TextField(fieldID, fieldDef, $parent);
            }
        }
    }
}