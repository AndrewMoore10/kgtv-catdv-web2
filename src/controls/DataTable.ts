module controls
{
    import PartialResultSet = catdv.PartialResultSet;
    import StdParams = catdv.StdParams;

    export interface DataTableColumn
    {
        title: string;
        dataProp?: string;
        renderer?: (object: any, val: any) => string;
        isSortable?: boolean;
        sortBy?: string;
        width?: number;
    }

    export interface DataTableSettings
    {
        multiselect?: boolean;
        pageSize?: number;

        columns: DataTableColumn[];
        dataSource?: PagedDataSource;

        onRowClicked? (row: any, data: any, iDataIndex: number);
    }

    export class PagingControls extends Element
    {
        private resultSet: PartialResultSet<any>;
        private $pagingMessage: JQuery;
        private pageSize: number;

        private loadPageHandler: (skip: number, take: number) => void = $.noop;

        constructor(elementId: string, $parent: JQuery, pageSize: number)
        {
            super($("<ul id='" + elementId + "' class='paging'>").appendTo($parent));

            this.pageSize = pageSize;

            $("<li><a href='#'><span class='glyphicon glyphicon-fast-backward'></span> First</a></li>").appendTo(this.$element)
                .on("click", (evt) =>
                {
                    this.loadPageHandler(0, this.pageSize);
                });

            $("<li><a href='#'><span class='glyphicon glyphicon-step-backward'></span> Prev</a></li>").appendTo(this.$element)
                .on("click", (evt) =>
                {
                    this.loadPageHandler(Math.max(this.resultSet.offset - this.pageSize, 0), this.pageSize);
                });

            this.$pagingMessage = $("<li class='dt-paging-message'></li>").appendTo(this.$element);
            $("<li><a href='#'>Next <span class='glyphicon glyphicon-step-forward'></span></a></li>").appendTo(this.$element)
                .on("click", (evt) =>
                {
                    if (this.resultSet.offset + this.pageSize > this.resultSet.totalItems)
                    {
                        var lastPageSize = (this.resultSet.totalItems % this.pageSize) || this.pageSize;
                        var lastPageOffset = Math.max(this.resultSet.totalItems - lastPageSize, 0);
                        this.loadPageHandler(Math.min(this.resultSet.offset + this.pageSize, lastPageOffset), lastPageSize);
                    }
                    else
                    {
                        this.loadPageHandler(this.resultSet.offset + this.pageSize, this.pageSize);
                    }
                });
            $("<li><a href='#'>Last <span class='glyphicon glyphicon-fast-forward'></span></a></li>").appendTo(this.$element)
                .on("click", (evt) =>
                {
                    var lastPageSize = (this.resultSet.totalItems % this.pageSize) || this.pageSize;
                    var lastPageOffset = Math.max(this.resultSet.totalItems - lastPageSize, 0);
                    this.loadPageHandler(lastPageOffset, lastPageSize);
                });
        }

        public onLoadPage(loadPageHandler: (skip: number, take: number) => void)
        {
            this.loadPageHandler = loadPageHandler || $.noop;
        }

        public update(resultSet: PartialResultSet<any>)
        {
            this.resultSet = resultSet;

            if ((this.resultSet != null) && (this.resultSet.items != null) && (this.resultSet.items.length > 0))
            {
                this.$pagingMessage.text("" + (this.resultSet.offset + 1) + " to " + (this.resultSet.offset + this.resultSet.items.length) + " of " + this.resultSet.totalItems);
            }
            else
            {
                this.$pagingMessage.text("No Data");
            }
        }
    }

    export interface SelectionChangedEvent
    {
        selectedIndexes: number[];
        selectedItems: any[];
        doubleClick: boolean;
    }

    export class DataTable extends Control
    {
        private settings: DataTableSettings;
        private dataSource: PagedDataSource
        private columns: DataTableColumn[];
        private sortColumn: number = null;
        private sortReversed: boolean;

        private resultSet: PartialResultSet<any>;
        private $wrapper: JQuery;
        private $headerTable: JQuery;
        private $bodyTable: JQuery;
        private $footerDiv: JQuery;
        private pagingControls: PagingControls;

        private selectedIndexes: number[] = [];

        private selectionChangedHandler: (evt: SelectionChangedEvent) => void;

        constructor(element: any, settings: DataTableSettings)
        {
            super(element);

            this.settings = $.extend(
                {
                    multiselect: false,
                    pageSize: 50
                }, settings);

            this.dataSource = settings.dataSource;
            this.columns = settings.columns;

            // Only load data if columns have been specified - otherwise defer loading until setColumns() called
            if (this.columns)
            {
                this.renderGrid();
                this.updateColumnWidths();
                this.loadData(0);
            }

            $(window).resize((evt) =>
            {
                this.updateColumnWidths();
            });
        }

        public setColumns(columns: DataTableColumn[], pagingOffset : number = 0)
        {
            this.columns = columns;
            this.renderGrid();
            this.updateColumnWidths();
            this.loadData(pagingOffset);
        }

        public onSelectionChanged(selectionChangedHandler: (evt: SelectionChangedEvent) => void)
        {
            this.selectionChangedHandler = selectionChangedHandler;
        }

        public reload(pagingOffset : number = 0)
        {
            // Only load data if columns have been specified - otherwise defer loading until setColumns() called
            if (this.columns)
            {
                this.loadData(pagingOffset);
            }
        }

        public getSelectedItem(): any
        {
            return (this.selectedIndexes.length > 0) ? this.resultSet.items[this.selectedIndexes[0]] : null;
        }

        public getSelectedItems(): any[]
        {
            return this.selectedIndexes.map((selectedIndex) => this.resultSet.items[selectedIndex]);
        }

        public findItem(matchFunction: (o: any) => boolean)
        {
            var data = this.resultSet.items;
            for (var i = 0; i < data.length; i++)
            {
                if (matchFunction(data[i])) return data[i];
            }
            return null;
        }


        private renderGrid()
        {
            // render table
            // Table rendered as three separate sections, one table for the header columns, one table for the table body (that will scroll)
            // and one div for the footer. The scrolling body table has a copy of the header, that will be hidden under the fixed header.
            // We then copy the widths of the table columns up to the header - probably...

            // Wrapper
            var html = "<div class='dt-wrapper'>";

            // Header
            html += "<div class='dt-header'>";
            html += "<table class='dt-table'>";
            html += this.renderTHEAD(true);
            html += "</table></div>\n";

            // Body (also has its own copy of the header, which will be rendered 'underneath' the fixed header)
            html += "<div class='dt-body'>";
            html += "<table class='dt-table'>";
            html += this.renderTHEAD(false);
            html += "<tbody>"
            html += "<tr><td colspan=" + this.columns.length + "><h3 class='loadingMessage'>Loading...</h3></td></tr>\n";
            html += "</tbody></table></div>\n"

            // Footer (Paging)
            html += "<div class='dt-footer'><div>";

            //  Close Wrapper
            html += "</div>";

            this.$element.html(html);

            this.$wrapper = this.$element.find(".dt-wrapper");
            this.$headerTable = this.$element.find(".dt-header table.dt-table");
            this.$bodyTable = this.$element.find(".dt-body table.dt-table");
            this.$footerDiv = this.$element.find(".dt-footer");

            this.$headerTable.find(".sortable").on("click", (evt) =>
            {
                var columnIndex = this.$headerTable.find("th").index(evt.delegateTarget);
                if (this.sortColumn == columnIndex)
                {
                    this.sortReversed = !this.sortReversed;
                }
                else
                {
                    this.sortColumn = columnIndex;
                    this.sortReversed = false;
                }
                this.$headerTable.find(".sortable").removeClass("sortAsc").removeClass("sortDesc");
                $(evt.delegateTarget).addClass(this.sortReversed ? "sortDesc" : "sortAsc");
                this.reload();
            });

            this.pagingControls = new PagingControls(this.elementId + "_paging", this.$footerDiv, this.settings.pageSize);
            this.pagingControls.onLoadPage((skip, take) =>
            {
                this.loadData(skip);
            });

            var headerHeight = this.$headerTable.outerHeight(true);
            this.$wrapper.css({ "padding-top": headerHeight });
            this.$bodyTable.css({ "margin-top": -headerHeight });

            this.$headerTable.find("th:last-child").css({ "padding-right": "15px" });
        }

        private renderTHEAD(isInteractive: boolean): string
        {
            var columns: DataTableColumn[] = this.columns;
            var tdWidths = this.calculateColumnWidths();

            var html = "<thead><tr>";
            for (var i = 0; i < columns.length; i++)
            {
                var w = tdWidths[i] ? " style='width:" + columns[i].width + "px'" : "";
                var s = columns[i].isSortable ? " class='sortable'" : "";
                html += "<th" + w + s + ">" + columns[i].title + "</th>";
            }
            html += "</tr></thead>";
            return html;
        }

        private loadData(skip: number)
        {
            this.$element.find("tbody").html("<tr><td colspan=" + this.columns.length + "><h3 class='loadingMessage'>Loading...</h3></td></tr>\n");

            var params: StdParams = { skip: skip, take: this.settings.pageSize };
            if (this.sortColumn != null)
            {
                params.sortBy = this.columns[this.sortColumn].sortBy || this.columns[this.sortColumn].dataProp;
                params.sortDir = this.sortReversed ? "DESC" : "ASC";
            }
            this.dataSource.getData(params, (resultSet: PartialResultSet<any>) =>
            {
                this.resultSet = resultSet;
                this.renderData();
            });
        }

        private renderData()
        {
            var html = "";
            if ((this.resultSet == null) || (this.resultSet.items == null) || (this.resultSet.items.length == 0))
            {
                html = "<tr><td colspan=" + this.columns.length + ">No data to display.</td></tr>\n"
            }
            else
            {
                var columns: DataTableColumn[] = this.columns;
                for (var row = 0; row < this.resultSet.items.length; row++)
                {
                    var rowData = this.resultSet.items[row];
                    html += "<tr id='" + this.rowID(row) + "'>"
                    for (var col = 0; col < columns.length; col++)
                    {
                        html += "<td>" + this.renderCellValue(rowData, columns[col]) + "</td>";
                    }
                    html += "</tr>"
                }
            }
            this.$element.find("tbody").html(html);
            this.$element.find("tr")
                .on("click", (evt: JQueryEventObject) => { this.row_onClick(evt, false); })
                .on("dblclick", (evt: JQueryEventObject) => { this.row_onClick(evt, true); });

            this.selectedIndexes = [];
            this.updateActionButtons();

            this.updateColumnWidths();
            this.pagingControls.update(this.resultSet);
        }

        private renderCellValue(rowData: any, column: DataTableColumn)
        {
            try
            {
                var columnValue = column.dataProp ? eval("rowData." + column.dataProp) : null;
                if (column.renderer)
                {
                    return column.renderer(rowData, columnValue) || "";
                }
                else
                {
                    return columnValue || "";
                }
            }
            catch (e)
            {
                return e;
            }
        }

        private row_onClick(evt: JQueryEventObject, doubleClick: boolean) 
        {
            if (!this.settings.multiselect || (!(evt.ctrlKey || evt.metaKey) && !evt.shiftKey && this.selectedIndexes.length > 0))
            {
                // deselect everything
                this.selectedIndexes = [];
                this.$element.find("tr").removeClass("selected");
            }

            var rowID = evt.delegateTarget.getAttribute("id");
            if (!rowID) return; // header
            var clickedRowIndex = Number(rowID.split("_")[1]);

            if (this.settings.multiselect && evt.shiftKey && this.selectedIndexes.length > 0)
            {
                // select all rows between existing selection and this row              
                // capture the first selected row
                var firstSelectedRow = this.selectedIndexes[0];

                // then deselect everything - need to deselect anything outside the range
                this.selectedIndexes = [];
                this.$element.find("tr").removeClass("selected");

                // then select all the rows from first to current
                var numSelectedItems = Math.abs(clickedRowIndex - firstSelectedRow) + 1;
                var step = (clickedRowIndex > firstSelectedRow) ? 1 : -1;
                var index = firstSelectedRow;
                for (var i = 0; i < numSelectedItems; i++)
                {
                    this.selectedIndexes.push(index);
                    this.$element.find("#" + this.rowID(index)).addClass("selected");
                    index += step;
                }
            }
            else
            {
                // select clicked row
                this.selectedIndexes.push(clickedRowIndex);
                this.$element.find("#" + this.rowID(clickedRowIndex)).addClass("selected");
            }

            this.updateActionButtons();

            if (this.selectionChangedHandler)
            {
                this.selectionChangedHandler({
                    selectedIndexes: this.selectedIndexes,
                    selectedItems: this.getSelectedItems(),
                    doubleClick: doubleClick
                });
            }
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

        private rowID(rowIndex: number)
        {
            return "dt-" + this.elementId + "_" + rowIndex;
        }

        private calculateColumnWidths(): number[]
        {
            var columns: DataTableColumn[] = this.columns;
            var tableWidth = this.$element.width();

            var numFixedColumns = 0;
            var totalFixedColumnWidth = 0;
            for (var i = 0; i < columns.length; i++)
            {
                if (columns[i].width)
                {
                    totalFixedColumnWidth += columns[i].width;
                    numFixedColumns++;
                }
            }

            var columnWidth = (tableWidth - totalFixedColumnWidth) / (columns.length - numFixedColumns);

            var tdWidths: number[] = [];
            for (var i = 0; i < columns.length - 1; i++)
            {
                tdWidths.push(columns[i].width ? columns[i].width : columnWidth);
            }
            tdWidths.push(null); // last column has default width
            return tdWidths;
        }

        private updateColumnWidths()
        {
            if (this.columns)
            {
                var tdWidths = this.calculateColumnWidths();

                this.$headerTable.find("tr th").each(function(index)
                {
                    var width = tdWidths[index];
                    if (width)
                    {
                        $(this).css({ 'width': width });
                    }
                });

                this.$bodyTable.find("tr th").each(function(index)
                {
                    var width = tdWidths[index];
                    if (width)
                    {
                        $(this).css({ 'width': width });
                    }
                });
            }
        }
    }
}