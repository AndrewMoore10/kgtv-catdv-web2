module logic
{
    import DataTableColumn = controls.DataTableColumn;

    import $catdv = catdv.RestApi;
    import Clip = catdv.Clip;
    import DateUtil = catdv.DateUtil;
    import TimecodeUtil = catdv.TimecodeUtil;
    import FieldDefinition = catdv.FieldDefinition;
    import FieldDefinitionUtil = catdv.FieldDefinitionUtil;
    import ViewField = catdv.ViewField;

    export class ViewManager
    {
        /** The columns for a concise view (text only). */
        private static DEFAULT_CONCISE_COLUMNS: string[] = [
            "TY2", "NM1", "I1", "O1", "D1", "FF", "STS", "NT"
        ];

        /** The columns for a normal view (with poster). */
        private static DEFAULT_NORMAL_COLUMNS: string[] = [
            "P1", "TY2", "NM1", "BN", "I1", "O1", "D1", "FF", "RD1", "STS", "NT"
        ];

        /** The columns for detailed view */
        private static DEFAULT_FULL_COLUMNS: string[] = [
            "P1", "TY2", "NM1", "TY1", "BN", "TP", "I1", "O1", "D1", "FF", "RD1", "STS", "NT",
        ];

        private static CONCISE_COLUMNS: ViewColumn[] = null;
        private static NORMAL_COLUMNS: ViewColumn[] = null;
        private static FULL_COLUMNS: ViewColumn[] = null;

        public static getViewColumns(viewType: string, viewClipUrl: string, callback: (columns: ViewColumn[]) => void)
        {
            ViewManager.maybeLoadViewDefinitions(viewClipUrl, () =>
            {
                switch (viewType)
                {
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
        }

        private static maybeLoadViewDefinitions(viewClipUrl: string, callback: () => void)
        {
            if ((ViewManager.CONCISE_COLUMNS == null) || (ViewManager.NORMAL_COLUMNS == null) || (ViewManager.FULL_COLUMNS == null))
            {
                ViewSettingsManager.getViewDefinitions((viewDefs) =>
                {
                    ViewManager.CONCISE_COLUMNS = ViewManager.buildViewColumns(viewDefs.concise, ViewManager.DEFAULT_CONCISE_COLUMNS, viewClipUrl);
                    ViewManager.NORMAL_COLUMNS = ViewManager.buildViewColumns(viewDefs.normal, ViewManager.DEFAULT_NORMAL_COLUMNS, viewClipUrl);
                    ViewManager.FULL_COLUMNS = ViewManager.buildViewColumns(viewDefs.full, ViewManager.DEFAULT_FULL_COLUMNS, viewClipUrl);
                    callback();
                });
            }
            else
            {
                callback();
            }
        }

        private static buildViewColumns(fieldDefs: ViewField[], defaultFields: string[], viewClipUrl: string): ViewColumn[]
        {
            var columns: ViewColumn[] = [];

            if ((fieldDefs != null) && (fieldDefs.length > 0))
            {
                fieldDefs.forEach((fieldDef) => 
                {
                    var fieldAccesor = AccessorFactory.createAccessor(fieldDef.fieldDefinition);
                    if (fieldDef.fieldDefinition.isBuiltin && !fieldDef.fieldDefinition.width)
                    {
                        var builtInFieldDef = BuiltInFields[fieldDef.fieldDefinition.ID];
                        if (builtInFieldDef)
                        {
                            fieldDef.fieldDefinition.width = builtInFieldDef.width;
                        }
                    }
                    columns.push(ViewColumnFactory.createField(fieldDef.fieldDefinition, fieldAccesor, viewClipUrl));
                });
            }
            else
            {
                defaultFields.forEach((fieldDefinitionID) =>
                {
                    var fieldDefinition = BuiltInFields[fieldDefinitionID];
                    var fieldAccesor = AccessorFactory.createAccessor(fieldDefinition);
                    columns.push(ViewColumnFactory.createField(fieldDefinition, fieldAccesor, viewClipUrl));
                });
            }

            return columns
        }
    }

    export class ViewColumn implements DataTableColumn
    {
        public title: string;
        public width: number;
        public isSortable: boolean;
        public sortBy: string;
        public renderer: (object: any, val: any) => string;

        public fieldDef: FieldDefinition;
        public fieldAccesor: FieldAccessor;

        constructor(fieldDef: FieldDefinition, fieldAccesor: FieldAccessor)
        {
            this.fieldDef = fieldDef;
            this.fieldAccesor = fieldAccesor;
            this.title = fieldDef.name;
            this.width = fieldDef.width;
            this.isSortable = fieldDef.isSortable;
            this.sortBy = FieldDefinitionUtil.getSortBy(fieldDef);
            this.renderer = (object: any, val: any) => this.render(<Clip>object);
        }

        public render(clip: Clip): string
        {  /* abstract */ return null; }
    }

    export class TextColumn extends ViewColumn
    {
        private static DATE_FORMAT = "YYYY-MM-DD";
        private static DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
        private static TIME_FORMAT = "HH:mm:ss";

        constructor(fieldDef: FieldDefinition, fieldAccesor: FieldAccessor)
        {
            super(fieldDef, fieldAccesor);
        }

        public render(clip: Clip): string
        {
            var value = this.fieldAccesor.getValue(clip);

            if (!value) return "";

            switch (this.fieldDef.fieldType)
            {
                case "date":
                    return DateUtil.format(<Date>value, TextColumn.DATE_FORMAT);
                case "datetime":
                    return DateUtil.format(<Date>value, TextColumn.DATETIME_FORMAT);
                case "time":
                    return DateUtil.format(<Date>value, TextColumn.TIME_FORMAT);
                default:
                    if (typeof value == "object")
                    {
                        return value + "?";
                    }
                    else
                    {
                        return value;
                    }
            }
        }
    }


    export class NameColumn extends ViewColumn
    {
        private viewClipUrl: string;

        constructor(fieldDef: FieldDefinition, fieldAccesor: FieldAccessor, viewClipUrl: string)
        {
            super(fieldDef, fieldAccesor);
            this.viewClipUrl = viewClipUrl;
        }

        public render(clip: Clip): string
        {
            return this.viewClipUrl ? "<a href='" + this.viewClipUrl + "?id=" + clip.ID + " '>" + clip.name + "</a>" : clip.name;
        }
    }

    export class ThumbnailColumn extends ViewColumn
    {
        constructor(fieldDef: FieldDefinition, fieldAccesor: FieldAccessor)
        {
            super(fieldDef, fieldAccesor);
        }

        public render(clip: Clip): string
        {
            var thumbnailID = this.fieldAccesor.getValue(clip);
            return thumbnailID != -1 ? "<img src='" + $catdv.getApiUrl("thumbnails/" + thumbnailID + "?width=64&height=48&fmt=png") + "'>" : "";
        }
    }

    export class TypeIconColumn extends ViewColumn
    {
        constructor(fieldDef: FieldDefinition, fieldAccesor: FieldAccessor)
        {
            super(fieldDef, fieldAccesor);
        }

        public render(clip: Clip): string
        {
            var clipType = this.fieldAccesor.getValue(clip);
            return "<img src='img/cliptype_" + clipType + ".gif'>";
        }
    }


    export class MediaPathColumn extends ViewColumn
    {
        private div: Element;

        constructor(fieldDef: FieldDefinition, fieldAccesor: FieldAccessor)
        {
            super(fieldDef, fieldAccesor);
        }

        public render(clip: Clip): string
        {
            var link = this.fieldAccesor.getValue(clip);
            if (link)
            {
                  return link.downloadUrl ? "<a href='" + link.downloadUrl + "'>" + link.path + "</a>" : link.path;
            }
            else
            {
                return "";
            }
        }
    }

    export class ViewColumnFactory
    {
        public static createField(fieldDef: FieldDefinition, fieldAccesor: FieldAccessor, viewClipUrl: string): ViewColumn
        {
            if (fieldDef.ID == "NM1")
            {
                return new NameColumn(fieldDef, fieldAccesor, viewClipUrl);
            }
            else if ((fieldDef.ID == "MF") || (fieldDef.ID == "PF"))
            {
                return new MediaPathColumn(fieldDef, fieldAccesor);
            }
            if (fieldDef.fieldType == "thumbnail")
            {
                return new ThumbnailColumn(fieldDef, fieldAccesor);
            }
            else if (fieldDef.fieldType == "typeicon")
            {
                return new TypeIconColumn(fieldDef, fieldAccesor);
            }
            else
            {
                return new TextColumn(fieldDef, fieldAccesor);
            }
        }
    }

}
