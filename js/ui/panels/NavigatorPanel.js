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
        var Element = controls.Element;
        var Panel = controls.Panel;
        var Label = controls.Label;
        var TreeView = controls.TreeView;
        var Button = controls.Button;
        var TextBox = controls.TextBox;
        var Modal = controls.Modal;
        var DropDownList = controls.DropDownList;
        var $catdv = catdv.RestApi;
        var FieldSettingsManager = logic.FieldSettingsManager;
        var ServerSettings = logic.ServerSettings;
        var PopoutPanel = (function (_super) {
            __extends(PopoutPanel, _super);
            function PopoutPanel(element) {
                _super.call(this, element);
            }
            PopoutPanel.prototype.open = function () {
                this.$element.addClass("open");
            };
            PopoutPanel.prototype.close = function () {
                this.$element.removeClass("open");
            };
            PopoutPanel.prototype.onClose = function (closeHandler) {
                this.closePanelBtn.onClick(function (evt) {
                    if (closeHandler)
                        closeHandler(evt);
                });
            };
            return PopoutPanel;
        })(Panel);
        var SearchPanel = (function (_super) {
            __extends(SearchPanel, _super);
            function SearchPanel(element, navigator) {
                var _this = this;
                _super.call(this, element);
                this.searchHandler = null;
                this.advancedSearchMode = false;
                this.navigator = navigator;
                this.$element.html("<div class='popout-container'>" + "<a href='#' id='closeSearchPanelBtn' class='close-button'><span class='catdvicon catdvicon-close_panel'> </span></a>" + "<h2>Search</h2>" + " <div class='input-group'>" + " <input type='text' id='txtSearch' class='form-control'>" + " <span class='input-group-btn'>" + "   <button id='btnSearch' class='btn btn-primary' type='button'><span class='catdvicon catdvicon-search'></span> </button>" + "  </span>" + "</div>" + "<a href='#' id='btnAdvancedSearch' class='btn btn-link'>Advanced Search <span class='glyphicon glyphicon-search'> </span> </a></li>" + "<div id='queryBuilder'></div>" + "<button id='btnRunAdvancedSearch' class='btn btn-primary run-query-action' type='button'>Search</button>" + "</div>");
                this.closePanelBtn = new Button("closeSearchPanelBtn");
                this.txtSearch = new TextBox("txtSearch");
                this.txtSearch.onChanged(function (evt) { return _this.simpleSearch(); });
                this.btnSearch = new Button("btnSearch");
                this.btnSearch.onClick(function (evt) { return _this.simpleSearch(); });
                this.btnAdvancedSearch = new Button("btnAdvancedSearch");
                this.btnAdvancedSearch.onClick(function (evt) {
                    if (!_this.advancedSearchMode) {
                        _this.$element.addClass("wide");
                        _this.queryBuilder.show();
                        _this.btnRunAdvancedSearch.show();
                        _this.advancedSearchMode = true;
                    }
                    else {
                        _this.$element.removeClass("wide");
                        _this.queryBuilder.hide();
                        _this.btnRunAdvancedSearch.hide();
                        _this.advancedSearchMode = false;
                    }
                });
                this.queryBuilder = new panels.QueryBuilder("queryBuilder");
                this.queryBuilder.hide();
                this.btnRunAdvancedSearch = new Button("btnRunAdvancedSearch");
                this.btnRunAdvancedSearch.onClick(function (evt) {
                    _this.navigator.closePopouts();
                    if (_this.searchHandler) {
                        _this.searchHandler(_this.queryBuilder.getQuery(), null);
                    }
                });
                this.btnRunAdvancedSearch.hide();
            }
            SearchPanel.create = function (parent) {
                return new SearchPanel($("<div id='searchPanel' class='popout-panel'></div>").appendTo(Element.get$(parent)), parent);
            };
            SearchPanel.prototype.onSearch = function (searchHandler) {
                this.searchHandler = searchHandler;
            };
            SearchPanel.prototype.simpleSearch = function () {
                if (this.searchHandler) {
                    var searchText = this.txtSearch.getText().trim();
                    if (searchText) {
                        this.searchHandler({ terms: [{ field: "logtext", op: "like", params: searchText }] }, "Clips matching '" + searchText + "'");
                    }
                    else {
                        this.searchHandler({ terms: [] }, "Clips");
                    }
                    this.navigator.closePopouts();
                }
            };
            return SearchPanel;
        })(PopoutPanel);
        var CatalogsPanel = (function (_super) {
            __extends(CatalogsPanel, _super);
            function CatalogsPanel(element, navigator) {
                var _this = this;
                _super.call(this, element);
                this.catalogSelectedHandler = null;
                this.model = null;
                this.navigator = navigator;
                this.$element.html("<div class='popout-container'>" + "<a href='#' id='closeCatalogsPanelBtn' class='close-button'><span class='catdvicon catdvicon-close_panel'> </span></a>" + "<h2>Catalogs</h2><div id='catalogTree'></div>" + "</div>");
                this.closePanelBtn = new Button("closeCatalogsPanelBtn");
                this.catalogTree = new TreeView("catalogTree");
                this.catalogTree.onSelectionChanged(function (evt) {
                    var selectedNode = _this.catalogTree.getSelectedItem();
                    if (selectedNode && selectedNode.value && _this.catalogSelectedHandler) {
                        _this.navigator.closePopouts();
                        _this.catalogSelectedHandler(selectedNode.value);
                    }
                });
            }
            CatalogsPanel.create = function (parent) {
                return new CatalogsPanel($("<div id='catalogsPanel' class='popout-panel'></div>").appendTo(Element.get$(parent)), parent);
            };
            CatalogsPanel.prototype.onCatalogSelected = function (catalogSelectedHandler) {
                this.catalogSelectedHandler = catalogSelectedHandler;
            };
            // Override PopoutPanel.open()
            CatalogsPanel.prototype.open = function () {
                _super.prototype.open.call(this);
                if (this.model == null) {
                    this.catalogTree.setModel([{ name: "Loading..." }]);
                    this.loadData();
                }
            };
            CatalogsPanel.prototype.loadData = function () {
                var _this = this;
                $catdv.getCatalogs(function (catalogs) {
                    _this.model = _this.buildCatalogTree(catalogs);
                    _this.catalogTree.setModel(_this.model);
                });
            };
            CatalogsPanel.prototype.buildCatalogTree = function (catalogs) {
                var rootNodes = [];
                var treeNodesByPath = {};
                catalogs.filter(function (catalog) { return catalog.ID != null; }).forEach(function (catalog) {
                    // If catalog.getName() is something like "Folder/Subfolder/Catalog.cdv"
                    // then catalogPath would be "Group/Folder/Subfolder" and name "Catalog.cdv"
                    var groupName = catalog.groupName || (ServerSettings.isEnterpriseServer ? "Public (Anonymous)" : "Server Catalogs");
                    var catalogPath = groupName ? groupName + "/" + catalog.name : catalog.name;
                    // Used to accumulate path from root down to the leaves
                    var path = "";
                    // branch we are currently adding nodes to - initially root then the child collection of each node down the path
                    var currentBranch = rootNodes;
                    var pathElements = catalogPath.split("/");
                    pathElements.forEach(function (pathElement, i) {
                        // accumulate path
                        path = path.length > 0 ? path + "/" + pathElement : pathElement;
                        var treeNode = treeNodesByPath[path];
                        if (treeNode == null) {
                            var rootNode = (i == 0);
                            var leafNode = (i == pathElements.length - 1);
                            treeNode = {
                                name: pathElement,
                                isExpanded: rootNode,
                                isSectionHeader: rootNode,
                                isSelectable: leafNode,
                                value: leafNode ? catalog : null,
                                children: []
                            };
                            currentBranch.push(treeNode);
                            treeNodesByPath[path] = treeNode;
                        }
                        currentBranch = treeNode.children;
                    });
                });
                return rootNodes;
            };
            return CatalogsPanel;
        })(PopoutPanel);
        var MediaPathsPanel = (function (_super) {
            __extends(MediaPathsPanel, _super);
            function MediaPathsPanel(element, navigator) {
                var _this = this;
                _super.call(this, element);
                this.mediaPathQueryHandler = null;
                this.model = null;
                this.navigator = navigator;
                this.$element.html("<div class='popout-container'>" + "<a href='#' id='closeMediaPathPanelBtn' class='close-button'><span class='catdvicon catdvicon-close_panel'> </span></a>" + "<h2>Media Paths</h2>" + "<div id='mediaPathTree'></div>" + "</div>");
                this.closePanelBtn = new Button("closeMediaPathPanelBtn");
                this.mediaPathTree = new TreeView("mediaPathTree");
                this.mediaPathTree.onSelectionChanged(function (evt) {
                    var selectedNode = _this.mediaPathTree.getSelectedItem();
                    if (selectedNode && selectedNode.value && _this.mediaPathQueryHandler) {
                        _this.navigator.closePopouts();
                        _this.mediaPathQueryHandler({ terms: [{ field: "media.fileDir", op: "startsWith", params: selectedNode.value }] }, "Path:" + selectedNode.value);
                    }
                });
            }
            MediaPathsPanel.create = function (parent) {
                return new MediaPathsPanel($("<div id='mediaPathsPanel' class='popout-panel'></div>").appendTo(Element.get$(parent)), parent);
            };
            MediaPathsPanel.prototype.onMediaPathQuery = function (mediaPathQueryHandler) {
                this.mediaPathQueryHandler = mediaPathQueryHandler;
            };
            // Override PopoutPanel.open()
            MediaPathsPanel.prototype.open = function () {
                _super.prototype.open.call(this);
                if (this.model == null) {
                    this.mediaPathTree.setModel([{ name: "Loading..." }]);
                    this.loadData();
                }
            };
            MediaPathsPanel.prototype.loadData = function () {
                var _this = this;
                FieldSettingsManager.getUniqueFieldValues({ ID: "FLD" }, function (paths) {
                    _this.model = _this.buildMediaPathTree(paths);
                    _this.mediaPathTree.setModel(_this.model);
                });
            };
            MediaPathsPanel.prototype.buildMediaPathTree = function (mediaPaths) {
                var rootNodes = [];
                var treeNodesByPath = {};
                mediaPaths.filter(function (mediaPath) { return mediaPath != null; }).forEach(function (mediaPath) {
                    var pathElements = mediaPath.contains("/") ? mediaPath.split("/") : mediaPath.split("\\");
                    // accumulate path from root down to the leaves
                    var path = "";
                    // position in the mediaPath or the end of the current element so we can extract
                    // the 'real' path for each node in the tree including any prefixes and with the original separators
                    // that are not present in the accumulated path.
                    var p = 0;
                    // branch we are currently adding nodes to - initially root then the child collection of each node down the path
                    var currentBranch = rootNodes;
                    pathElements.forEach(function (pathElement, i) {
                        // ignore blank path elements (UNC paths have a blank first element)
                        if (pathElement) {
                            // accumulate path
                            path = path.length > 0 ? path + "/" + pathElement : pathElement;
                            // update position of pathElement in mediaPath
                            p = mediaPath.indexOf(pathElement, p) + pathElement.length;
                            var treeNode = treeNodesByPath[path];
                            if (treeNode == null) {
                                var rootNode = (i == 0);
                                treeNode = {
                                    name: pathElement,
                                    isExpanded: rootNode,
                                    isSectionHeader: false,
                                    isSelectable: true,
                                    value: mediaPath.substr(0, p),
                                    children: []
                                };
                                currentBranch.push(treeNode);
                                treeNodesByPath[path] = treeNode;
                            }
                            currentBranch = treeNode.children;
                        }
                    });
                });
                return rootNodes;
            };
            return MediaPathsPanel;
        })(PopoutPanel);
        var SmartFoldersPanel = (function (_super) {
            __extends(SmartFoldersPanel, _super);
            function SmartFoldersPanel(element, navigator) {
                var _this = this;
                _super.call(this, element);
                this.smartFolderSelectedHandler = null;
                this.model = null;
                this.navigator = navigator;
                this.$element.html("<div class='popout-container'>" + "<a href='#' id='closeSmartFolderPanelBtn' class='close-button'><span class='catdvicon catdvicon-close_panel'> </span></a>" + "<a id='btnAddSmartFolder'>Add Smart Folder</a>" + "<h2>Smart Folders</h2>" + "<div id='smartfolderTree'></div>" + "</div>");
                this.closePanelBtn = new Button("closeSmartFolderPanelBtn");
                this.smartfolderTree = new TreeView("smartfolderTree");
                this.smartfolderTree.onSelectionChanged(function (evt) {
                    var selectedNode = _this.smartfolderTree.getSelectedItem();
                    if (selectedNode && selectedNode.value && _this.smartFolderSelectedHandler) {
                        _this.navigator.closePopouts();
                        _this.smartFolderSelectedHandler(selectedNode.value);
                    }
                });
                this.smartfolderTree.onNodeEdit(function (evt) {
                    _this.navigator.closePopouts();
                    var smartfolder = (evt.node.value);
                    _this.smartFolderDialog.setSmartFolder(smartfolder);
                    _this.smartFolderDialog.show();
                });
                this.smartfolderTree.onNodeDelete(function (evt) {
                    _this.navigator.closePopouts();
                    var smartfolder = (evt.node.value);
                    if (confirm("Are you sure you want to delete '" + smartfolder.name + "'?")) {
                        $catdv.deleteSmartFolder(smartfolder.ID, function () { return _this.loadData(); });
                    }
                });
                this.btnAddSmartFolder = new Button("btnAddSmartFolder");
                this.btnAddSmartFolder.onClick(function (evt) {
                    _this.navigator.closePopouts();
                    var smartfolder = { name: "Untitled", groupID: 0, query: { terms: [] } };
                    _this.smartFolderDialog.setSmartFolder(smartfolder);
                    _this.smartFolderDialog.show();
                });
                this.smartFolderDialog = new SmartFolderDialog("smartFolderDialog");
                this.smartFolderDialog.onOK(function (smartfolder) {
                    $catdv.saveSmartFolder(smartfolder, function () { return _this.loadData(); });
                });
            }
            SmartFoldersPanel.create = function (parent) {
                return new SmartFoldersPanel($("<div id='smartFoldersPanel' class='popout-panel'></div>").appendTo(Element.get$(parent)), parent);
            };
            SmartFoldersPanel.prototype.onSmartFolderSelected = function (smartFolderSelectedHandler) {
                this.smartFolderSelectedHandler = smartFolderSelectedHandler;
            };
            // Override PopoutPanel.open()
            SmartFoldersPanel.prototype.open = function () {
                _super.prototype.open.call(this);
                if (this.model == null) {
                    this.smartfolderTree.setModel([{ name: "Loading..." }]);
                    this.loadData();
                }
            };
            SmartFoldersPanel.prototype.loadData = function () {
                var _this = this;
                $catdv.getSmartFolders(function (smartFolders) {
                    _this.model = _this.buildFolderTree(smartFolders);
                    _this.smartfolderTree.setModel(_this.model);
                });
            };
            SmartFoldersPanel.prototype.buildFolderTree = function (folders) {
                var rootNodes = [];
                var treeNodesByPath = {};
                folders.forEach(function (smartFolder) {
                    // If catalog.getName() is something like "Folder/Subfolder/Catalog.cdv"
                    // then catalogPath would be "Group/Folder/Subfolder" and name "Catalog.cdv"
                    var smartFolderPath = (smartFolder.groupName ? smartFolder.groupName : "Public (Anonymous)") + "/" + smartFolder.name;
                    // Used to accumulate path from root down to the leaves
                    var path = "";
                    // branch we are currently adding nodes to - initially root then the child collection of each node down the path
                    var currentBranch = rootNodes;
                    var pathElements = smartFolderPath.split("/");
                    pathElements.forEach(function (pathElement, i) {
                        // accumulate path
                        path = path.length > 0 ? path + "/" + pathElement : pathElement;
                        var treeNode = treeNodesByPath[path];
                        if (treeNode == null) {
                            var rootNode = (i == 0);
                            var leafNode = (i == pathElements.length - 1);
                            treeNode = {
                                name: pathElement,
                                isExpanded: rootNode,
                                isSectionHeader: rootNode,
                                isSelectable: leafNode,
                                hasEditControls: leafNode,
                                value: leafNode ? smartFolder : null,
                                children: []
                            };
                            currentBranch.push(treeNode);
                            treeNodesByPath[path] = treeNode;
                        }
                        currentBranch = treeNode.children;
                    });
                });
                return rootNodes;
            };
            return SmartFoldersPanel;
        })(PopoutPanel);
        var NavigatorPanel = (function (_super) {
            __extends(NavigatorPanel, _super);
            function NavigatorPanel(element, clipList) {
                var _this = this;
                _super.call(this, element);
                this.openPanel = null;
                this.clipList = clipList;
                this.$element.addClass("navigator");
                var $ul = $("<ul class='nav nav-sidebar'>").appendTo(this.$element);
                var $searchMenu = $("<li><a class='menu-item'><span class='catdvicon catdvicon-search'></span> Search<span class='catdvicon catdvicon-chevron pull-right'></span></a></li>").appendTo($ul);
                var $catalogsMenu = $("<li><a class='menu-item'><span class='catdvicon catdvicon-catalogs'></span> Catalogs<span class='catdvicon catdvicon-chevron pull-right'></span></a></li>").appendTo($ul);
                var $mediaPathsMenu = $("<li><a class='menu-item'><span class='catdvicon catdvicon-media_paths'></span> Media Path<span class='catdvicon catdvicon-chevron pull-right'></span></a></li>").appendTo($ul);
                this.searchPanel = SearchPanel.create(this);
                this.searchPanel.onSearch(function (query, queryDescription) {
                    _this.clipList.setQuery(query, queryDescription);
                });
                this.searchPanel.onClose(function (evt) {
                    _this.togglePanel($searchMenu, _this.searchPanel);
                });
                $searchMenu.on("click", function (evt) { return _this.togglePanel($searchMenu, _this.searchPanel); });
                this.catalogsPanel = CatalogsPanel.create(this);
                this.catalogsPanel.onCatalogSelected(function (catalog) {
                    _this.clipList.setCatalogID(catalog);
                });
                this.catalogsPanel.onClose(function (evt) {
                    _this.togglePanel($catalogsMenu, _this.catalogsPanel);
                });
                $catalogsMenu.on("click", function (evt) { return _this.togglePanel($catalogsMenu, _this.catalogsPanel); });
                this.mediaPathsPanel = MediaPathsPanel.create(this);
                this.mediaPathsPanel.onMediaPathQuery(function (query, queryDescription) {
                    _this.clipList.setQuery(query, queryDescription);
                });
                this.mediaPathsPanel.onClose(function (evt) {
                    _this.togglePanel($mediaPathsMenu, _this.mediaPathsPanel);
                });
                $mediaPathsMenu.on("click", function (evt) { return _this.togglePanel($mediaPathsMenu, _this.mediaPathsPanel); });
                this.allPopoutPanels = [this.searchPanel, this.catalogsPanel, this.mediaPathsPanel];
                if (ServerSettings.isEnterpriseServer) {
                    var $smartFoldersMenu = $("<li><a class='menu-item'><span class='catdvicon catdvicon-saved_queries'></span> Smart Folders<span class='catdvicon catdvicon-chevron pull-right'></span></a></li>").appendTo($ul);
                    this.smartFoldersPanel = SmartFoldersPanel.create(this);
                    this.smartFoldersPanel.onSmartFolderSelected(function (smartFolder) {
                        _this.clipList.setSmartFolderID(smartFolder);
                    });
                    this.smartFoldersPanel.onClose(function (evt) {
                        _this.togglePanel($smartFoldersMenu, _this.smartFoldersPanel);
                    });
                    $smartFoldersMenu.on("click", function (evt) { return _this.togglePanel($smartFoldersMenu, _this.smartFoldersPanel); });
                    this.allPopoutPanels.push(this.smartFoldersPanel);
                }
            }
            NavigatorPanel.prototype.closePopouts = function () {
                this.allPopoutPanels.forEach(function (popoutPanel) { return popoutPanel.close(); });
                this.$element.find("li").removeClass("active");
                this.openPanel = null;
            };
            NavigatorPanel.prototype.togglePanel = function ($menu, panel) {
                if (panel === this.openPanel) {
                    this.closePopouts();
                }
                else {
                    this.closePopouts();
                    $menu.addClass("active");
                    panel.open();
                    this.openPanel = panel;
                }
            };
            return NavigatorPanel;
        })(Panel);
        panels.NavigatorPanel = NavigatorPanel;
        var SmartFolderDialog = (function (_super) {
            __extends(SmartFolderDialog, _super);
            function SmartFolderDialog(element) {
                var _this = this;
                _super.call(this, element);
                this.lblSmartFolderName = new Label("lblSmartFolderName");
                this.txtSmartFolderName = new TextBox("txtSmartFolderName");
                this.listGroups = new DropDownList("listGroups");
                this.queryBuilder = new panels.QueryBuilder("smartFolderQueryBuilder");
                this.btnSmartFolderDialogOK = new Button("btnSmartFolderDialogOK");
                this.txtSmartFolderName.onInput(function (evt) { return _this.lblSmartFolderName.setText("Smart Folder: " + _this.txtSmartFolderName.getText()); });
                this.btnSmartFolderDialogOK.onClick(function (evt) {
                    _this.smartFolder.name = _this.txtSmartFolderName.getText();
                    _this.smartFolder.groupID = Number(_this.listGroups.getSelectedValue());
                    _this.smartFolder.query = _this.queryBuilder.getQuery();
                    _this.close(true, _this.smartFolder);
                });
            }
            SmartFolderDialog.prototype.setSmartFolder = function (smartFolder) {
                this.smartFolder = smartFolder;
                this.lblSmartFolderName.setText("Smart Folder: " + smartFolder.name);
                this.txtSmartFolderName.setText(smartFolder.name);
                this.listGroups.setSelectedValue(String(smartFolder.groupID));
                this.queryBuilder.setQuery(smartFolder.query);
            };
            // Override - (to avoid auto-focus logic)
            SmartFolderDialog.prototype.show = function () {
                this.$element.modal("show");
            };
            return SmartFolderDialog;
        })(Modal);
    })(panels = ui.panels || (ui.panels = {}));
})(ui || (ui = {}));
