module controls
{
    export interface TreeNode
    {
        name: string;
        value?: any;
        isExpanded?: boolean;
        isSectionHeader?: boolean;
        isSelectable?: boolean;
        hasEditControls?: boolean;
        children?: TreeNode[];
        listElementId?: string;
    }

    export class TreeView extends Control
    {
        private selectionChangedHandler: (evt: any) => void = null;
        private nodeEditHandler: (evt: any) => void = null;
        private nodeDeleteHandler: (evt: any) => void = null;
        private selectedItem: TreeNode = null;

        private model: TreeNode[];
        private nodeLookup: { [nodeID: string]: TreeNode } = {};

        // elementId of the <div> with overflow:scroll that will contain the tree
        constructor(elementId: string)
        {
            super(elementId);

            this.$element.addClass("treeView");
        }

        public setModel(model: TreeNode[])
        {
            this.model = model;
            this.redraw();
        }

        public onSelectionChanged(changeHandler: (evt: any) => void)
        {
            this.selectionChangedHandler = changeHandler;
        }

        public onNodeEdit(nodeEditHandler: (evt: any) => void)
        {
            this.nodeEditHandler = nodeEditHandler;
        }

        public onNodeDelete(nodeDeleteHandler: (evt: any) => void)
        {
            this.nodeDeleteHandler = nodeDeleteHandler;
        }

        public getSelectedItem(): TreeNode
        {
            return this.selectedItem;
        }

        public clearSelection()
        {
            this.$element.find("li span.nodeLabel").removeClass("selected");
        }

        public redraw()
        {
            this.$element.empty();

            this.nodeLookup = {};
            this.$element.html(this.buildTree(this.model, true, this.elementId, true));

            this.$element.find("li").on("click", (evt) =>
            {
                this.onListItemClick(evt);
                evt.stopPropagation();
            });
            this.$element.find("a.editControl").on("click", (evt) =>
            {
                this.onEditControlClick(evt);
                evt.stopPropagation();
            });
            this.$element.find("span.discloser").on("click", (evt) =>
            {
                this.onDiscloserClick(evt);
                evt.stopPropagation();
            });
        }

        private buildTree(tree: TreeNode[], expanded: boolean, parentID: string, isRoot: boolean): string
        {
            var html = "";

            html += "<ul class='" + (isRoot ? "" : "indented ") + (expanded ? "" : "hidden") + "'>";

            for (var i = 0; i < tree.length; i++)
            {
                var treeNode = tree[i];
                var id = parentID + "-" + i;
                this.nodeLookup[id] = treeNode;

                if (treeNode.children && treeNode.children.length > 0)
                {
                    html += "<li id='" + id + "'>";
                    if (!treeNode.isSectionHeader)
                    {
                        html += "<span id='discloser_" + id + "' class='glyphicon glyphicon-play discloser " + (treeNode.isExpanded ? " glyph-rotate-90" : "") + "'> </span> ";
                    }
                    html += "<span class='nodeLabel" + (isRoot ? " root" : "") + "'>" + treeNode.name + " ";

                    // TODO: HACK - should do with styles
                    if (treeNode.isSectionHeader)
                    {
                        html += "<span class='catdvicon catdvicon-expand pull-right'></span>";
                    }

                    html += "</span>";
                    html += this.buildTree(treeNode.children, treeNode.isExpanded, id, false);
                    html += "</li>";
                }
                else
                {
                    // Node can be a root AND a leaf
                    html += "<li id='" + id + "' class='leaf'><span class='nodeLabel" + (isRoot ? " root" : "") + "'>" + treeNode.name + "</span>";
                    if (treeNode.hasEditControls)
                    {
                        html += "<a id='edit_" + id + "' class='editControl'><span class='glyphicon glyphicon-pencil'> </span></a>";
                        html += "<a id='delete_" + id + "' class='editControl'><span class='glyphicon glyphicon-trash'> </span></a>";
                    }
                    html += "</li>";
                }
                treeNode.listElementId = id;
            }
            html += "</ul>";
            return html;
        }

        private onListItemClick(evt: JQueryEventObject)
        {
            Console.debug("onListItemClick" + evt.target + "," + evt.delegateTarget);
            this.$element.find("li span.nodeLabel").removeClass("selected");
            var nodeID = $(evt.delegateTarget).get(0).id;
            var node = this.nodeLookup[nodeID];
            if (node.isSelectable || !node.children || node.children.length == 0)
            {
                $(evt.delegateTarget).children(".nodeLabel").addClass("selected");
                this.selectedItem = node;
                this.fireSelectionChanged();
            }
            else
            {
                this.toggleNode(node);
            }
        }

        private onEditControlClick(evt: JQueryEventObject)
        {
            var linkID = $(evt.delegateTarget).get(0).id;
            var idFields = linkID.split("_");
            var action = idFields[0];
            var nodeID = idFields[1];
            var node = this.nodeLookup[nodeID];
            if ((action == "edit") && (this.nodeEditHandler))
            {
                this.nodeEditHandler({ src: this, node: node });
            }
            else if ((action == "delete") && (this.nodeDeleteHandler))
            {
                this.nodeDeleteHandler({ src: this, node: node });
            }
        }

        private onDiscloserClick(evt: JQueryEventObject)
        {
            var arrowID = $(evt.target).get(0).id;
            var nodeID = arrowID.split("_")[1];
            var node = this.nodeLookup[nodeID];
            this.toggleNode(node);
        }

        private toggleNode(node: TreeNode)
        {
            if (node.isExpanded)
            {
                $("#" + node.listElementId).addClass("closed");
                $("#" + node.listElementId + " > ul").addClass("hidden");
                $("#discloser_" + node.listElementId).removeClass("glyph-rotate-90");
                node.isExpanded = false;
            }
            else
            {
                $("#" + node.listElementId).removeClass("closed");
                $("#" + node.listElementId + " > ul").removeClass("hidden");
                $("#discloser_" + node.listElementId).addClass("glyph-rotate-90");
                node.isExpanded = true;
            }
        }

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

        private fireSelectionChanged()
        {
            if (this.selectionChangedHandler != null)
            {
                this.selectionChangedHandler({});
            }
        }
    }
}