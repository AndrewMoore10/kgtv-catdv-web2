var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var logic;
(function (logic) {
    var $catdv = catdv.RestApi;
    var DateUtil = catdv.DateUtil;
    var FieldDefinitionUtil = catdv.FieldDefinitionUtil;
    var ViewManager = (function () {
        function ViewManager() {
        }
        ViewManager.getViewColumns = function (viewType, viewClipUrl, callback) {
            ViewManager.maybeLoadViewDefinitions(viewClipUrl, function () {
                switch (viewType) {
                    case "concise":
                        callback(ViewManager.CONCISE_COLUMNS);
                        break;
                    case "normal":
                    default:
                        callback(ViewManager.NORMAL_COLUMNS);
                        break;
                    case "full":
                        callback(ViewManager.FULL_COLUMNS);
                        break;
                }
            });
        };
        ViewManager.maybeLoadViewDefinitions = function (viewClipUrl, callback) {
            if ((ViewManager.CONCISE_COLUMNS == null) || (ViewManager.NORMAL_COLUMNS == null) || (ViewManager.FULL_COLUMNS == null)) {
                logic.ViewSettingsManager.getViewDefinitions(function (viewDefs) {
                    ViewManager.CONCISE_COLUMNS = ViewManager.buildViewColumns(viewDefs.concise, ViewManager.DEFAULT_CONCISE_COLUMNS, viewClipUrl);
                    ViewManager.NORMAL_COLUMNS = ViewManager.buildViewColumns(viewDefs.normal, ViewManager.DEFAULT_NORMAL_COLUMNS, viewClipUrl);
                    ViewManager.FULL_COLUMNS = ViewManager.buildViewColumns(viewDefs.full, ViewManager.DEFAULT_FULL_COLUMNS, viewClipUrl);
                    callback();
                });
            }
            else {
                callback();
            }
        };
        ViewManager.buildViewColumns = function (fieldDefs, defaultFields, viewClipUrl) {
            var columns = [];
            if ((fieldDefs != null) && (fieldDefs.length > 0)) {
                fieldDefs.forEach(function (fieldDef) {
                    var fieldAccesor = logic.AccessorFactory.createAccessor(fieldDef.fieldDefinition);
                    if (fieldDef.fieldDefinition.isBuiltin && !fieldDef.fieldDefinition.width) {
                        var builtInFieldDef = logic.BuiltInFields[fieldDef.fieldDefinition.ID];
                        if (builtInFieldDef) {
                            fieldDef.fieldDefinition.width = builtInFieldDef.width;
                        }
                    }
                    columns.push(ViewColumnFactory.createField(fieldDef.fieldDefinition, fieldAccesor, viewClipUrl));
                });
            }
            else {
                defaultFields.forEach(function (fieldDefinitionID) {
                    var fieldDefinition = logic.BuiltInFields[fieldDefinitionID];
                    var fieldAccesor = logic.AccessorFactory.createAccessor(fieldDefinition);
                    columns.push(ViewColumnFactory.createField(fieldDefinition, fieldAccesor, viewClipUrl));
                });
            }
            return columns;
        };
        /** The columns for a concise view (text only). */
        ViewManager.DEFAULT_CONCISE_COLUMNS = [
            "P1",
            "NM1",
            "U6",
            // "I1",
            // "O1",
            // "D1",
            "FF",
            // "STS",
            "NT"
        ];
        /** The columns for a normal view (with poster). */
        ViewManager.DEFAULT_NORMAL_COLUMNS = [
            "P1",
            "TY2",
            "NM1",
            "U6",
            // "BN",
            // "I1",
            // "O1",
            // "D1",
            "MD1",
            "FF",
            // "RD1",
            // "STS",
            "NT"
        ];
        /** The columns for detailed view */
        ViewManager.DEFAULT_FULL_COLUMNS = [
            "P1",
            "TY2",
            "NM1",
            "TY1",
            "BN",
            "TP",
            "I1",
            "O1",
            "D1",
            "FF",
            "RD1",
            "STS",
            "NT",
        ];
        ViewManager.CONCISE_COLUMNS = null;
        ViewManager.NORMAL_COLUMNS = null;
        ViewManager.FULL_COLUMNS = null;
        return ViewManager;
    })();
    logic.ViewManager = ViewManager;
    var ViewColumn = (function () {
        function ViewColumn(fieldDef, fieldAccesor) {
            var _this = this;
            this.fieldDef = fieldDef;
            this.fieldAccesor = fieldAccesor;
            this.title = fieldDef.name;
            this.width = fieldDef.width;
            this.isSortable = fieldDef.isSortable;
            this.sortBy = FieldDefinitionUtil.getSortBy(fieldDef);
            this.renderer = function (object, val) { return _this.render(object); };
        }
        ViewColumn.prototype.render = function (clip) {
            return null;
        };
        return ViewColumn;
    })();
    logic.ViewColumn = ViewColumn;
    var TextColumn = (function (_super) {
        __extends(TextColumn, _super);
        function TextColumn(fieldDef, fieldAccesor) {
            _super.call(this, fieldDef, fieldAccesor);
        }
        TextColumn.prototype.render = function (clip) {
            var value = this.fieldAccesor.getValue(clip);
            if (!value)
                return "";
            switch (this.fieldDef.fieldType) {
                case "date":
                    return DateUtil.format(value, TextColumn.DATE_FORMAT);
                case "datetime":
                    return DateUtil.format(value, TextColumn.DATETIME_FORMAT);
                case "time":
                    return DateUtil.format(value, TextColumn.TIME_FORMAT);
                default:
                    if (typeof value == "object") {
                        return value + "?";
                    }
                    else {
                        return value;
                    }
            }
        };
        TextColumn.DATE_FORMAT = "YYYY-MM-DD";
        TextColumn.DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
        TextColumn.TIME_FORMAT = "HH:mm:ss";
        return TextColumn;
    })(ViewColumn);
    logic.TextColumn = TextColumn;
    var NameColumn = (function (_super) {
        __extends(NameColumn, _super);
        function NameColumn(fieldDef, fieldAccesor, viewClipUrl) {
            _super.call(this, fieldDef, fieldAccesor);
            this.viewClipUrl = viewClipUrl;
        }
        NameColumn.prototype.render = function (clip) {
            return this.viewClipUrl ? "<a href='" + this.viewClipUrl + "?id=" + clip.ID + " '>" + clip.name + "</a>" : clip.name;
        };
        return NameColumn;
    })(ViewColumn);
    logic.NameColumn = NameColumn;
    var ThumbnailColumn = (function (_super) {
        __extends(ThumbnailColumn, _super);
        function ThumbnailColumn(fieldDef, fieldAccesor) {
            _super.call(this, fieldDef, fieldAccesor);
        }
        ThumbnailColumn.prototype.render = function (clip) {
            var thumbnailID = this.fieldAccesor.getValue(clip);
            return thumbnailID != -1 ? "<img src='" + $catdv.getApiUrl("thumbnails/" + thumbnailID + "?width=64&height=48&fmt=png") + "'>" : "";
        };
        return ThumbnailColumn;
    })(ViewColumn);
    logic.ThumbnailColumn = ThumbnailColumn;
    var TypeIconColumn = (function (_super) {
        __extends(TypeIconColumn, _super);
        function TypeIconColumn(fieldDef, fieldAccesor) {
            _super.call(this, fieldDef, fieldAccesor);
        }
        TypeIconColumn.prototype.render = function (clip) {
            var clipType = this.fieldAccesor.getValue(clip);
            return "<img src='img/cliptype_" + clipType + ".gif'>";
        };
        return TypeIconColumn;
    })(ViewColumn);
    logic.TypeIconColumn = TypeIconColumn;
    var MediaPathColumn = (function (_super) {
        __extends(MediaPathColumn, _super);
        function MediaPathColumn(fieldDef, fieldAccesor) {
            _super.call(this, fieldDef, fieldAccesor);
        }
        MediaPathColumn.prototype.render = function (clip) {
            var link = this.fieldAccesor.getValue(clip);
            if (link) {
                return link.downloadUrl ? "<a href='" + link.downloadUrl + "'>" + link.path + "</a>" : link.path;
            }
            else {
                return "";
            }
        };
        return MediaPathColumn;
    })(ViewColumn);
    logic.MediaPathColumn = MediaPathColumn;
    var ViewColumnFactory = (function () {
        function ViewColumnFactory() {
        }
        ViewColumnFactory.createField = function (fieldDef, fieldAccesor, viewClipUrl) {
            if (fieldDef.ID == "NM1") {
                return new NameColumn(fieldDef, fieldAccesor, viewClipUrl);
            }
            else if ((fieldDef.ID == "MF") || (fieldDef.ID == "PF")) {
                return new MediaPathColumn(fieldDef, fieldAccesor);
            }
            if (fieldDef.fieldType == "thumbnail") {
                return new ThumbnailColumn(fieldDef, fieldAccesor);
            }
            else if (fieldDef.fieldType == "typeicon") {
                return new TypeIconColumn(fieldDef, fieldAccesor);
            }
            else {
                return new TextColumn(fieldDef, fieldAccesor);
            }
        };
        return ViewColumnFactory;
    })();
    logic.ViewColumnFactory = ViewColumnFactory;
})(logic || (logic = {}));
