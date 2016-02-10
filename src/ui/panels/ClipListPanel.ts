module ui.panels
{
    import Panel = controls.Panel;
    import Control = controls.Control;
    import Label = controls.Label;
    import PagedDataSource = controls.PagedDataSource;
    import DataTable = controls.DataTable;
    import DataTableColumn = controls.DataTableColumn;
    import Element = controls.Element;
    import PagingControls = controls.PagingControls;
    import OptionsButton = controls.OptionsButton;
    import SelectionChangedEvent = controls.SelectionChangedEvent;

    import $catdv = catdv.RestApi;
    import PartialResultSet = catdv.PartialResultSet;
    import QueryDefinition = catdv.QueryDefinition;
    import QueryDefinitionUtil = catdv.QueryDefinitionUtil;
    import Clip = catdv.Clip;
    import Catalog = catdv.Catalog;
    import SmartFolder = catdv.SmartFolder;
    import HtmlUtil = util.HtmlUtil;

    import ViewManager = logic.ViewManager;
    import ViewColumnFactory = logic.ViewColumnFactory;

    export enum ClipViewType
    {
        Grid = 1,
        Filmstrip = 2,
        Table = 3
    }

    interface ClipView 
    {
        getSelectedClips(): Clip[];
        onSelectionChanged(selectionChangedHandler: (evt: SelectionChangedEvent) => void);
        reload(pagingOffset? : number);
    }

    // Common aspects of GridView and FilmstripView
    class BaseThumbnailView extends Control implements ClipView
    {
        public dataSource: PagedDataSource;
        public resultSet: PartialResultSet<Clip>;
        public pageSize: number;
        public pagingControls: PagingControls;
        public viewClipUrl: string = null;

        private selectedIndexes: number[] = [];
        private selectionChangedHandler: (evt: SelectionChangedEvent) => void;

        public thumbnailSize: string;
        public $scrollview: JQuery;

        constructor(element: any, cssClass: string, thumbnailSize: string, pageSize: number, viewClipUrl: string, dataSource: PagedDataSource)
        {
            super(element);

            this.$element.addClass(cssClass);
            this.$element.css({
                "position": "relative",
                "height": "100%",
            });

            this.thumbnailSize = thumbnailSize;
            this.pageSize = pageSize;
            this.viewClipUrl = viewClipUrl;
            this.dataSource = dataSource;

            this.$scrollview = $("<div>").css({
                "position": "absolute",
                "top": "0px",
                "left": "0px",
                "width": "100%",
                "bottom": "40px",
                "overflow": "auto"
            }).appendTo(this.$element);

            var $footer = $("<div>").css({
                "position": "absolute",
                "left": "0px",
                "width": "100%",
                "height": "40px",
                "bottom": "0px",
            }).appendTo(this.$element);

            this.pagingControls = new PagingControls(this.elementId + "_paging", $footer, this.pageSize);
            this.pagingControls.onLoadPage((skip, take) =>
            {
                this.loadData(skip, take);
            });
        }

        public onSelectionChanged(selectionChangedHandler: (evt: SelectionChangedEvent) => void)
        {
            this.selectionChangedHandler = selectionChangedHandler;
        }

        public getSelectedClips(): Clip[]
        {
            return this.selectedIndexes.map((selectedIndex) => this.resultSet.items[selectedIndex]);
        }

        private updateActionButtons()
        {
            if (this.selectedIndexes.length > 0)
            {
                $("button.item-action").removeAttr("disabled");
                $("li.item-action").removeClass("disabled");
            }
            else
            {
                $("button.item-action").attr("disabled", "disabled");
                $("li.item-action").addClass("disabled");
            }
        }

        public reload(pagingOffset : number = 0)
        {
            this.loadData(pagingOffset, this.pageSize);
        }

        public loadData(skip: number, take: number)
        {
            this._showLoadingMessage();
            this.dataSource.getData({ skip: skip, take: take }, (resultSet: PartialResultSet<Clip>) =>
            {
                this.resultSet = resultSet;
                this.pagingControls.update(resultSet);
                this._renderClips(resultSet.items);
                this.selectedIndexes = [];
                this.updateActionButtons();
            });
        }

        public _item_onClick(evt: JQueryEventObject, clickedRowIndex: number, doubleClick: boolean) 
        {
            if (!(evt.ctrlKey || evt.metaKey) && !evt.shiftKey && this.selectedIndexes.length > 0)
            {
                // deselect everything
                this.selectedIndexes = [];
                this._deselectAllRows();
            }

            if (evt.shiftKey && this.selectedIndexes.length > 0)
            {
                // select all rows between existing selection and this row              
                // capture the first selected row
                var firstSelectedRow = this.selectedIndexes[0];

                // then deselect everything - need to deselect anything outside the range
                this.selectedIndexes = [];
                this._deselectAllRows();

                // then select all the rows from first to current
                var numSelectedItems = Math.abs(clickedRowIndex - firstSelectedRow) + 1;
                var step = (clickedRowIndex > firstSelectedRow) ? 1 : -1;
                var index = firstSelectedRow;
                for (var i = 0; i < numSelectedItems; i++)
                {
                    this.selectedIndexes.push(index);
                    this._selectRow(index);
                    index += step;
                }
            }
            else
            {
                // select clicked row
                this.selectedIndexes.push(clickedRowIndex);
                this._selectRow(clickedRowIndex);
            }

            this.updateActionButtons();

            if (this.selectionChangedHandler)
            {
                this.selectionChangedHandler({
                    selectedIndexes: this.selectedIndexes,
                    selectedItems: this.getSelectedClips(),
                    doubleClick: doubleClick
                });
            }
        }

        public _showLoadingMessage()
        {
            this.$scrollview.html("<h3 class='loadingMessage'>Loading...</h3>");
        }

        public _renderClips(clips: Clip[])
        { /* abstract */ }

        public _selectRow(rowIndex: number)
        { /* abstract */ }

        public _deselectAllRows()
        { /* abstract */ }
    }

    class GridView extends BaseThumbnailView
    {
        constructor(element: any, thumbnailSize: string, pageSize: number, viewClipUrl: string, dataSource: PagedDataSource)
        {
            super(element, "gridView", thumbnailSize, pageSize, viewClipUrl, dataSource);
        }

        public _renderClips(clips: Clip[])
        {
            this.$scrollview.empty();

            clips.forEach((clip, i) =>
            {
                var url = $catdv.getApiUrl("thumbnails/" + clip.posterID);
                var $cell = $("<div id='" + this.elementId + "_" + i + "' class='cell " + this.thumbnailSize + "' style='display: inline-block'>").appendTo(this.$scrollview);
                var $imgContainer = $("<div style='position: relative'>").appendTo($cell);

                $("<img src='" + url + "'>").css({
                    "position": "absolute",
                    "margin": "auto",
                    "top": "0px",
                    "left": "0px",
                    "bottom": "0px",
                    "right": "0px",
                    "vertical-align": "bottom"
                }).appendTo($imgContainer);

                if (this.viewClipUrl)
                {
                    $("<a href='" + this.viewClipUrl + "?id=" + clip.ID + " '>" + clip.name + "</a>").css({
                        "display": "block",
                        "overflow": "hidden",
                        "white-space": "nowrap"
                    }).appendTo($cell);
                }
                else
                {
                    $("<span>" + clip.name + "</span>").css({
                        "display": "block",
                        "overflow": "hidden",
                        "white-space": "nowrap"
                    }).appendTo($cell);
                }

                $cell.on("click", (evt) => super._item_onClick(evt, i, false));

                $cell.on("dblclick", (evt) => super._item_onClick(evt, i, true));

            });
        }

        public _selectRow(rowIndex: number)
        {
            this.$element.find("#" + this.elementId + "_" + rowIndex).addClass("selected");
        }

        public _deselectAllRows()
        {
            this.$element.find("div.cell").removeClass("selected");
        }

    }

    class FilmstripView extends BaseThumbnailView
    {
        constructor(element: any, thumbnailSize: string, pageSize: number, viewClipUrl: string, dataSource: PagedDataSource)
        {
            super(element, "filmstripView", thumbnailSize, pageSize, viewClipUrl, dataSource);
        }

        public _renderClips(clips: Clip[])
        {
            this.$scrollview.empty();

            clips.forEach((clip, i) =>
            {
                // horizontal strip with info  header at left and then thumbnails 
                var $row = $("<div id='" + this.elementId + "_" + i + "' class='filmstripRow " + this.thumbnailSize + "'>").css({
                    "white-space": "nowrap",
                }).appendTo(this.$scrollview);

                $row.on("click", (evt) => super._item_onClick(evt, i, false));

                $row.on("dblclick", (evt) => super._item_onClick(evt, i, true));

                var $header = $("<div class='header' style=''>").css({
                    "display": "inline-block",
                    "vertical-align": "bottom"
                }).appendTo($row);

                if (this.viewClipUrl)
                {
                    $("<a href='" + this.viewClipUrl + "?id=" + clip.ID + " '>" + clip.name + "</a>").css({
                        "display": "block",
                        "overflow": "hidden",
                        "white-space": "nowrap"
                    }).appendTo($header);
                }
                else
                {
                    $("<span>" + clip.name + "</span>").css({
                        "display": "block",
                        "overflow": "hidden",
                        "white-space": "nowrap"
                    }).appendTo($header);
                }

                if (clip.duration.secs > 0) 
                {

                    var $filmstrip = $("<div class='filmstrip'>").css({
                        "display": "inline-block",
                        "vertical-align": "bottom",
                        "position": "relative",
                        "overflow": "hidden",
                        "white-space": "nowrap"
                    }).appendTo($row);

                    var $thumbnails = $("<div class='thumbnails'>").css({
                        "display": "inline-block",
                    }).appendTo($filmstrip);

                    var thumbnailIDs = clip.thumbnailIDs || (clip.posterID ? [clip.posterID] : []);
                    thumbnailIDs.forEach((thumbnailID) =>
                    {
                        var url = $catdv.getApiUrl("thumbnails/" + thumbnailID);
                        var $img = $("<img src='" + url + "'>").appendTo($thumbnails);
                    });
                }
                else if(clip.posterID)
                {
                    // still
                    var url = $catdv.getApiUrl("thumbnails/" + clip.posterID);
                    var $img = $("<img src='" + url + "' class='still'>").appendTo($row);             
                }

            });
        }

        public _selectRow(rowIndex: number)
        {
            this.$element.find("#" + this.elementId + "_" + rowIndex).addClass("selected");
        }

        public _deselectAllRows()
        {
            this.$element.find("div.filmstripRow").removeClass("selected");
        }
    }

    class TableView extends DataTable implements ClipView
    {
        constructor(element: any, viewType: string, viewClipUrl: string, dataSource: PagedDataSource)
        {
            super(element, {
                multiselect: true,
                dataSource: dataSource,
                columns: null
            });

            this.css({ "position": "absolute", "top": "0px", "left": "0px", "width": "100%", "height": "100%" });

            ViewManager.getViewColumns(viewType, viewClipUrl, (columns) =>
            {
                this.setColumns(columns);
            });

        }

        public getSelectedClips(): Clip[]
        {
            return this.getSelectedItems();
        }
    }

    export class ClipListPanel extends Panel implements PagedDataSource
    {
        public static VIEW_GRID = 1;
        public static FILMSTRIP = 1;
        public static TABLE = 1;

        private currentView: ClipView;

        private btnListViews: OptionsButton;
        private btnGridViews: OptionsButton;
        private btnFilmstripViews: OptionsButton;
        private lblListTitle: Label;

        private currentViewType: ClipViewType = null;
        private currentViewOptions: String = null;
        private currentQuery: QueryDefinition = null;
        private currentCatalogID: number = null;
        private currentSmartFolderID: number = null;
        private listTitle: string = null;
        private viewClipUrl: string = null;
        private useCache : boolean;

        private selectionChangedHandler: (evt: SelectionChangedEvent) => void;
        private queryChangedHandler: () => void;

        public $clipList: JQuery;

        constructor(element: any, viewClipUrl: string)
        {
            super(element);

            this.viewClipUrl = viewClipUrl;

            this.$element.html(
                "<div class='clipListHeader'>" +
                "  <h1 id='listTitle'>Clips</h1>  " +
                "  <div class='viewControls pull-right'>" +
                "    <div id='btnListViews'></div><div id='btnGridViews'></div><div id='btnFilmstripViews'></div>" +
                "  </div>" +
                "</div>");

            this.$clipList = $("<div class='clipListContent'></div>").appendTo(this.$element);

            this.btnListViews = new OptionsButton("btnListViews", "catdvicon catdvicon-list_view", ["Concise", "Normal", "Full"], "Normal");
            this.btnGridViews = new OptionsButton("btnGridViews", "catdvicon catdvicon-thumb_view", ["Small", "Medium", "Large", "Huge"], "Medium");
            this.btnFilmstripViews = new OptionsButton("btnFilmstripViews", "catdvicon catdvicon-filmstrip_view", ["Small", "Medium", "Large", "Huge"], "Medium");
            this.lblListTitle = new Label("listTitle");

            this.btnListViews.onClick((evt, option) =>
            {
                this.setView(ClipViewType.Table, option.toLowerCase());
            });
            this.btnGridViews.onClick((evt, option) =>
            {
                this.setView(ClipViewType.Grid, option.toLowerCase());
            });
            this.btnFilmstripViews.onClick((evt, option) =>
            {
                this.setView(ClipViewType.Filmstrip, option.toLowerCase());
            });

            // load query/view info          
            var viewType = parseInt($.cookie("catdv_viewType") || "1"); /* grid */
            var viewOptions = $.cookie("catdv_viewOptions") || "medium";

            // View clip page sets catdv_useCache cookie so if the user comes back from there we
            // know to use the cache. 
            this.useCache = $.cookie("catdv_useCache") === "true";
            // But we want to clear it so if they hit refresh we won't use cache
            $.cookie("catdv_useCache", "false");
            
            try
            {
                var searchType = $.cookie("catdv_searchType") || "query";

                this.listTitle = $.cookie("catdv_searchTitle") || "Query Results";

                switch (searchType)
                {
                    case "query":
                        this.currentQuery = QueryDefinitionUtil.parse($.cookie("catdv_filterText"));
                        break;
                    case "catalog":
                        this.currentCatalogID = Number($.cookie("catdv_catalogID"));
                        break;
                    case "smartFolder":
                        this.currentSmartFolderID = Number($.cookie("catdv_smartFolderID"));
                        break;
                }
            }
            catch (e)
            {
                // stored data corrupted in some way - fall back to open query
                this.currentCatalogID = null;
                this.currentSmartFolderID = null;
                this.currentQuery = null;
            }

            var pagingOffset = parseInt($.cookie("catdv_pagingOffset") || "0");
            this.setView(viewType, viewOptions, pagingOffset);
        }

        public getSelectedClips(): Clip[]
        {
            return this.currentView.getSelectedClips();
        }

        public onSelectionChanged(selectionChangedHandler: (evt: SelectionChangedEvent) => void)
        {
            this.selectionChangedHandler = selectionChangedHandler;
        }

        public setView(viewType: ClipViewType, viewOptions: string, pagingOffset : number = 0)
        {
            this.currentViewType = viewType;
            this.currentViewOptions = viewOptions;

            this.$clipList.empty();

            switch (this.currentViewType)
            {
                case ClipViewType.Grid:
                default:
                    this.currentView = new GridView($("<div id='gridView'>").appendTo(this.$clipList), viewOptions, 120, this.viewClipUrl, this);
                    $("#btnGridViews button").addClass("btn-active");
                    $("#btnListViews button").removeClass("btn-active");
                    $("#btnFilmstripViews button").removeClass("btn-active");
                    this.btnGridViews.setOption(viewOptions);
                    break;

                case ClipViewType.Filmstrip:
                    this.currentView = new FilmstripView($("<div id='filmstripView'>").appendTo(this.$clipList), viewOptions, 30, this.viewClipUrl, this);
                    $("#btnFilmstripViews button").addClass("btn-active");
                    $("#btnGridViews button").removeClass("btn-active");
                    $("#btnListViews button").removeClass("btn-active");
                    this.btnFilmstripViews.setOption(viewOptions);
                    break;

                case ClipViewType.Table:
                    this.currentView = new TableView($("<div id='tableView'>").appendTo(this.$clipList), viewOptions, this.viewClipUrl, this);
                    $("#btnListViews button").addClass("btn-active");
                    $("#btnGridViews button").removeClass("btn-active");
                    $("#btnFilmstripViews button").removeClass("btn-active");
                    this.btnListViews.setOption(viewOptions);
                    break;
            }

            this.currentView.onSelectionChanged((evt) =>
            {
                if (this.selectionChangedHandler)
                {
                    this.selectionChangedHandler(evt);
                }
            });

            this.reload(pagingOffset);
        }

        public getQuery(): QueryDefinition
        {
            return this.currentQuery;
        }
        public setQuery(query: QueryDefinition, queryDescription: string)
        {
            this.currentQuery = query;
            this.currentCatalogID = null;
            this.currentSmartFolderID = null;
            this.listTitle = queryDescription || "Query Results";
            this.fireQueryChanged();
            this.useCache = false;
            this.reload();
        }

        public getCatalogID(): number
        {
            return this.currentCatalogID;
        }
        public setCatalogID(catalog: Catalog)
        {
            this.currentCatalogID = catalog.ID;
            this.currentSmartFolderID = null;
            this.currentQuery = null;
            this.listTitle = "Catalog: " + catalog.name;
            this.fireQueryChanged();
            this.useCache = false;
            this.reload();
        }

        public getSmartFolderID(): number
        {
            return this.currentSmartFolderID;
        }
        public setSmartFolderID(smartFolder: SmartFolder)
        {
            this.currentSmartFolderID = smartFolder.ID;
            this.currentCatalogID = null;
            this.currentQuery = null;
            this.listTitle = "Smart Folder: " + smartFolder.name;
            this.fireQueryChanged();
            this.useCache = false;
            this.reload();
        }

        public onQueryChanged(queryChangedHandler: () => void)
        {
            this.queryChangedHandler = queryChangedHandler;

            // fire event as soon as handler is registered to update caller with filters read from cookies
            this.fireQueryChanged();
        }
        private fireQueryChanged()
        {
            if (this.queryChangedHandler)
            {
                this.queryChangedHandler();
            }
        }

        public reload(pagingOffset : number = 0)
        {
            var colonIndex = this.listTitle.indexOf(":");
            if (colonIndex != -1)
            {
                this.lblListTitle.$element.html(this.listTitle.substr(0, colonIndex)
                    + "<span>" + HtmlUtil.escapeHtml(this.listTitle.substr(colonIndex + 1)) + "</span>");
            }
            else
            {
                this.lblListTitle.setText(this.listTitle);
            }
            this.currentView.reload(pagingOffset);
        }

        /* Implement PagedDataSource.getData() */
        public getData(params: catdv.StdParams, callback: (resultSet: PartialResultSet<any>) => void)
        {
            // save search options to cookies
            $.cookie("catdv_viewType", String(this.currentViewType));
            $.cookie("catdv_viewOptions", this.currentViewOptions);
            $.cookie("catdv_searchTitle", this.listTitle);
            $.cookie("catdv_pagingOffset", String(params.skip));

            if (this.currentCatalogID)
            {
                params["catalogID"] = this.currentCatalogID;
                $.cookie("catdv_searchType", "catalog");
                $.cookie("catdv_catalogID", String(this.currentCatalogID));
            }
            else if (this.currentSmartFolderID)
            {
                params["smartFolderID"] = this.currentSmartFolderID;
                $.cookie("catdv_searchType", "smartFolder");
                $.cookie("catdv_smartFolderID", String(this.currentSmartFolderID));
            }
            else if (this.currentQuery)
            {
                params["filter"] = QueryDefinitionUtil.toFilterString(this.currentQuery);
                $.cookie("catdv_searchType", "query");
                $.cookie("catdv_filterText", params.filter);
            }
            else
            {
                params["filter"] = "";
                $.cookie("catdv_searchType", "");
            }
            params["cached"] = this.useCache;

            // TODO: should check which view columns we have to see if we need user fields or metadata
            params["include"] = "userfields,metadata,thumbnails";

            $catdv.getClips(params,
                (resultSet: PartialResultSet<any>) =>
            {
                    this.useCache = true;
                callback(resultSet);
                },
                () =>
                {
                    callback({ totalItems: 0, offset: 0, items: [] });
            });
        }
    }
}