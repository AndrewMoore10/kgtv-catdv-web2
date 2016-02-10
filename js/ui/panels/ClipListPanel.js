var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ui;
(function (ui) {
    var panels;
    (function (panels) {
        var Panel = controls.Panel;
        var Control = controls.Control;
        var Label = controls.Label;
        var DataTable = controls.DataTable;
        var PagingControls = controls.PagingControls;
        var OptionsButton = controls.OptionsButton;
        var $catdv = catdv.RestApi;
        var QueryDefinitionUtil = catdv.QueryDefinitionUtil;
        var HtmlUtil = util.HtmlUtil;
        var ViewManager = logic.ViewManager;
        (function (ClipViewType) {
            ClipViewType[ClipViewType["Grid"] = 1] = "Grid";
            ClipViewType[ClipViewType["Filmstrip"] = 2] = "Filmstrip";
            ClipViewType[ClipViewType["Table"] = 3] = "Table";
        })(panels.ClipViewType || (panels.ClipViewType = {}));
        var ClipViewType = panels.ClipViewType;
        // Common aspects of GridView and FilmstripView
        var BaseThumbnailView = (function (_super) {
            __extends(BaseThumbnailView, _super);
            function BaseThumbnailView(element, cssClass, thumbnailSize, pageSize, viewClipUrl, dataSource) {
                var _this = this;
                _super.call(this, element);
                this.viewClipUrl = null;
                this.selectedIndexes = [];
                this.$element.addClass(cssClass);
                this.$element.css({
                    "position": "relative",
                    "height": "100%"
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
                    "bottom": "0px"
                }).appendTo(this.$element);
                this.pagingControls = new PagingControls(this.elementId + "_paging", $footer, this.pageSize);
                this.pagingControls.onLoadPage(function (skip, take) {
                    _this.loadData(skip, take);
                });
            }
            BaseThumbnailView.prototype.onSelectionChanged = function (selectionChangedHandler) {
                this.selectionChangedHandler = selectionChangedHandler;
            };
            BaseThumbnailView.prototype.getSelectedClips = function () {
                var _this = this;
                return this.selectedIndexes.map(function (selectedIndex) { return _this.resultSet.items[selectedIndex]; });
            };
            BaseThumbnailView.prototype.updateActionButtons = function () {
                if (this.selectedIndexes.length > 0) {
                    $("button.item-action").removeAttr("disabled");
                    $("li.item-action").removeClass("disabled");
                }
                else {
                    $("button.item-action").attr("disabled", "disabled");
                    $("li.item-action").addClass("disabled");
                }
            };
            BaseThumbnailView.prototype.reload = function (pagingOffset) {
                if (pagingOffset === void 0) { pagingOffset = 0; }
                this.loadData(pagingOffset, this.pageSize);
            };
            BaseThumbnailView.prototype.loadData = function (skip, take) {
                var _this = this;
                this._showLoadingMessage();
                this.dataSource.getData({ skip: skip, take: take }, function (resultSet) {
                    _this.resultSet = resultSet;
                    _this.pagingControls.update(resultSet);
                    _this._renderClips(resultSet.items);
                    _this.selectedIndexes = [];
                    _this.updateActionButtons();
                });
            };
            BaseThumbnailView.prototype._item_onClick = function (evt, clickedRowIndex, doubleClick) {
                if (!(evt.ctrlKey || evt.metaKey) && !evt.shiftKey && this.selectedIndexes.length > 0) {
                    // deselect everything
                    this.selectedIndexes = [];
                    this._deselectAllRows();
                }
                if (evt.shiftKey && this.selectedIndexes.length > 0) {
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
                    for (var i = 0; i < numSelectedItems; i++) {
                        this.selectedIndexes.push(index);
                        this._selectRow(index);
                        index += step;
                    }
                }
                else {
                    // select clicked row
                    this.selectedIndexes.push(clickedRowIndex);
                    this._selectRow(clickedRowIndex);
                }
                this.updateActionButtons();
                if (this.selectionChangedHandler) {
                    this.selectionChangedHandler({
                        selectedIndexes: this.selectedIndexes,
                        selectedItems: this.getSelectedClips(),
                        doubleClick: doubleClick
                    });
                }
            };
            BaseThumbnailView.prototype._showLoadingMessage = function () {
                this.$scrollview.html("<h3 class='loadingMessage'>Loading...</h3>");
            };
            BaseThumbnailView.prototype._renderClips = function (clips) {
            };
            BaseThumbnailView.prototype._selectRow = function (rowIndex) {
            };
            BaseThumbnailView.prototype._deselectAllRows = function () {
            };
            return BaseThumbnailView;
        })(Control);
        var GridView = (function (_super) {
            __extends(GridView, _super);
            function GridView(element, thumbnailSize, pageSize, viewClipUrl, dataSource) {
                _super.call(this, element, "gridView", thumbnailSize, pageSize, viewClipUrl, dataSource);
            }
            GridView.prototype._renderClips = function (clips) {
                var _this = this;
                this.$scrollview.empty();
                clips.forEach(function (clip, i) {
                    var url = $catdv.getApiUrl("thumbnails/" + clip.posterID);
                    var $cell = $("<div id='" + _this.elementId + "_" + i + "' class='cell " + _this.thumbnailSize + "' style='display: inline-block'>").appendTo(_this.$scrollview);
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
                    if (_this.viewClipUrl) {
                        $("<a href='" + _this.viewClipUrl + "?id=" + clip.ID + " '>" + clip.name + "<br/>" + (clip.userFields && clip.userFields.U6 ? clip.userFields.U6 : "") + "</a>").css({
                            "display": "block",
                            "overflow": "hidden",
                            "white-space": "nowrap"
                        }).appendTo($cell);
                    }
                    else {
                        $("<span>" + clip.name + "</span>").css({
                            "display": "block",
                            "overflow": "hidden",
                            "white-space": "nowrap"
                        }).appendTo($cell);
                    }
                    $cell.on("click", function (evt) { return _super.prototype._item_onClick.call(_this, evt, i, false); });
                    $cell.on("dblclick", function (evt) { return _super.prototype._item_onClick.call(_this, evt, i, true); });
                });
            };
            GridView.prototype._selectRow = function (rowIndex) {
                this.$element.find("#" + this.elementId + "_" + rowIndex).addClass("selected");
            };
            GridView.prototype._deselectAllRows = function () {
                this.$element.find("div.cell").removeClass("selected");
            };
            return GridView;
        })(BaseThumbnailView);
        var FilmstripView = (function (_super) {
            __extends(FilmstripView, _super);
            function FilmstripView(element, thumbnailSize, pageSize, viewClipUrl, dataSource) {
                _super.call(this, element, "filmstripView", thumbnailSize, pageSize, viewClipUrl, dataSource);
            }
            FilmstripView.prototype._renderClips = function (clips) {
                var _this = this;
                this.$scrollview.empty();
                clips.forEach(function (clip, i) {
                    // horizontal strip with info  header at left and then thumbnails 
                    var $row = $("<div id='" + _this.elementId + "_" + i + "' class='filmstripRow " + _this.thumbnailSize + "'>").css({
                        "white-space": "nowrap"
                    }).appendTo(_this.$scrollview);
                    $row.on("click", function (evt) { return _super.prototype._item_onClick.call(_this, evt, i, false); });
                    $row.on("dblclick", function (evt) { return _super.prototype._item_onClick.call(_this, evt, i, true); });
                    var $header = $("<div class='header' style=''>").css({
                        "display": "inline-block",
                        "vertical-align": "bottom"
                    }).appendTo($row);
                    if (_this.viewClipUrl) {
                        $("<a href='" + _this.viewClipUrl + "?id=" + clip.ID + " '>" + clip.name + "</a>").css({
                            "display": "block",
                            "overflow": "hidden",
                            "white-space": "nowrap"
                        }).appendTo($header);
                    }
                    else {
                        $("<span>" + clip.name + "</span>").css({
                            "display": "block",
                            "overflow": "hidden",
                            "white-space": "nowrap"
                        }).appendTo($header);
                    }
                    if (clip.duration.secs > 0) {
                        var $filmstrip = $("<div class='filmstrip'>").css({
                            "display": "inline-block",
                            "vertical-align": "bottom",
                            "position": "relative",
                            "overflow": "hidden",
                            "white-space": "nowrap"
                        }).appendTo($row);
                        var $thumbnails = $("<div class='thumbnails'>").css({
                            "display": "inline-block"
                        }).appendTo($filmstrip);
                        var thumbnailIDs = clip.thumbnailIDs || (clip.posterID ? [clip.posterID] : []);
                        thumbnailIDs.forEach(function (thumbnailID) {
                            var url = $catdv.getApiUrl("thumbnails/" + thumbnailID);
                            var $img = $("<img src='" + url + "'>").appendTo($thumbnails);
                        });
                    }
                    else if (clip.posterID) {
                        // still
                        var url = $catdv.getApiUrl("thumbnails/" + clip.posterID);
                        var $img = $("<img src='" + url + "' class='still'>").appendTo($row);
                    }
                });
            };
            FilmstripView.prototype._selectRow = function (rowIndex) {
                this.$element.find("#" + this.elementId + "_" + rowIndex).addClass("selected");
            };
            FilmstripView.prototype._deselectAllRows = function () {
                this.$element.find("div.filmstripRow").removeClass("selected");
            };
            return FilmstripView;
        })(BaseThumbnailView);
        var TableView = (function (_super) {
            __extends(TableView, _super);
            function TableView(element, viewType, viewClipUrl, dataSource) {
                var _this = this;
                _super.call(this, element, {
                    multiselect: true,
                    dataSource: dataSource,
                    columns: null
                });
                this.css({ "position": "absolute", "top": "0px", "left": "0px", "width": "100%", "height": "100%" });
                ViewManager.getViewColumns(viewType, viewClipUrl, function (columns) {
                    _this.setColumns(columns);
                });
            }
            TableView.prototype.getSelectedClips = function () {
                return this.getSelectedItems();
            };
            return TableView;
        })(DataTable);
        var ClipListPanel = (function (_super) {
            __extends(ClipListPanel, _super);
            function ClipListPanel(element, viewClipUrl) {
                var _this = this;
                _super.call(this, element);
                this.currentViewType = null;
                this.currentViewOptions = null;
                this.currentQuery = null;
                this.currentCatalogID = null;
                this.currentSmartFolderID = null;
                this.listTitle = null;
                this.viewClipUrl = null;
                this.viewClipUrl = viewClipUrl;
                this.$element.html("<div class='clipListHeader'>" + "  <h1 id='listTitle'>Clips</h1>  " + "  <div class='viewControls pull-right'>" + "    <div id='btnListViews'></div><div id='btnGridViews'></div><div id='btnFilmstripViews'></div>" + "  </div>" + "</div>");
                this.$clipList = $("<div class='clipListContent'></div>").appendTo(this.$element);
                this.btnListViews = new OptionsButton("btnListViews", "catdvicon catdvicon-list_view", ["Concise", "Normal", "Full"], "Normal");
                this.btnGridViews = new OptionsButton("btnGridViews", "catdvicon catdvicon-thumb_view", ["Small", "Medium", "Large", "Huge"], "Medium");
                this.btnFilmstripViews = new OptionsButton("btnFilmstripViews", "catdvicon catdvicon-filmstrip_view", ["Small", "Medium", "Large", "Huge"], "Medium");
                this.lblListTitle = new Label("listTitle");
                this.btnListViews.onClick(function (evt, option) {
                    _this.setView(3 /* Table */, option.toLowerCase());
                });
                this.btnGridViews.onClick(function (evt, option) {
                    _this.setView(1 /* Grid */, option.toLowerCase());
                });
                this.btnFilmstripViews.onClick(function (evt, option) {
                    _this.setView(2 /* Filmstrip */, option.toLowerCase());
                });
                // load query/view info          
                var viewType = parseInt($.cookie("catdv_viewType") || "1"); /* grid */
                var viewOptions = $.cookie("catdv_viewOptions") || "medium";
                // View clip page sets catdv_useCache cookie so if the user comes back from there we
                // know to use the cache. 
                this.useCache = $.cookie("catdv_useCache") === "true";
                // But we want to clear it so if they hit refresh we won't use cache
                $.cookie("catdv_useCache", "false");
                try {
                    var searchType = $.cookie("catdv_searchType") || "query";
                    this.listTitle = $.cookie("catdv_searchTitle") || "Query Results";
                    switch (searchType) {
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
                catch (e) {
                    // stored data corrupted in some way - fall back to open query
                    this.currentCatalogID = null;
                    this.currentSmartFolderID = null;
                    this.currentQuery = null;
                }
                var pagingOffset = parseInt($.cookie("catdv_pagingOffset") || "0");
                this.setView(viewType, viewOptions, pagingOffset);
            }
            ClipListPanel.prototype.getSelectedClips = function () {
                return this.currentView.getSelectedClips();
            };
            ClipListPanel.prototype.onSelectionChanged = function (selectionChangedHandler) {
                this.selectionChangedHandler = selectionChangedHandler;
            };
            ClipListPanel.prototype.setView = function (viewType, viewOptions, pagingOffset) {
                var _this = this;
                if (pagingOffset === void 0) { pagingOffset = 0; }
                this.currentViewType = viewType;
                this.currentViewOptions = viewOptions;
                this.$clipList.empty();
                switch (this.currentViewType) {
                    case 1 /* Grid */:
                    default:
                        this.currentView = new GridView($("<div id='gridView'>").appendTo(this.$clipList), viewOptions, 120, this.viewClipUrl, this);
                        $("#btnGridViews button").addClass("btn-active");
                        $("#btnListViews button").removeClass("btn-active");
                        $("#btnFilmstripViews button").removeClass("btn-active");
                        this.btnGridViews.setOption(viewOptions);
                        break;
                    case 2 /* Filmstrip */:
                        this.currentView = new FilmstripView($("<div id='filmstripView'>").appendTo(this.$clipList), viewOptions, 30, this.viewClipUrl, this);
                        $("#btnFilmstripViews button").addClass("btn-active");
                        $("#btnGridViews button").removeClass("btn-active");
                        $("#btnListViews button").removeClass("btn-active");
                        this.btnFilmstripViews.setOption(viewOptions);
                        break;
                    case 3 /* Table */:
                        this.currentView = new TableView($("<div id='tableView'>").appendTo(this.$clipList), viewOptions, this.viewClipUrl, this);
                        $("#btnListViews button").addClass("btn-active");
                        $("#btnGridViews button").removeClass("btn-active");
                        $("#btnFilmstripViews button").removeClass("btn-active");
                        this.btnListViews.setOption(viewOptions);
                        break;
                }
                this.currentView.onSelectionChanged(function (evt) {
                    if (_this.selectionChangedHandler) {
                        _this.selectionChangedHandler(evt);
                    }
                });
                this.reload(pagingOffset);
            };
            ClipListPanel.prototype.getQuery = function () {
                return this.currentQuery;
            };
            ClipListPanel.prototype.setQuery = function (query, queryDescription) {
                this.currentQuery = query;
                this.currentCatalogID = null;
                this.currentSmartFolderID = null;
                this.listTitle = queryDescription || "Query Results";
                this.fireQueryChanged();
                this.useCache = false;
                this.reload();
            };
            ClipListPanel.prototype.getCatalogID = function () {
                return this.currentCatalogID;
            };
            ClipListPanel.prototype.setCatalogID = function (catalog) {
                this.currentCatalogID = catalog.ID;
                this.currentSmartFolderID = null;
                this.currentQuery = null;
                this.listTitle = "Catalog: " + catalog.name;
                this.fireQueryChanged();
                this.useCache = false;
                this.reload();
            };
            ClipListPanel.prototype.getSmartFolderID = function () {
                return this.currentSmartFolderID;
            };
            ClipListPanel.prototype.setSmartFolderID = function (smartFolder) {
                this.currentSmartFolderID = smartFolder.ID;
                this.currentCatalogID = null;
                this.currentQuery = null;
                this.listTitle = "Smart Folder: " + smartFolder.name;
                this.fireQueryChanged();
                this.useCache = false;
                this.reload();
            };
            ClipListPanel.prototype.onQueryChanged = function (queryChangedHandler) {
                this.queryChangedHandler = queryChangedHandler;
                // fire event as soon as handler is registered to update caller with filters read from cookies
                this.fireQueryChanged();
            };
            ClipListPanel.prototype.fireQueryChanged = function () {
                if (this.queryChangedHandler) {
                    this.queryChangedHandler();
                }
            };
            ClipListPanel.prototype.reload = function (pagingOffset) {
                if (pagingOffset === void 0) { pagingOffset = 0; }
                var colonIndex = this.listTitle.indexOf(":");
                if (colonIndex != -1) {
                    this.lblListTitle.$element.html(this.listTitle.substr(0, colonIndex) + "<span>" + HtmlUtil.escapeHtml(this.listTitle.substr(colonIndex + 1)) + "</span>");
                }
                else {
                    this.lblListTitle.setText(this.listTitle);
                }
                this.currentView.reload(pagingOffset);
            };
            /* Implement PagedDataSource.getData() */
            ClipListPanel.prototype.getData = function (params, callback) {
                var _this = this;
                // save search options to cookies
                $.cookie("catdv_viewType", String(this.currentViewType));
                $.cookie("catdv_viewOptions", this.currentViewOptions);
                $.cookie("catdv_searchTitle", this.listTitle);
                $.cookie("catdv_pagingOffset", String(params.skip));
                if (this.currentCatalogID) {
                    params["catalogID"] = this.currentCatalogID;
                    $.cookie("catdv_searchType", "catalog");
                    $.cookie("catdv_catalogID", String(this.currentCatalogID));
                }
                else if (this.currentSmartFolderID) {
                    params["smartFolderID"] = this.currentSmartFolderID;
                    $.cookie("catdv_searchType", "smartFolder");
                    $.cookie("catdv_smartFolderID", String(this.currentSmartFolderID));
                }
                else if (this.currentQuery) {
                    params["filter"] = QueryDefinitionUtil.toFilterString(this.currentQuery);
                    $.cookie("catdv_searchType", "query");
                    $.cookie("catdv_filterText", params.filter);
                }
                else {
                    params["filter"] = "";
                    $.cookie("catdv_searchType", "");
                }
                params["cached"] = this.useCache;
                // TODO: should check which view columns we have to see if we need user fields or metadata
                params["include"] = "userFields,metadata,thumbnails";
                
                if(!params.sortDir){ params.desc = "clip.modifiedDate"}
                else if(params.sortDir === "ASC") params.asc = params.sortBy;
                else if(params.sortDir === "DESC") params.desc = params.sortBy;

                $catdv.getClips(params, function (resultSet) {
                    _this.useCache = true;
                    callback(resultSet);
                }, function () {
                    callback({ totalItems: 0, offset: 0, items: [] });
                });
            };
            ClipListPanel.VIEW_GRID = 1;
            ClipListPanel.FILMSTRIP = 1;
            ClipListPanel.TABLE = 1;
            return ClipListPanel;
        })(Panel);
        panels.ClipListPanel = ClipListPanel;
    })(panels = ui.panels || (ui.panels = {}));
})(ui || (ui = {}));
