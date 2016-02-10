var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var controls;
(function (controls) {
    var TreeView = (function (_super) {
        __extends(TreeView, _super);
        // elementId of the <div> with overflow:scroll that will contain the tree
        function TreeView(elementId) {
            _super.call(this, elementId);
            this.selectionChangedHandler = null;
            this.nodeEditHandler = null;
            this.nodeDeleteHandler = null;
            this.selectedItem = null;
            this.nodeLookup = {};
            this.$element.addClass("treeView");
        }
        TreeView.prototype.setModel = function (model) {
            this.model = model;
            this.redraw();
        };
        TreeView.prototype.onSelectionChanged = function (changeHandler) {
            this.selectionChangedHandler = changeHandler;
        };
        TreeView.prototype.onNodeEdit = function (nodeEditHandler) {
            this.nodeEditHandler = nodeEditHandler;
        };
        TreeView.prototype.onNodeDelete = function (nodeDeleteHandler) {
            this.nodeDeleteHandler = nodeDeleteHandler;
        };
        TreeView.prototype.getSelectedItem = function () {
            return this.selectedItem;
        };
        TreeView.prototype.clearSelection = function () {
            this.$element.find("li span.nodeLabel").removeClass("selected");
        };
        TreeView.prototype.redraw = function () {
            var _this = this;
            this.$element.empty();
            this.nodeLookup = {};
            this.$element.html(this.buildTree(this.model, true, this.elementId, true));
            this.$element.find("li").on("click", function (evt) {
                _this.onListItemClick(evt);
                evt.stopPropagation();
            });
            this.$element.find("a.editControl").on("click", function (evt) {
                _this.onEditControlClick(evt);
                evt.stopPropagation();
            });
            this.$element.find("span.discloser").on("click", function (evt) {
                _this.onDiscloserClick(evt);
                evt.stopPropagation();
            });
        };
        TreeView.prototype.buildTree = function (tree, expanded, parentID, isRoot) {
            var html = "";
            html += "<ul class='" + (isRoot ? "" : "indented ") + (expanded ? "" : "hidden") + "'>";
            for (var i = 0; i < tree.length; i++) {
                var treeNode = tree[i];
                var id = parentID + "-" + i;
                this.nodeLookup[id] = treeNode;
                if (treeNode.children && treeNode.children.length > 0) {
                    html += "<li id='" + id + "'>";
                    if (!treeNode.isSectionHeader) {
                        html += "<span id='discloser_" + id + "' class='glyphicon glyphicon-play discloser " + (treeNode.isExpanded ? " glyph-rotate-90" : "") + "'> </span> ";
                    }
                    html += "<span class='nodeLabel" + (isRoot ? " root" : "") + "'>" + treeNode.name + " ";
                    // TODO: HACK - should do with styles
                    if (treeNode.isSectionHeader) {
                        html += "<span class='catdvicon catdvicon-expand pull-right'></span>";
                    }
                    html += "</span>";
                    html += this.buildTree(treeNode.children, treeNode.isExpanded, id, false);
                    html += "</li>";
                }
                else {
                    // Node can be a root AND a leaf
                    html += "<li id='" + id + "' class='leaf'><span class='nodeLabel" + (isRoot ? " root" : "") + "'>" + treeNode.name + "</span>";
                    if (treeNode.hasEditControls) {
                        html += "<a id='edit_" + id + "' class='editControl'><span class='glyphicon glyphicon-pencil'> </span></a>";
                        html += "<a id='delete_" + id + "' class='editControl'><span class='glyphicon glyphicon-trash'> </span></a>";
                    }
                    html += "</li>";
                }
                treeNode.listElementId = id;
            }
            html += "</ul>";
            return html;
        };
        TreeView.prototype.onListItemClick = function (evt) {
            controls.Console.debug("onListItemClick" + evt.target + "," + evt.delegateTarget);
            this.$element.find("li span.nodeLabel").removeClass("selected");
            var nodeID = $(evt.delegateTarget).get(0).id;
            var node = this.nodeLookup[nodeID];
            if (node.isSelectable || !node.children || node.children.length == 0) {
                $(evt.delegateTarget).children(".nodeLabel").addClass("selected");
                this.selectedItem = node;
                this.fireSelectionChanged();
            }
            else {
                this.toggleNode(node);
            }
        };
        TreeView.prototype.onEditControlClick = function (evt) {
            var linkID = $(evt.delegateTarget).get(0).id;
            var idFields = linkID.split("_");
            var action = idFields[0];
            var nodeID = idFields[1];
            var node = this.nodeLookup[nodeID];
            if ((action == "edit") && (this.nodeEditHandler)) {
                this.nodeEditHandler({ src: this, node: node });
            }
            else if ((action == "delete") && (this.nodeDeleteHandler)) {
                this.nodeDeleteHandler({ src: this, node: node });
            }
        };
        TreeView.prototype.onDiscloserClick = function (evt) {
            var arrowID = $(evt.target).get(0).id;
            var nodeID = arrowID.split("_")[1];
            var node = this.nodeLookup[nodeID];
            this.toggleNode(node);
        };
        TreeView.prototype.toggleNode = function (node) {
            if (node.isExpanded) {
                $("#" + node.listElementId).addClass("closed");
                $("#" + node.listElementId + " > ul").addClass("hidden");
                $("#discloser_" + node.listElementId).removeClass("glyph-rotate-90");
                node.isExpanded = false;
            }
            else {
                $("#" + node.listElementId).removeClass("closed");
                $("#" + node.listElementId + " > ul").removeClass("hidden");
                $("#discloser_" + node.listElementId).addClass("glyph-rotate-90");
                node.isExpanded = true;
            }
        };
        //        private getNodeFromListItemId(listItemId: string): TreeNode
        //        {
        //            var ids = listItemId.split("-");
        //            var nodeList = this.model;
        //            var node: TreeNode = null;
        //            // Skip first id as that is just the id of the tree itself
        //            for (var i = 1; i < ids.length; i++)
        //            {
        //                node = nodeList[Number(ids[i])];
        //                nodeList = node.children;
        //            }
        //            return node;
        //        }
        TreeView.prototype.fireSelectionChanged = function () {
            if (this.selectionChangedHandler != null) {
                this.selectionChangedHandler({});
            }
        };
        return TreeView;
    })(controls.Control);
    controls.TreeView = TreeView;
})(controls || (controls = {}));
