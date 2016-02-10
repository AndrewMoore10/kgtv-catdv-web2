var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var logic;
(function (logic) {
    var DateUtil = catdv.DateUtil;
    var Element = controls.Element;
    var TextBox = controls.TextBox;
    var TextArea = controls.TextArea;
    var CheckBox = controls.CheckBox;
    var MultiSelectDropDownList = controls.MultiSelectDropDownList;
    var ComboBox = controls.ComboBox;
    var SimpleListDataSource = controls.SimpleListDataSource;
    var PanelSettingsManager = logic.PanelSettingsManager;
    var FieldSettingsManager = logic.FieldSettingsManager;
    var DetailsPanelManager = (function () {
        function DetailsPanelManager() {
        }
        DetailsPanelManager.getPanelDefinitions = function (clip, callback) {
            PanelSettingsManager.getPanelDefinitions(clip.groupID, function (panels) {
                if ((panels != null) && (panels.length > 0)) {
                    callback(panels);
                }
                else {
                    DetailsPanelManager.getDefaultPanelDefs(clip, callback);
                }
            });
        };
        DetailsPanelManager.getDefaultPanelDefs = function (clip, callback) {
            var summaryPanel = { name: "Summary", fields: [] };
            DetailsPanelManager.summaryDetailFields.forEach(function (fieldDefID) {
                var fieldDef = logic.BuiltInFields[fieldDefID];
                if (fieldDef) {
                    summaryPanel.fields.push({
                        fieldDefID: fieldDefID,
                        fieldDefinition: fieldDef
                    });
                }
            });
            var userfieldPanel = { name: "Log Notes", fields: [] };
            FieldSettingsManager.getUserFieldDefinitions(clip.groupID, function (fieldDefinitions) {
                var fieldDefLookup = {};
                fieldDefinitions.forEach(function (fieldDefinition) {
                    fieldDefLookup[fieldDefinition.identifier] = fieldDefinition;
                });
                if (clip.userFields) {
                    for (var propertyName in clip.userFields) {
                        var fieldDef = fieldDefLookup[propertyName];
                        if (fieldDef) {
                            userfieldPanel.fields.push({
                                fieldDefinition: fieldDef
                            });
                        }
                        else {
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
                var metadataPanel = { name: "Technical", fields: [] };
                // Build list of metadata attributes based on the metadata for this clip
                if (clip.media && clip.media.metadata) {
                    for (var metadataField in clip.media.metadata) {
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
        };
        DetailsPanelManager.summaryDetailFields = [
            "NM1",
            "NT",
            "BIG",
            "RTG",
            "BN",
            "CREF",
            "RID",
            "CGRP",
            "OWNER",
            "TF",
            "STS",
            "HIS",
            "CAT",
            "TP",
            "TY1",
            "TY2",
            "I1",
            "O1",
            "IO",
            "I2",
            "O2",
            "IO2",
            "D1",
            "D2",
            "FF",
            "NT2",
            "MK",
            "HID",
            "RD1",
            "MD1",
            "VF",
            "FR",
            "FS",
            "AF",
            "ACHN",
            "AR",
            "ABIT",
            "MTI",
            "ARCHV",
            "MI",
            "ID1",
            "IS1",
            "MF",
            "PF",
            "ASP",
            "MS",
            "MD2",
            "QT",
        ];
        return DetailsPanelManager;
    })();
    logic.DetailsPanelManager = DetailsPanelManager;
    var DetailField = (function () {
        function DetailField(fieldID, fieldDef) {
            this.fieldID = fieldID;
            this.fieldDef = fieldDef;
        }
        DetailField.prototype.setEditable = function (editable) {
        };
        DetailField.prototype.getValue = function () {
        };
        DetailField.prototype.setValue = function (value) {
        };
        return DetailField;
    })();
    logic.DetailField = DetailField;
    var TextField = (function (_super) {
        __extends(TextField, _super);
        function TextField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            this.textBox = TextBox.create({ "id": this.fieldID, "type": "text", "readonly": true }, $parent);
        }
        TextField.prototype.setEditable = function (editable) {
            this.textBox.setReadOnly(!this.fieldDef.isEditable || !editable);
        };
        TextField.prototype.getValue = function () {
            return this.textBox.getText();
        };
        TextField.prototype.setValue = function (value) {
            this.textBox.setText(value);
        };
        return TextField;
    })(DetailField);
    logic.TextField = TextField;
    var DateTimeField = (function (_super) {
        __extends(DateTimeField, _super);
        function DateTimeField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            var inputType;
            switch (this.fieldDef.fieldType) {
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
        DateTimeField.prototype.setEditable = function (editable) {
            this.textBox.setReadOnly(!this.fieldDef.isEditable || !editable);
        };
        DateTimeField.prototype.getValue = function () {
            var value = this.textBox.getText().trim();
            if (value) {
                switch (this.fieldDef.fieldType) {
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
            else {
                return null;
            }
        };
        DateTimeField.prototype.setValue = function (value) {
            this.textBox.setText(this.formatValue(value));
        };
        // TODO: We are using HTML input type="date/datetime/time" which use ISO as their wire format
        // but display the date in the local machine's format. However, not all browsers support this
        // so ideally we'd format the dates using the server-side date format preference, if it's a browser
        // that doesn't support type="date". Or we need to write our own date picker control....
        DateTimeField.prototype.formatValue = function (value) {
            if (!value)
                return "";
            switch (this.fieldDef.fieldType) {
                case "date":
                    return DateUtil.format(value, DateUtil.ISO_DATE_FORMAT);
                case "datetime":
                    return DateUtil.format(value, DateUtil.ISO_DATETIME_FORMAT);
                case "time":
                    return DateUtil.format(value, DateUtil.ISO_TIME_FORMAT);
                default:
                    return value;
            }
        };
        return DateTimeField;
    })(DetailField);
    logic.DateTimeField = DateTimeField;
    var MultilineField = (function (_super) {
        __extends(MultilineField, _super);
        function MultilineField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            this.textarea = TextArea.create({ "id": this.fieldID, "rows": 4, "readonly": true }, $parent);
        }
        MultilineField.prototype.setEditable = function (editable) {
            this.textarea.setReadOnly(!this.fieldDef.isEditable || !editable);
        };
        MultilineField.prototype.getValue = function () {
            return this.textarea.getText();
        };
        MultilineField.prototype.setValue = function (value) {
            this.textarea.setText(value);
        };
        return MultilineField;
    })(DetailField);
    logic.MultilineField = MultilineField;
    var CheckBoxField = (function (_super) {
        __extends(CheckBoxField, _super);
        function CheckBoxField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            this.checkbox = CheckBox.create({ "id": this.fieldID, "disabled": "true" }, $parent);
        }
        CheckBoxField.prototype.setEditable = function (editable) {
            this.checkbox.setEnabled(this.fieldDef.isEditable && editable);
        };
        CheckBoxField.prototype.getValue = function () {
            return this.checkbox.isChecked();
        };
        CheckBoxField.prototype.setValue = function (value) {
            this.checkbox.setChecked(value && (String(value) == "true"));
        };
        return CheckBoxField;
    })(DetailField);
    logic.CheckBoxField = CheckBoxField;
    var RadioButtonsField = (function (_super) {
        __extends(RadioButtonsField, _super);
        function RadioButtonsField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            var html = "";
            if (this.fieldDef.values) {
                for (var p = 0; p < this.fieldDef.values.length; p++) {
                    var picklistValue = this.fieldDef.values[p];
                    html += "<input type='radio' name='" + this.fieldID + "' value='" + this.fieldDef.values[p] + "' disabled>" + picklistValue;
                }
            }
            $parent.html(html);
        }
        RadioButtonsField.prototype.setEditable = function (editable) {
            if (this.fieldDef.isEditable) {
                $("input[name=" + this.fieldID + "]").prop("disabled", !editable);
            }
        };
        RadioButtonsField.prototype.getValue = function () {
            return $("input[name=" + this.fieldID + "]:checked").val();
        };
        RadioButtonsField.prototype.setValue = function (value) {
            $("input[name=" + this.fieldID + "][value='" + value + "']").prop("checked", true);
        };
        return RadioButtonsField;
    })(DetailField);
    logic.RadioButtonsField = RadioButtonsField;
    var MultiCheckboxField = (function (_super) {
        __extends(MultiCheckboxField, _super);
        function MultiCheckboxField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            var html = "";
            if (this.fieldDef.values) {
                for (var p = 0; p < this.fieldDef.values.length; p++) {
                    var picklistValue = this.fieldDef.values[p];
                    html += "<input type='checkbox' id='" + this.fieldID + "_" + p + "' name='" + this.fieldID + "' disabled >" + picklistValue;
                }
            }
            $parent.html(html);
        }
        MultiCheckboxField.prototype.setEditable = function (editable) {
            if (this.fieldDef.isEditable) {
                $("input[id^=" + this.fieldID + "]").prop("disabled", !editable);
            }
        };
        MultiCheckboxField.prototype.getValue = function () {
            var _this = this;
            var selectedCheckboxes = $("input[id^=" + this.fieldID + "]:checked");
            if (selectedCheckboxes.length > 0) {
                var values = [];
                selectedCheckboxes.each(function (i, selectedCheckbox) {
                    var valueIndex = Number(selectedCheckbox.id.substring(selectedCheckbox.id.lastIndexOf("_") + 1));
                    values.push(_this.fieldDef.values[valueIndex]);
                });
                return values;
            }
            else {
                return null;
            }
        };
        MultiCheckboxField.prototype.setValue = function (value) {
            var values = value;
            if (values) {
                for (var p = 0; p < this.fieldDef.values.length; p++) {
                    var picklistValue = this.fieldDef.values[p];
                    var isSelected = values.contains(picklistValue);
                    $("#" + this.fieldID + "_" + p).prop("checked", isSelected ? true : false);
                }
            }
        };
        return MultiCheckboxField;
    })(DetailField);
    logic.MultiCheckboxField = MultiCheckboxField;
    var PicklistField = (function (_super) {
        __extends(PicklistField, _super);
        function PicklistField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            this.originalValues = [""].concat(fieldDef.values || []);
            this.dataSourceItems = this.originalValues.map(function (s) {
                return { value: s, text: s };
            });
            this.comboBox = ComboBox.create({ "id": fieldID }, true, new SimpleListDataSource(this.dataSourceItems), $parent);
        }
        PicklistField.prototype.setEditable = function (editable) {
            this.comboBox.setEnabled(this.fieldDef.isEditable && editable);
        };
        PicklistField.prototype.getValue = function () {
            return this.comboBox.getSelectedValue();
        };
        PicklistField.prototype.setValue = function (value) {
            var unknownValue = (value && !this.originalValues.contains(value));
            if ((this.dataSourceItems.length != this.originalValues.length) || unknownValue) {
                var values = this.originalValues;
                if (unknownValue) {
                    values = ["", value].concat(this.fieldDef.values || []);
                }
                this.dataSourceItems = values.map(function (s) {
                    return { value: s, text: s };
                });
                this.comboBox.updateDataSource(new SimpleListDataSource(this.dataSourceItems));
            }
            this.comboBox.setSelectedValue(value);
        };
        return PicklistField;
    })(DetailField);
    logic.PicklistField = PicklistField;
    var MultiSelectPicklistField = (function (_super) {
        __extends(MultiSelectPicklistField, _super);
        function MultiSelectPicklistField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            var dataSource = new SimpleListDataSource(fieldDef.values ? fieldDef.values.map(function (value) {
                return {
                    value: value,
                    text: value
                };
            }) : []);
            this.dropDownList = MultiSelectDropDownList.create({ "id": fieldID }, true, dataSource, $parent);
        }
        MultiSelectPicklistField.prototype.setEditable = function (editable) {
            this.dropDownList.setEnabled(this.fieldDef.isEditable && editable);
        };
        MultiSelectPicklistField.prototype.getValue = function () {
            return this.dropDownList.getSelectedValues();
        };
        MultiSelectPicklistField.prototype.setValue = function (value) {
            var values = value;
            this.dropDownList.setSelectedValues(values);
        };
        return MultiSelectPicklistField;
    })(DetailField);
    logic.MultiSelectPicklistField = MultiSelectPicklistField;
    var AutoSuggestField = (function (_super) {
        __extends(AutoSuggestField, _super);
        function AutoSuggestField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            this.originalValues = [""].concat(fieldDef.values || []);
            this.dataSourceItems = this.originalValues.map(function (s) {
                return { value: s, text: s };
            });
            this.comboBox = ComboBox.create({ "id": fieldID }, false, new SimpleListDataSource(this.dataSourceItems), $parent);
        }
        AutoSuggestField.prototype.setEditable = function (editable) {
            this.comboBox.setEnabled(this.fieldDef.isEditable && editable);
        };
        AutoSuggestField.prototype.getValue = function () {
            return this.comboBox.getText();
        };
        AutoSuggestField.prototype.setValue = function (value) {
            var unknownValue = (value && !this.originalValues.contains(value));
            if ((this.dataSourceItems.length != this.originalValues.length) || unknownValue) {
                var values = this.originalValues;
                if (unknownValue) {
                    values = ["", value].concat(this.fieldDef.values || []);
                }
                this.dataSourceItems = values.map(function (s) {
                    return { value: s, text: s };
                });
                this.comboBox.updateDataSource(new SimpleListDataSource(this.dataSourceItems));
            }
            this.comboBox.setSelectedValue(value);
        };
        return AutoSuggestField;
    })(DetailField);
    logic.AutoSuggestField = AutoSuggestField;
    var HtmlField = (function (_super) {
        __extends(HtmlField, _super);
        function HtmlField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            this.div = new Element($("<div id='" + this.fieldID + "'></div>").appendTo($parent));
        }
        HtmlField.prototype.setEditable = function (editable) {
            // never editable
        };
        HtmlField.prototype.getValue = function () {
            // readonly
        };
        HtmlField.prototype.setValue = function (value) {
            this.div.$element.html(value);
        };
        return HtmlField;
    })(DetailField);
    logic.HtmlField = HtmlField;
    var MediaPathField = (function (_super) {
        __extends(MediaPathField, _super);
        function MediaPathField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            this.div = new Element($("<div id='" + this.fieldID + "'></div>").appendTo($parent));
        }
        MediaPathField.prototype.setEditable = function (editable) {
            // never editable
        };
        MediaPathField.prototype.getValue = function () {
            // readonly
        };
        MediaPathField.prototype.setValue = function (value) {
            if (value) {
                var path = value.path;
                var downloadUrl = value.downloadUrl;
                this.div.$element.empty();
                if (path) {
                    if (downloadUrl) {
                        var $link = $("<a href='" + downloadUrl + "'>" + path + "</a>").appendTo(this.div.$element);
                    }
                    else {
                        this.div.$element.text(path);
                    }
                }
            }
            else {
                this.div.$element.text("");
            }
        };
        return MediaPathField;
    })(DetailField);
    logic.MediaPathField = MediaPathField;
    var RatingField = (function (_super) {
        __extends(RatingField, _super);
        function RatingField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            this.stars = [];
            this.editable = true;
            this.div = new Element($("<div id='" + this.fieldID + "' class='ratings'></div>").appendTo($parent));
            for (var i = 0; i <= 5; i++) {
                this.stars[i] = new Element($("<span>" + (i > 0 ? RatingField.OUTLINE_STAR : "&nbsp;") + "</span>").appendTo(this.div.$element));
                this.attachClickEvent(this.stars[i], i);
            }
        }
        RatingField.prototype.setEditable = function (editable) {
            this.editable = editable;
        };
        RatingField.prototype.getValue = function () {
            return this.rating;
        };
        RatingField.prototype.setValue = function (value) {
            this.rating = Number(value);
            var numStars = Math.min(Math.max(this.rating || 0, 0), 5);
            for (var j = 1; j <= 5; j++) {
                this.stars[j].$element.html(j <= numStars ? RatingField.SOLID_STAR : RatingField.OUTLINE_STAR);
            }
        };
        // This is in its own method so it gets the current value of index
        RatingField.prototype.attachClickEvent = function (star, index) {
            var _this = this;
            star.onClick(function () {
                _this.setValue(index);
            });
        };
        RatingField.OUTLINE_STAR = "&#9734;";
        RatingField.SOLID_STAR = "&#9733;";
        return RatingField;
    })(DetailField);
    logic.RatingField = RatingField;
    var HistoryField = (function (_super) {
        __extends(HistoryField, _super);
        function HistoryField(fieldID, fieldDef, $parent) {
            _super.call(this, fieldID, fieldDef);
            this.div = new Element($("<div id='" + this.fieldID + "'></div>").appendTo($parent));
        }
        HistoryField.prototype.setEditable = function (editable) {
            // never editable
        };
        HistoryField.prototype.getValue = function () {
            // readonly
        };
        HistoryField.prototype.setValue = function (value) {
            var historyItems = value;
            var html = "";
            if (historyItems != null) {
                html += "<table class='history'>";
                html += "<tr><th>Action</th><th>Date</th><th>User</th></tr>";
                for (var i = 0; i < historyItems.length; i++) {
                    var item = historyItems[i];
                    html += "<tr><td>" + item.action + "</td><td>" + new Date(Number(item.date)).toDateString() + "</td><td>" + item.user + "</td></tr>";
                }
                html += "</table>";
            }
            this.div.$element.html(html);
        };
        return HistoryField;
    })(DetailField);
    logic.HistoryField = HistoryField;
    var DetailFieldFactory = (function () {
        function DetailFieldFactory() {
        }
        DetailFieldFactory.createField = function (fieldID, panelField, fieldDef, $parent) {
            if ((fieldDef.ID == "MF") || (fieldDef.ID == "PF")) {
                return new MediaPathField(fieldID, fieldDef, $parent);
            }
            else if ((fieldDef.ID == "RTG") || (fieldDef.ID == "RTGTYP")) {
                return new RatingField(fieldID, fieldDef, $parent);
            }
            else if ((fieldDef.fieldType == "date") || (fieldDef.fieldType == "time") || (fieldDef.fieldType == "datetime")) {
                return new DateTimeField(fieldID, fieldDef, $parent);
            }
            else if ((fieldDef.fieldType == "multiline") || ((fieldDef.fieldType == "text") && panelField.multiline)) {
                return new MultilineField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "checkbox") {
                return new CheckBoxField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "radio") {
                return new RadioButtonsField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "multi-checkbox") {
                return new MultiCheckboxField(fieldID, fieldDef, $parent);
            }
            else if ((fieldDef.fieldType == "multi-picklist") || (fieldDef.fieldType == "multi-hierarchy") || (fieldDef.fieldType == "linked-multi-hierarchy")) {
                return new MultiSelectPicklistField(fieldID, fieldDef, $parent);
            }
            else if ((fieldDef.fieldType == "picklist") || (fieldDef.fieldType == "hierarchy") || (fieldDef.fieldType == "linked-hierarchy")) {
                return new PicklistField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "auto-suggest") {
                return new AutoSuggestField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType.contains("multi-auto-suggest")) {
                // TODO: implement MultiAutoSuggestField
                return new MultilineField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "html") {
                return new HtmlField(fieldID, fieldDef, $parent);
            }
            else if (fieldDef.fieldType == "history") {
                return new HistoryField(fieldID, fieldDef, $parent);
            }
            else {
                return new TextField(fieldID, fieldDef, $parent);
            }
        };
        return DetailFieldFactory;
    })();
    logic.DetailFieldFactory = DetailFieldFactory;
})(logic || (logic = {}));
