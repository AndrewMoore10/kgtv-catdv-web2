module ui.panels
{
    import Element = controls.Element;
    import Panel = controls.Panel;
    import Label = controls.Label;
    import TreeView = controls.TreeView;
    import TreeNode = controls.TreeNode;
    import Button = controls.Button;
    import TextBox = controls.TextBox;
    import Modal = controls.Modal;
    import DropDownList = controls.DropDownList;
    
    import $catdv = catdv.RestApi;
    import Catalog = catdv.Catalog;
    import SmartFolder = catdv.SmartFolder;
    import QueryDefinition = catdv.QueryDefinition;
    import QueryTerm = catdv.QueryTerm;
    
    import FieldSettingsManager = logic.FieldSettingsManager;
    import ServerSettings = logic.ServerSettings;

    class PopoutPanel extends Panel
    {
        // initialised in derived classed
        public closePanelBtn: Button;

        constructor(element: any)
        {
            super(element);
        }

        open()
        {
            this.$element.addClass("open");
        }

        close()
        {
            this.$element.removeClass("open");
        }

        public onClose(closeHandler: (evt) => void)
        {
            this.closePanelBtn.onClick((evt) =>
            {
                if (closeHandler) closeHandler(evt);
            });
        }
    }

    class SearchPanel extends PopoutPanel
    {
        private txtSearch: TextBox;
        private btnSearch: Button;
        private btnAdvancedSearch: Button;
        private queryBuilder: QueryBuilder;
        private btnRunAdvancedSearch: Button;

        private searchHandler: (query: QueryDefinition, queryDescription: string) => void = null;

        private navigator: NavigatorPanel;
        private advancedSearchMode = false;

        constructor(element: any, navigator: NavigatorPanel)
        {
            super(element);
            this.navigator = navigator;

            this.$element.html(
                "<div class='popout-container'>" +
                "<a href='#' id='closeSearchPanelBtn' class='close-button'><span class='catdvicon catdvicon-close_panel'> </span></a>" +
                "<h2>Search</h2>" +
                " <div class='input-group'>" +
                " <input type='text' id='txtSearch' class='form-control'>" +
                " <span class='input-group-btn'>" +
                "   <button id='btnSearch' class='btn btn-primary' type='button'><span class='catdvicon catdvicon-search'></span> </button>" +
                "  </span>" +
                "</div>" +
                "<a href='#' id='btnAdvancedSearch' class='btn btn-link'>Advanced Search <span class='glyphicon glyphicon-search'> </span> </a></li>" +
                "<div id='queryBuilder'></div>" +
                "<button id='btnRunAdvancedSearch' class='btn btn-primary run-query-action' type='button'>Search</button>" +
                "</div>");

            this.closePanelBtn = new Button("closeSearchPanelBtn");

            this.txtSearch = new TextBox("txtSearch");
            this.txtSearch.onChanged((evt) => this.simpleSearch());
  
            this.btnSearch = new Button("btnSearch");
            this.btnSearch.onClick((evt)  => this.simpleSearch());
  
            this.btnAdvancedSearch = new Button("btnAdvancedSearch");
            this.btnAdvancedSearch.onClick((evt) =>
            {
                if (!this.advancedSearchMode)
                {
                    this.$element.addClass("wide");
                    this.queryBuilder.show();
                    this.btnRunAdvancedSearch.show();
                    this.advancedSearchMode = true;
                }
                else
                {
                    this.$element.removeClass("wide");
                    this.queryBuilder.hide();
                    this.btnRunAdvancedSearch.hide();
                    this.advancedSearchMode = false;
                }
            });

            this.queryBuilder = new QueryBuilder("queryBuilder");
            this.queryBuilder.hide();

            this.btnRunAdvancedSearch = new Button("btnRunAdvancedSearch");
            this.btnRunAdvancedSearch.onClick((evt) =>
            {
                this.navigator.closePopouts();
                if (this.searchHandler)
                {
                    this.searchHandler(this.queryBuilder.getQuery(), null);
                }
            });
            this.btnRunAdvancedSearch.hide();

        }

        public static create(parent): SearchPanel
        {
            return new SearchPanel($("<div id='searchPanel' class='popout-panel'></div>").appendTo(Element.get$(parent)), parent);
        }

        public onSearch(searchHandler: (query: QueryDefinition, queryDescription: string) => void)
        {
            this.searchHandler = searchHandler;
        }
        
        private simpleSearch()
        {
            if (this.searchHandler)
            {
                var searchText = this.txtSearch.getText().trim();
                if (searchText)
                {
                    this.searchHandler({ terms: [{ field: "logtext", op: "like", params: searchText }] }, "Clips matching '" + searchText + "'");
                }
                else
                {
                     this.searchHandler({ terms: [] }, "Clips");
                }
                this.navigator.closePopouts();
           }
        }
    }

    class CatalogsPanel extends PopoutPanel
    {
        private catalogTree: TreeView;
        private catalogSelectedHandler: (catalog: Catalog) => void = null;

        private navigator: NavigatorPanel;
       
        private model: TreeNode[] = null;

        constructor(element: any, navigator: NavigatorPanel)
        {
            super(element);
            this.navigator = navigator;

            this.$element.html(
                "<div class='popout-container'>" +
                "<a href='#' id='closeCatalogsPanelBtn' class='close-button'><span class='catdvicon catdvicon-close_panel'> </span></a>" +
                "<h2>Catalogs</h2><div id='catalogTree'></div>" +
                "</div>");

            this.closePanelBtn = new Button("closeCatalogsPanelBtn");

            this.catalogTree = new TreeView("catalogTree");

            this.catalogTree.onSelectionChanged((evt) =>
            {
                var selectedNode = this.catalogTree.getSelectedItem();
                if (selectedNode && selectedNode.value && this.catalogSelectedHandler)
                {
                    this.navigator.closePopouts();
                    this.catalogSelectedHandler(selectedNode.value);
                }
            });
        }

        public static create(parent): CatalogsPanel
        {
            return new CatalogsPanel($("<div id='catalogsPanel' class='popout-panel'></div>").appendTo(Element.get$(parent)), parent);
        }

        public onCatalogSelected(catalogSelectedHandler: (catalog: Catalog) => void)
        {
            this.catalogSelectedHandler = catalogSelectedHandler;
        }

        // Override PopoutPanel.open()
        public open()
        {
            super.open();
            if (this.model == null)
            {
                this.catalogTree.setModel([{ name: "Loading..." }]);
                this.loadData();
            }
        }

        private loadData()
        {
            $catdv.getCatalogs((catalogs) =>
            {
                this.model = this.buildCatalogTree(catalogs);
                this.catalogTree.setModel(this.model);
            });
        }

        private buildCatalogTree(catalogs: Catalog[]): TreeNode[]
        {
            var rootNodes: TreeNode[] = [];
            var treeNodesByPath: { [path: string]: TreeNode } = {};

            catalogs
                .filter((catalog) => catalog.ID != null)
                .forEach((catalog) => 
                {
                    // If catalog.getName() is something like "Folder/Subfolder/Catalog.cdv"
                    // then catalogPath would be "Group/Folder/Subfolder" and name "Catalog.cdv"
                    var groupName = catalog.groupName || (ServerSettings.isEnterpriseServer ? "Public (Anonymous)" : "Server Catalogs");                 
                    var catalogPath = groupName ? groupName + "/" + catalog.name : catalog.name;
 
                    // Used to accumulate path from root down to the leaves
                    var path = "";
                    // branch we are currently adding nodes to - initially root then the child collection of each node down the path
                    var currentBranch: TreeNode[] = rootNodes;

                    var pathElements = catalogPath.split("/");
                    pathElements.forEach((pathElement, i) =>
                    {
                        // accumulate path
                        path = path.length > 0 ? path + "/" + pathElement : pathElement;
                        var treeNode = treeNodesByPath[path];
                        if (treeNode == null)
                        {
                            var rootNode = (i == 0);
                            var leafNode = (i == pathElements.length - 1)
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
        }
    }

    class MediaPathsPanel extends PopoutPanel
    {
        private mediaPathTree: TreeView;
        private mediaPathQueryHandler: (query: QueryDefinition, queryDescription: string) => void = null;

        private navigator: NavigatorPanel;
       
        private model: TreeNode[] = null;

        constructor(element: any, navigator: NavigatorPanel)
        {
            super(element);
            this.navigator = navigator;

            this.$element.html(
                "<div class='popout-container'>" +
                "<a href='#' id='closeMediaPathPanelBtn' class='close-button'><span class='catdvicon catdvicon-close_panel'> </span></a>" +
                "<h2>Media Paths</h2>" +
                "<div id='mediaPathTree'></div>" +
                "</div>");

            this.closePanelBtn = new Button("closeMediaPathPanelBtn");

            this.mediaPathTree = new TreeView("mediaPathTree");
            this.mediaPathTree.onSelectionChanged((evt) =>
            {
                var selectedNode = this.mediaPathTree.getSelectedItem();
                if (selectedNode && selectedNode.value && this.mediaPathQueryHandler)
                {
                    this.navigator.closePopouts();
                    this.mediaPathQueryHandler({ terms: [{ field: "media.fileDir", op: "startsWith", params: selectedNode.value }] }, "Path:" + selectedNode.value);
                }
            });
        }

        public static create(parent): MediaPathsPanel
        {
            return new MediaPathsPanel($("<div id='mediaPathsPanel' class='popout-panel'></div>").appendTo(Element.get$(parent)), parent);
        }

        public onMediaPathQuery(mediaPathQueryHandler: (query: QueryDefinition, queryDescription: string) => void)
        {
            this.mediaPathQueryHandler = mediaPathQueryHandler;
        }

        // Override PopoutPanel.open()
        public open()
        {
            super.open();
            if (this.model == null)
            {
                this.mediaPathTree.setModel([{ name: "Loading..." }]);
                this.loadData();
            }
        }

        private loadData()
        {
            FieldSettingsManager.getUniqueFieldValues({ID: "FLD"}, (paths: string[]) =>
            {
                this.model = this.buildMediaPathTree(paths);
                this.mediaPathTree.setModel(this.model);
            });
        }

        private buildMediaPathTree(mediaPaths: string[]): TreeNode[]
        {
            var rootNodes: TreeNode[] = [];
            var treeNodesByPath: { [path: string]: TreeNode } = {};

            mediaPaths
                .filter((mediaPath) => mediaPath != null)
                .forEach((mediaPath) =>
                {
                    var pathElements = mediaPath.contains("/") ? mediaPath.split("/") : mediaPath.split("\\");

                    // accumulate path from root down to the leaves
                    var path = "";
                    // position in the mediaPath or the end of the current element so we can extract
                    // the 'real' path for each node in the tree including any prefixes and with the original separators
                    // that are not present in the accumulated path.
                    var p = 0;
                    // branch we are currently adding nodes to - initially root then the child collection of each node down the path
                    var currentBranch: TreeNode[] = rootNodes;
                    pathElements.forEach((pathElement, i) =>
                    {
                        // ignore blank path elements (UNC paths have a blank first element)
                        if (pathElement)
                        {
                            // accumulate path
                            path = path.length > 0 ? path + "/" + pathElement : pathElement;
                            // update position of pathElement in mediaPath
                            p = mediaPath.indexOf(pathElement, p) + pathElement.length;
                            var treeNode = treeNodesByPath[path];
                            if (treeNode == null)
                            {
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
        }
    }

    class SmartFoldersPanel extends PopoutPanel
    {
        private smartfolderTree: TreeView;
        private smartFolderSelectedHandler: (evt: SmartFolder) => void = null;
        private btnAddSmartFolder : Button;

        private navigator: NavigatorPanel;
        private smartFolderDialog: SmartFolderDialog;
        
        private model: TreeNode[] = null;

        constructor(element: any, navigator: NavigatorPanel)
        {
            super(element);
            this.navigator = navigator;

            this.$element.html(
                "<div class='popout-container'>" +
                "<a href='#' id='closeSmartFolderPanelBtn' class='close-button'><span class='catdvicon catdvicon-close_panel'> </span></a>" +
                "<a id='btnAddSmartFolder'>Add Smart Folder</a>" +
                "<h2>Smart Folders</h2>" +
                "<div id='smartfolderTree'></div>" +
                "</div>");

            this.closePanelBtn = new Button("closeSmartFolderPanelBtn");

            this.smartfolderTree = new TreeView("smartfolderTree");

            this.smartfolderTree.onSelectionChanged((evt) =>
            {
                var selectedNode = this.smartfolderTree.getSelectedItem();
                if (selectedNode && selectedNode.value && this.smartFolderSelectedHandler)
                {
                    this.navigator.closePopouts();
                    this.smartFolderSelectedHandler(selectedNode.value);
                }
            });

            this.smartfolderTree.onNodeEdit((evt) =>
            {
                this.navigator.closePopouts();
                var smartfolder = <SmartFolder>(evt.node.value);
                this.smartFolderDialog.setSmartFolder(smartfolder);
                this.smartFolderDialog.show();
            });

            this.smartfolderTree.onNodeDelete((evt) =>
            {
                this.navigator.closePopouts();
                var smartfolder = <SmartFolder>(evt.node.value);
                if (confirm("Are you sure you want to delete '" + smartfolder.name + "'?"))
                {
                    $catdv.deleteSmartFolder(smartfolder.ID, () => this.loadData());
                }
            });

            this.btnAddSmartFolder = new Button("btnAddSmartFolder");
            this.btnAddSmartFolder.onClick((evt) =>
            {
                this.navigator.closePopouts();
                var smartfolder = { name: "Untitled", groupID: 0, query: { terms: [] } };
                this.smartFolderDialog.setSmartFolder(smartfolder);
                this.smartFolderDialog.show();
            });
            
            this.smartFolderDialog = new SmartFolderDialog("smartFolderDialog");
            this.smartFolderDialog.onOK((smartfolder: SmartFolder) =>
            {
                $catdv.saveSmartFolder(smartfolder, () => this.loadData());
            });
        }

        public static create(parent): SmartFoldersPanel
        {
            return new SmartFoldersPanel($("<div id='smartFoldersPanel' class='popout-panel'></div>").appendTo(Element.get$(parent)), parent);
        }

        public onSmartFolderSelected(smartFolderSelectedHandler: (evt: SmartFolder) => void)
        {
            this.smartFolderSelectedHandler = smartFolderSelectedHandler;
        }

        // Override PopoutPanel.open()
        public open()
        {
            super.open();
            if (this.model == null)
            {
                this.smartfolderTree.setModel([{ name: "Loading..." }]);
                this.loadData();
            }
        }

        private loadData()
        {
            $catdv.getSmartFolders((smartFolders) =>
            {
                this.model = this.buildFolderTree(smartFolders);
                this.smartfolderTree.setModel(this.model);
            });
        }

        private buildFolderTree(folders: SmartFolder[]): TreeNode[]
        {
            var rootNodes: TreeNode[] = [];
            var treeNodesByPath: { [path: string]: TreeNode } = {};

            folders.forEach((smartFolder) => 
            {
                // If catalog.getName() is something like "Folder/Subfolder/Catalog.cdv"
                // then catalogPath would be "Group/Folder/Subfolder" and name "Catalog.cdv"
                var smartFolderPath = (smartFolder.groupName ? smartFolder.groupName : "Public (Anonymous)") + "/" + smartFolder.name;

                // Used to accumulate path from root down to the leaves
                var path = "";
                // branch we are currently adding nodes to - initially root then the child collection of each node down the path
                var currentBranch: TreeNode[] = rootNodes;

                var pathElements = smartFolderPath.split("/");
                pathElements.forEach((pathElement, i) =>
                {
                    // accumulate path
                    path = path.length > 0 ? path + "/" + pathElement : pathElement;
                    var treeNode = treeNodesByPath[path];
                    if (treeNode == null)
                    {
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
        }
    }
 
    export class NavigatorPanel extends Panel
    {
        private searchPanel: SearchPanel;
        private catalogsPanel: CatalogsPanel;
        private mediaPathsPanel: MediaPathsPanel;
        private smartFoldersPanel: SmartFoldersPanel;
 
        private allPopoutPanels: PopoutPanel[];

        private clipList: ClipListPanel;

        private openPanel: Panel = null;

        constructor(element: any, clipList: ClipListPanel)
        {
            super(element);

            this.clipList = clipList;

            this.$element.addClass("navigator");

            var $ul = $("<ul class='nav nav-sidebar'>").appendTo(this.$element)
            var $searchMenu = $("<li><a class='menu-item'><span class='catdvicon catdvicon-search'></span> Search<span class='catdvicon catdvicon-chevron pull-right'></span></a></li>").appendTo($ul);
            var $catalogsMenu = $("<li><a class='menu-item'><span class='catdvicon catdvicon-catalogs'></span> Catalogs<span class='catdvicon catdvicon-chevron pull-right'></span></a></li>").appendTo($ul);
            var $mediaPathsMenu = $("<li><a class='menu-item'><span class='catdvicon catdvicon-media_paths'></span> Media Path<span class='catdvicon catdvicon-chevron pull-right'></span></a></li>").appendTo($ul);

            this.searchPanel = SearchPanel.create(this);
            this.searchPanel.onSearch((query: QueryDefinition, queryDescription: string) =>
            {
                this.clipList.setQuery(query, queryDescription);
            });
            this.searchPanel.onClose((evt) =>
            {
                this.togglePanel($searchMenu, this.searchPanel);
            });
            $searchMenu.on("click", (evt) => this.togglePanel($searchMenu, this.searchPanel));

            this.catalogsPanel = CatalogsPanel.create(this);
            this.catalogsPanel.onCatalogSelected((catalog: Catalog) =>
            {
                this.clipList.setCatalogID(catalog);
            });
            this.catalogsPanel.onClose((evt) =>
            {
                this.togglePanel($catalogsMenu, this.catalogsPanel);
            });
            $catalogsMenu.on("click", (evt) => this.togglePanel($catalogsMenu, this.catalogsPanel));

            this.mediaPathsPanel = MediaPathsPanel.create(this);
            this.mediaPathsPanel.onMediaPathQuery((query: QueryDefinition, queryDescription: string) =>
            {
                this.clipList.setQuery(query, queryDescription);
            });
            this.mediaPathsPanel.onClose((evt) =>
            {
                this.togglePanel($mediaPathsMenu, this.mediaPathsPanel);
            });
            $mediaPathsMenu.on("click", (evt) => this.togglePanel($mediaPathsMenu, this.mediaPathsPanel));

            this.allPopoutPanels = [this.searchPanel, this.catalogsPanel, this.mediaPathsPanel];

            if (ServerSettings.isEnterpriseServer)
            {
                var $smartFoldersMenu = $("<li><a class='menu-item'><span class='catdvicon catdvicon-saved_queries'></span> Smart Folders<span class='catdvicon catdvicon-chevron pull-right'></span></a></li>").appendTo($ul);

                this.smartFoldersPanel = SmartFoldersPanel.create(this);
                this.smartFoldersPanel.onSmartFolderSelected((smartFolder: SmartFolder) =>
                {
                    this.clipList.setSmartFolderID(smartFolder);
                });
                this.smartFoldersPanel.onClose((evt) =>
                {
                    this.togglePanel($smartFoldersMenu, this.smartFoldersPanel);
                });
                $smartFoldersMenu.on("click", (evt) => this.togglePanel($smartFoldersMenu, this.smartFoldersPanel));

                this.allPopoutPanels.push(this.smartFoldersPanel);
            }
        }
        
        public closePopouts()
        {
            this.allPopoutPanels.forEach((popoutPanel) => popoutPanel.close());
            this.$element.find("li").removeClass("active");
            this.openPanel = null;
        }

        private togglePanel($menu: JQuery, panel: PopoutPanel)
        {
            if (panel === this.openPanel)
            {
                this.closePopouts();
            }
            else
            {
                this.closePopouts();
                $menu.addClass("active");
                panel.open();
                this.openPanel = panel;
            }
        }
    }

    class SmartFolderDialog extends Modal
    {
        private lblSmartFolderName = new Label("lblSmartFolderName");
        private txtSmartFolderName = new TextBox("txtSmartFolderName");
        private listGroups = new DropDownList("listGroups");
        private queryBuilder = new QueryBuilder("smartFolderQueryBuilder");
        private btnSmartFolderDialogOK = new Button("btnSmartFolderDialogOK");

        private smartFolder: SmartFolder;

        constructor(element: any)
        {
            super(element);

            this.txtSmartFolderName.onInput((evt) => this.lblSmartFolderName.setText("Smart Folder: " + this.txtSmartFolderName.getText()));
            
            this.btnSmartFolderDialogOK.onClick((evt) =>
            {
                this.smartFolder.name = this.txtSmartFolderName.getText();
                this.smartFolder.groupID = Number(this.listGroups.getSelectedValue());
                this.smartFolder.query = this.queryBuilder.getQuery();
                this.close(true, this.smartFolder);
            });
        }

        public setSmartFolder(smartFolder: SmartFolder)
        {
            this.smartFolder = smartFolder;
            this.lblSmartFolderName.setText("Smart Folder: " + smartFolder.name);
            this.txtSmartFolderName.setText(smartFolder.name);
            this.listGroups.setSelectedValue(String(smartFolder.groupID));
            this.queryBuilder.setQuery(smartFolder.query);
        }

        // Override - (to avoid auto-focus logic)
        public show()
        {
            this.$element.modal("show");
        }

    }
}


