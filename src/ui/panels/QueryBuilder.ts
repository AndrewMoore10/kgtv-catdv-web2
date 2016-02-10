module ui.panels
{
    import Control = controls.Control;
    import TextBox = controls.TextBox;
    import DropDownList = controls.DropDownList;
    import CheckBox = controls.CheckBox;
    import ComboBox = controls.ComboBox;
    import Button = controls.Button;
    import ListItem = controls.ListItem;
    import Panel = controls.Panel;
    import SimpleListDataSource = controls.SimpleListDataSource;
    import ServerListDataSource = controls.ServerListDataSource;

    import FieldDefinition = catdv.FieldDefinition;
    import QueryDefinition = catdv.QueryDefinition;
    import QueryTerm = catdv.QueryTerm;
    import TimecodeUtil = catdv.TimecodeUtil;
    import TimecodeFormat = catdv.TimecodeFormat;
    import QueryDefinitionUtil = catdv.QueryDefinitionUtil;
    import FieldDefinitionUtil = catdv.FieldDefinitionUtil;
    import DateUtil = catdv.DateUtil;

    import FieldSettingsManager = logic.FieldSettingsManager;

    var EPOC = "0";
    var ISO_DATE = "YYYY-MM-DD";

    interface OperatorInfo
    {
        name: string;
        op: string;
        param_type: string;
        logicalNOT: boolean;
    };

    var TIME_PERIOD_LIST_ITEMS = [
        { value: 24 * 60 * 60, text: "days" },
        { value: 60 * 60, text: "hours" },
        { value: 60, text: "minutes" },
        { value: 1, text: "seconds" }
    ];

    var operatorLookup: { [valueType: string]: OperatorInfo[] } = {
        "text": [
            { name: "contains", op: "has", param_type: "text", logicalNOT: false },
            { name: "does not contain", op: "has", param_type: "text", logicalNOT: true },
            { name: "equals", op: "eq", param_type: "text", logicalNOT: false },
            { name: "does not equal", op: "eq", param_type: "text", logicalNOT: true },
            { name: "starts with", op: "startsWith", param_type: "text", logicalNOT: false },
            { name: "does not start with", op: "startsWith", param_type: "text", logicalNOT: true },
            { name: "ends with", op: "endsWith", param_type: "text", logicalNOT: false },
            { name: "does not end with", op: "endsWith", param_type: "text", logicalNOT: true },
            { name: "is blank", op: "isBlank", param_type: "text", logicalNOT: false },
            { name: "is not blank", op: "isBlank", param_type: "text", logicalNOT: true },
            { name: "is one of", op: "isOneOf", param_type: "text", logicalNOT: false }, //string,string,...
            { name: "is not one of", op: "isOneOf", param_type: "text", logicalNOT: true }, //string,string,...
            { name: "contains one of", op: "hasOneOf", param_type: "text", logicalNOT: false }, // string,string,...
            { name: "does not contain any of", op: "hasOneOf", param_type: "text", logicalNOT: true }, // string,string,...           
            { name: "matches regex", op: "regex", param_type: "text", logicalNOT: false }, // regex
            { name: "does not match regex", op: "regex", param_type: "text", logicalNOT: true }, // regex
            { name: "contains all", op: "hasAll", param_type: "text", logicalNOT: false }, // string,string,...
            { name: "does not contain any", op: "hasAll", param_type: "text", logicalNOT: true }, // string,string,...
            { name: "like", op: "like", param_type: "text", logicalNOT: false }, // // word word "a phrase"           
            { name: "is not like", op: "like", param_type: "text", logicalNOT: true }, // // word word "a phrase"
            //            { "Contains word" : "word"}, //   word regex
            //            { "Contains" : "multi"}, //  word\nword (one or more multigrouping terms)          
        ],
        "number": [
            { name: "equals", op: "eq", param_type: "number", logicalNOT: false },
            { name: "does not equal", op: "eq", param_type: "number", logicalNOT: true },
            { name: "is one of", op: "isOneOf", param_type: "number", logicalNOT: false }, //string,string,...
            { name: "is not one of", op: "isOneOf", param_type: "number", logicalNOT: true }, //string,string,...
            { name: "is greater than", op: "ge", param_type: "number", logicalNOT: false },
            { name: "is less than", op: "le", param_type: "number", logicalNOT: false },
            { name: "is between", op: "between", param_type: "number-range", logicalNOT: false },
            { name: "is not between", op: "between", param_type: "number-range", logicalNOT: true },
            { name: "is blank", op: "isBlank", param_type: null, logicalNOT: false },
            { name: "is not blank", op: "isBlank", param_type: null, logicalNOT: true },
        ],
        "date": [
            { name: "equals", op: "eq", param_type: "date", logicalNOT: false },
            { name: "does not equal", op: "eq", param_type: "date", logicalNOT: true },
            { name: "is after", op: "ge", param_type: "date", logicalNOT: false },
            { name: "is before", op: "le", param_type: "date", logicalNOT: false },
            { name: "is between", op: "between", param_type: "date-range", logicalNOT: false },
            { name: "is not between", op: "between", param_type: "date-range", logicalNOT: true },
            { name: "is within", op: "near", param_type: "timespan-range", logicalNOT: false }, // date,seconds [seconds=int]
            { name: "is not within", op: "near", param_type: "timespan-range", logicalNOT: true }, // date,seconds [seconds=int]
            { name: "is older than", op: "older", param_type: "timespan", logicalNOT: false }, // seconds ago
            { name: "is newer than", op: "newer", param_type: "timespan", logicalNOT: false }, // seconds ago
            { name: "is blank", op: "isBlank", param_type: null, logicalNOT: false },
            { name: "is not blank", op: "isBlank", param_type: null, logicalNOT: true },
        ],
        "timecode": [
            { name: "equals", op: "eq", param_type: "timecode", logicalNOT: false },// fmt,tc [fmt=short, tc=int frames]
            { name: "does not equal", op: "eq", param_type: "timecode", logicalNOT: true },
            { name: "is greater than", op: "ge", param_type: "timecode", logicalNOT: false },// fmt,tc
            { name: "is less than", op: "le", param_type: "timecode", logicalNOT: false },// fmt,tc
            { name: "is between", op: "between", param_type: "timecode-range", logicalNOT: false },// fmt,tc,tc
            { name: "is not between", op: "between", param_type: "timecode-range", logicalNOT: true },
            { name: "is blank", op: "isBlank", param_type: null, logicalNOT: false },
            { name: "is not blank", op: "isBlank", param_type: null, logicalNOT: true },
        ],
        "boolean": [
            { name: "is set", op: "isTrue", param_type: null, logicalNOT: false },
            { name: "is not set", op: "isFalse", param_type: null, logicalNOT: false },
        ],
        "special": [
            { name: "?", op: "sql", param_type: null, logicalNOT: false }, // direct sql queries
            { name: "?", op: "sig", param_type: null, logicalNOT: false }, // clip signature
        ]
    };

    class QueryTermEditor extends Panel
    {
        private lstField: ComboBox;
        private lstOperator: DropDownList;
        private valuePanel: Panel;

        private value1Field: TextBox;
        private value1ListField: ComboBox;
        private value1Type: DropDownList;
        private value2Field: TextBox;
        private removeBtn: Button;

        private queryBuilder: QueryBuilder;

        private operators: OperatorInfo[];
        
        private fields: FieldDefinition[]
        private fieldListItems: ListItem[];
        private fieldDefLookupByID: { [id: string]: FieldDefinition };
        private fieldDefLookupByIdentifier: { [identifier: string]: FieldDefinition };
        private selectedFieldDef: FieldDefinition = null;

        private isOrTerm: boolean;

        constructor(parent: Panel,
            isOrTerm: boolean,
            fields: FieldDefinition[],
            fieldDefLookupByID: { [id: string]: FieldDefinition },
            fieldDefLookupByIdentifier: { [identifier: string]: FieldDefinition },
            queryBuilder: QueryBuilder)
        {
            super($("<div class='queryTerm form-inline'>").appendTo(parent.$element));

            this.isOrTerm = isOrTerm;
            this.fields = fields;
            this.fieldDefLookupByID = fieldDefLookupByID;
            this.fieldDefLookupByIdentifier = fieldDefLookupByIdentifier;
            this.queryBuilder = queryBuilder;

            this.fieldListItems = [];
            logic.SpecialQueryFields.forEach((fieldDef) =>
            {
                this.fieldListItems.push({
                    value: fieldDef,
                    text: fieldDef.name,
                    tooltip: fieldDef.description,
                    cssClass: "special"
                });
            });
            this.fields.sort((a, b) => a.name > b.name ? 1 : -1).forEach((fieldDef) =>
            {
                this.fieldListItems.push({
                    value: fieldDef,
                    text: fieldDef.name,
                    tooltip: fieldDef.description || fieldDef.identifier
                });
            });

            var $div = $("<div class='form-group'>").appendTo(this.$element);
            this.lstField = ComboBox.create({ "class": "form-control input-sm" }, true, new SimpleListDataSource(this.fieldListItems), $div);
            $div = $("<div class='form-group'>").appendTo(this.$element);
            this.lstOperator = DropDownList.create({ "class": "form-control input-sm" }, $div);
            $div = $("<div class='form-group'>").appendTo(this.$element);
            this.valuePanel = new Panel($("<span>").appendTo($div));
            $div = $("<div class='form-group'>").appendTo(this.$element);
            this.removeBtn = new Button($("<button class='btn btn-link btn-tight'><span class='catdvicon catdvicon-remove'> </span></button>").appendTo($div));

            this.lstField.onChanged((evt) =>
            {
                this.handleFieldChanged();
            });

            this.lstOperator.onChanged((evt) =>
            {
                this.handleOperatorChanged();
            });

            this.handleFieldChanged();
        }

        public onRemove(removeHandler: (evt) => void)
        {
            this.removeBtn.onClick((evt) =>
            {
                removeHandler(evt);
            });
        }

        public getQueryTerm(ignoreCase: boolean): QueryTerm
        {
            var fieldDef = <FieldDefinition>this.lstField.getSelectedValue();

            var field;
            if (fieldDef.isBuiltin)
            {
                field = fieldDef.memberOf + "." + fieldDef.identifier;
            }
            else
            {
                field = fieldDef.memberOf + "[" + fieldDef.identifier + "]";
            }

            var operator = this.operators[this.lstOperator.getSelectedIndex()];

            var op = operator.op;
            if (!fieldDef.isBuiltin)
            {
                // Add type hint to operator for custom fields as pre-server 7 can't easily determine type
                switch (operator.param_type)
                {
                    case "date":
                    case "date-range":
                    case "timespan":
                    case "timespan-range":
                        op += "_date";
                        break;
                    case "number":
                    case "number-range":
                        op += "_number";
                        break;
                    case "timecode":
                    case "timecode-range":
                        op += "_timecode";
                        break;                      
               }
            }

            return {
                field: field,
                op: op,
                params: this.getQueryParams(operator),
                logicalOR: this.isOrTerm,
                logicalNOT: operator.logicalNOT,
                ignoreCase: ignoreCase
            };
        }

        public setQueryTerm(queryTerm: QueryTerm)
        {
            var fieldDef = this.fieldDefLookupByIdentifier[queryTerm.field.replace(".userFields[", "[").replace(".metadata[", "[")];
            if (!fieldDef)
            {
                fieldDef = FieldDefinitionUtil.makeDummyFieldDefinition(queryTerm.field);
                var expandedList = this.fieldListItems.concat([{ text: fieldDef.name, value: fieldDef }]);
                this.lstField.updateDataSource(new SimpleListDataSource(expandedList));
           }
            this.lstField.setSelectedValue(fieldDef);
            this.selectedFieldDef = fieldDef;

            this.updateOperatorList(fieldDef);

            var opertorInfo = this.operators.find((opertor) => opertor.op == queryTerm.op) || this.operators[0];
            this.lstOperator.setSelectedValue(opertorInfo.logicalNOT ? "!" + opertorInfo.op : opertorInfo.op);

            this.updateValueControls(opertorInfo);

            this.setQueryParams(opertorInfo, queryTerm.params);
        }

        private handleFieldChanged()
        {
            this.selectedFieldDef = <FieldDefinition>this.lstField.getSelectedValue();
            if (this.selectedFieldDef)
            {
                this.updateOperatorList(this.selectedFieldDef);
            }
        }

        private handleOperatorChanged()
        {
            var operator = this.operators[this.lstOperator.getSelectedIndex()];
            this.updateValueControls(operator);
        }

        private updateOperatorList(fieldDef: FieldDefinition)
        {
            var fieldType = fieldDef.fieldType;
            var valueType;
            if (fieldDef.isBuiltin)
            {
                switch (fieldType)
                {
                    case "date":
                    case "datetime":
                        valueType = "date";
                        break;
                    case "timecode":
                        valueType = "timecode";
                        break;
                    case "number":
                        valueType = "number";
                        break;
                    case "checkbox":
                        valueType = "boolean";
                        break;
                    default:
                        valueType = "text";
                        break;
                }
            }
            else
            {
                switch (fieldType)
                {
                    case "date":
                    case "datetime":
                        valueType = "date";
                        break;
                    default:
                        valueType = "text";
                        break;
                }
            }

            this.operators = operatorLookup[valueType];
            this.lstOperator.setItems(this.operators.map((operator) =>
            {
                return {
                    value: (operator.logicalNOT ? "!" + operator.op : operator.op),
                    text: operator.name
                };
            }));
            this.handleOperatorChanged();
        }

        private updateValueControls(operator: OperatorInfo)
        {
            this.valuePanel.clear();
            this.value1Field = null;
            this.value1ListField = null;
            this.value1Type = null;
            this.value2Field = null;

            switch (operator.param_type)
            {
                case "text":
                    if (FieldDefinitionUtil.hasValues(this.selectedFieldDef))
                    {
                        var dataSource = new ServerListDataSource((callback: (ListItemArray) => void) =>
                        {
                            FieldSettingsManager.getFieldValues(this.selectedFieldDef, (values: string[]) =>
                            {
                                callback(values.map((value) => { return { text: value, value: value }; }));
                            });
                        });
                        this.value1ListField = ComboBox.create({ "class": "form-control input-sm" }, false, dataSource, this.valuePanel);
                    }
                    else
                    {
                        this.value1Field = TextBox.create({ "class": "form-control input-sm" }, this.valuePanel);
                    }
                    break;
                case "number":
                    this.value1Field = TextBox.create({ "class": "form-control input-sm" }, this.valuePanel);
                    break;
                case "number-range":
                    this.value1Field = TextBox.create({ "class": "form-control input-sm" }, this.valuePanel);
                    $("<span> and </span>").appendTo(this.valuePanel.$element);
                    this.value2Field = TextBox.create({ "class": "form-control input-sm" }, this.valuePanel);
                    break;
                case "date":
                    this.value1Field = TextBox.create({ "type": "date", "class": "form-control input-sm" }, this.valuePanel);
                    break;
                case "date-range":
                    this.value1Field = TextBox.create({ "type": "date", "class": "form-control input-sm" }, this.valuePanel);
                    $("<span> and </span>").appendTo(this.valuePanel.$element);
                    this.value2Field = TextBox.create({ "type": "date", "class": "form-control input-sm" }, this.valuePanel);
                    break;
                case "timespan":
                    this.value1Field = TextBox.create({ "type": "number", "size": 4, "class": "form-control input-sm" }, this.valuePanel);
                    this.value1Type = DropDownList.create({ items: TIME_PERIOD_LIST_ITEMS }, this.valuePanel);
                    $("<span> ago </span>").appendTo(this.valuePanel.$element);
                    break;
                case "timespan-range":
                    this.value1Field = TextBox.create({ "type": "number", "size": 4, "class": "form-control input-sm" }, this.valuePanel);
                    this.value1Type = DropDownList.create({ items: TIME_PERIOD_LIST_ITEMS }, this.valuePanel);
                    $("<span> of </span>").appendTo(this.valuePanel.$element);
                    this.value2Field = TextBox.create({ "type": "date", "class": "form-control input-sm" }, this.valuePanel);
                    break;
                case "timecode":
                    this.value1Field = TextBox.create({ "class": "form-control input-sm" }, this.valuePanel);
                    break;
                case "timecode-range":
                    this.value1Field = TextBox.create({ "type": "number", "class": "form-control input-sm" }, this.valuePanel);
                    $("<span> and </span>").appendTo(this.valuePanel.$element);
                    this.value2Field = TextBox.create({ "class": "form-control input-sm" }, this.valuePanel);
                    break;
            }
        }

        private getQueryParams(operator: OperatorInfo): string
        {
            switch (operator.param_type)
            {
                case "text":
                    if (FieldDefinitionUtil.hasValues(this.selectedFieldDef))
                    {
                        return this.value1ListField.getText();
                    }
                    else
                    {
                        return this.value1Field.getText();
                    }
                    break;
                case "number":
                    return this.value1Field.getText();
                case "date":
                    try
                    {
                        return DateUtil.parse(this.value1Field.getText(), ISO_DATE).getTime().toString();
                    }
                    catch (formatException)
                    {
                        return EPOC;
                    }
                case "date-range":
                    try
                    {
                        var date1 = DateUtil.parse(this.value1Field.getText(), ISO_DATE).getTime();
                        var date2 = DateUtil.parse(this.value2Field.getText(), ISO_DATE).getTime();
                        return "" + date1 + "," + date2;
                    }
                    catch (formatException)
                    {
                        return EPOC + "," + EPOC;
                    }
                case "number-range":
                    return this.value1Field.getText() + "," + this.value2Field.getText();
                case "timespan":
                    return (Number(this.value1Field.getText()) * Number(this.value1Type.getSelectedValue())).toString();
                case "timespan-range":
                    var seconds = Number(this.value1Field.getText()) * Number(this.value1Type.getSelectedValue());
                    return this.value2Field.getText() + "," + seconds;
                case "timecode":
                    var timecode = TimecodeUtil.parseTimecode(this.value1Field.getText(), TimecodeFormat.WHOLE_SECONDS_FORMAT);
                    return "1," + timecode.frm;
                    break;
                case "timecode-range":
                    var timecode1 = TimecodeUtil.parseTimecode(this.value1Field.getText(), TimecodeFormat.WHOLE_SECONDS_FORMAT);
                    var timecode2 = TimecodeUtil.parseTimecode(this.value2Field.getText(), TimecodeFormat.WHOLE_SECONDS_FORMAT);
                    return "1," + timecode1.frm + "," + timecode2.frm;
                    break;
            }
        }

        private setQueryParams(operator: OperatorInfo, params: string)
        {
            switch (operator.param_type)
            {
                case "text":
                    if (FieldDefinitionUtil.hasValues(this.selectedFieldDef))
                    {
                        this.value1ListField.setText(params);
                    }
                    else
                    {
                        this.value1Field.setText(params);
                    }
                    break;
                case "number":
                    this.value1Field.setText(params);
                    break;
                case "number-range":
                    this.value1Field.setText(params.split(",")[0]);
                    this.value2Field.setText(params.split(",")[1]);
                    break;
                case "date":
                    this.value1Field.setText(DateUtil.format(new Date(Number(params)), ISO_DATE));
                    break;
                case "date-range":
                    this.value1Field.setText(DateUtil.format(new Date(Number(params.split(",")[0])), ISO_DATE));
                    this.value2Field.setText(DateUtil.format(new Date(Number(params.split(",")[1])), ISO_DATE));
                    break;
                case "timespan":
                    this.value1Field.setText(params);
                    this.value1Type.setSelectedValue("1");
                    break;
                case "timespan-range":
                    this.value1Field.setText(params.split(",")[0]);
                    this.value1Type.setSelectedValue("1");
                    this.value2Field.setText(params.split(",")[1]);
                    break;
                case "timecode":
                    this.value1Field.setText(TimecodeUtil.formatTimecode({ secs: Number(params), fmt: TimecodeFormat.WHOLE_SECONDS_FORMAT }));
                    break;
                case "timecode-range":
                    this.value1Field.setText(TimecodeUtil.formatTimecode({ secs: Number(params.split(",")[1]), fmt: TimecodeFormat.WHOLE_SECONDS_FORMAT }));
                    this.value2Field.setText(TimecodeUtil.formatTimecode({ secs: Number(params.split(",")[2]), fmt: TimecodeFormat.WHOLE_SECONDS_FORMAT }));
                    break;
            }
        }
    }

    class FetchRelatedPanel extends Panel
    {
    }

    export class QueryBuilder extends Panel
    {
        private andTermsPanel: Panel;
        private btnAddAndTerm: Button;
        private andTermEditors: QueryTermEditor[] = [];

        private orTermsPanel: Panel;
        private btnAddOrTerm: Button;
        private orTermEditors: QueryTermEditor[] = [];

        private chkIgnoreCase: CheckBox;


        private operators: string[];
        private fields: FieldDefinition[]
        private fieldDefLookupByID: { [id: string]: FieldDefinition };
        private fieldDefLookupByIdentifier: { [identifier: string]: FieldDefinition };

        constructor(element: any)
        {
            super(element);
            this.$element.addClass("queryBuilder");

            var $topPanel = $("<div class='panel panel-default'>").appendTo(this.$element);
            $("<div class='panel-heading'>Find clips where all these are true</div>").appendTo($topPanel);
            var $panelBody = $("<div class='panel-body'>").appendTo($topPanel);
            this.andTermsPanel = new Panel($("<div class='termsPanel andTermsPanel'></div>").appendTo($panelBody));
            this.btnAddAndTerm = new Button($("<button class='btn btn-link'><span class='catdvicon catdvicon-add'> </span> Add Term</button>").appendTo($panelBody));
            this.btnAddAndTerm.onClick((evt) => this.addTermEditor(this.andTermsPanel, this.andTermEditors, false));

            var $bottomPanel = $("<div class='panel panel-default'>").appendTo(this.$element);
            $("<div class='panel-heading'>And at least one of these</div>").appendTo($bottomPanel);
            var $panelBody2 = $("<div class='panel-body'>").appendTo($bottomPanel);
            this.orTermsPanel = new Panel($("<div class='termsPanel andTermsPanel'></div>").appendTo($panelBody2));
            this.btnAddOrTerm = new Button($("<button class='btn btn-link'><span class='catdvicon catdvicon-add'> </span> Add Term</button>").appendTo($panelBody2));
            this.btnAddOrTerm.onClick((evt) => this.addTermEditor(this.orTermsPanel, this.orTermEditors, true));

            var $checkbox = $("<label><input type='checkbox'> Ignore Case</label>").appendTo(this.$element);
            this.chkIgnoreCase = new CheckBox($checkbox.find("input"));

            // Build lookup tables mapping ID to FieldDefinition
            this.fieldDefLookupByID = {};
            this.fieldDefLookupByIdentifier = {};
            // Add magic query fields (Name/Notes, Any Log Field, etc.) first  
            logic.SpecialQueryFields.forEach((fieldDef) =>
            {
                this.fieldDefLookupByID[fieldDef.ID] = fieldDef;
                this.fieldDefLookupByIdentifier[FieldDefinitionUtil.getLongIdentifier(fieldDef)] = fieldDef;
            });

            // Then load the rest of the definitions from the server
            FieldSettingsManager.getQueryFieldDefinitions((queryFieldDefs: FieldDefinition[]) =>
            {
                this.fields = queryFieldDefs;

                // Build lookup table
                queryFieldDefs.forEach((fieldDef) =>
                {
                    this.fieldDefLookupByID[fieldDef.ID] = fieldDef;
                    this.fieldDefLookupByIdentifier[FieldDefinitionUtil.getLongIdentifier(fieldDef)] = fieldDef;
                });

                this.addTermEditor(this.andTermsPanel, this.andTermEditors, false);
            });
        }

        public getQuery(): QueryDefinition
        {
            var terms: QueryTerm[] = [];
            this.andTermEditors.forEach((termEditor) => terms.push(termEditor.getQueryTerm(this.chkIgnoreCase.isChecked())));
            this.orTermEditors.forEach((termEditor) => terms.push(termEditor.getQueryTerm(this.chkIgnoreCase.isChecked())));

            return {
                name: "Query",
                terms: terms
            };
        }

        public setQuery(query: QueryDefinition)
        {
            this.andTermsPanel.clear();
            this.andTermEditors = [];
            this.orTermsPanel.clear();
            this.orTermEditors = [];

            var ignoreCase = false;
            query.terms.forEach((queryTerm) =>
            {
                var termEditor: QueryTermEditor;
                if (queryTerm.logicalOR)
                {
                    termEditor = this.addTermEditor(this.orTermsPanel, this.orTermEditors, true);
                }
                else
                {
                    termEditor = this.addTermEditor(this.andTermsPanel, this.andTermEditors, false);
                }
                termEditor.setQueryTerm(queryTerm);
                ignoreCase = ignoreCase || queryTerm.ignoreCase;
            });

            this.chkIgnoreCase.setChecked(ignoreCase);
        }

        private addTermEditor(parent: Panel, termEditors: QueryTermEditor[], isOrTerm: boolean): QueryTermEditor
        {
            var termEditor = new QueryTermEditor(parent, isOrTerm, this.fields, this.fieldDefLookupByID, this.fieldDefLookupByIdentifier, this);
            termEditors.push(termEditor);
            termEditor.onRemove((evt) =>
            {
                termEditor.$element.remove();
                termEditors.splice(termEditors.indexOf(termEditor), 1);
                this.updateQueryButton();
            });
            this.updateQueryButton();
            return termEditor;
        }

        private updateQueryButton()
        {
            if ((this.andTermEditors.length > 0) || (this.orTermEditors.length > 0))
            {
                $(".run-query-action").removeAttr("disabled");
            }
            else
            {
                $(".run-query-action").attr("disabled", "disabled");
            }
        }
    }
}