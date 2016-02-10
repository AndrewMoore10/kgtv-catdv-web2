var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var controls;
(function (controls) {
    var PagingControls = (function (_super) {
        __extends(PagingControls, _super);
        function PagingControls(elementId, $parent, pageSize) {
            var _this = this;
            _super.call(this, $("<ul id='" + elementId + "' class='paging'>").appendTo($parent));
            this.loadPageHandler = $.noop;
            this.pageSize = pageSize;
            $("<li><a href='#'><span class='glyphicon glyphicon-fast-backward'></span> First</a></li>").appendTo(this.$element).on("click", function (evt) {
                _this.loadPageHandler(0, _this.pageSize);
            });
            $("<li><a href='#'><span class='glyphicon glyphicon-step-backward'></span> Prev</a></li>").appendTo(this.$element).on("click", function (evt) {
                _this.loadPageHandler(Math.max(_this.resultSet.offset - _this.pageSize, 0), _this.pageSize);
            });
            this.$pagingMessage = $("<li class='dt-paging-message'></li>").appendTo(this.$element);
            $("<li><a href='#'>Next <span class='glyphicon glyphicon-step-forward'></span></a></li>").appendTo(this.$element).on("click", function (evt) {
                if (_this.resultSet.offset + _this.pageSize > _this.resultSet.totalItems) {
                    var lastPageSize = (_this.resultSet.totalItems % _this.pageSize) || _this.pageSize;
                    var lastPageOffset = Math.max(_this.resultSet.totalItems - lastPageSize, 0);
                    _this.loadPageHandler(Math.min(_this.resultSet.offset + _this.pageSize, lastPageOffset), lastPageSize);
                }
                else {
                    _this.loadPageHandler(_this.resultSet.offset + _this.pageSize, _this.pageSize);
                }
            });
            $("<li><a href='#'>Last <span class='glyphicon glyphicon-fast-forward'></span></a></li>").appendTo(this.$element).on("click", function (evt) {
                var lastPageSize = (_this.resultSet.totalItems % _this.pageSize) || _this.pageSize;
                var lastPageOffset = Math.max(_this.resultSet.totalItems - lastPageSize, 0);
                _this.loadPageHandler(lastPageOffset, lastPageSize);
            });
        }
        PagingControls.prototype.onLoadPage = function (loadPageHandler) {
            this.loadPageHandler = loadPageHandler || $.noop;
        };
        PagingControls.prototype.update = function (resultSet) {
            this.resultSet = resultSet;
            if ((this.resultSet != null) && (this.resultSet.items != null) && (this.resultSet.items.length > 0)) {
                this.$pagingMessage.text("" + (this.resultSet.offset + 1) + " to " + (this.resultSet.offset + this.resultSet.items.length) + " of " + this.resultSet.totalItems);
            }
            else {
                this.$pagingMessage.text("No Data");
            }
        };
        return PagingControls;
    })(controls.Element);
    controls.PagingControls = PagingControls;
    var DataTable = (function (_super) {
        __extends(DataTable, _super);
        function DataTable(element, settings) {
            var _this = this;
            _super.call(this, element);
            this.sortColumn = null;
            this.selectedIndexes = [];
            this.settings = $.extend({
                multiselect: false,
                pageSize: 50
            }, settings);
            this.dataSource = settings.dataSource;
            this.columns = settings.columns;
            // Only load data if columns have been specified - otherwise defer loading until setColumns() called
            if (this.columns) {
                this.renderGrid();
                this.updateColumnWidths();
                this.loadData(0);
            }
            $(window).resize(function (evt) {
                _this.updateColumnWidths();
            });
        }
        DataTable.prototype.setColumns = function (columns, pagingOffset) {
            if (pagingOffset === void 0) { pagingOffset = 0; }
            this.columns = columns;
            this.renderGrid();
            this.updateColumnWidths();
            this.loadData(pagingOffset);
        };
        DataTable.prototype.onSelectionChanged = function (selectionChangedHandler) {
            this.selectionChangedHandler = selectionChangedHandler;
        };
        DataTable.prototype.reload = function (pagingOffset) {
            if (pagingOffset === void 0) { pagingOffset = 0; }
            // Only load data if columns have been specified - otherwise defer loading until setColumns() called
            if (this.columns) {
                this.loadData(pagingOffset);
            }
        };
        DataTable.prototype.getSelectedItem = function () {
            return (this.selectedIndexes.length > 0) ? this.resultSet.items[this.selectedIndexes[0]] : null;
        };
        DataTable.prototype.getSelectedItems = function () {
            var _this = this;
            return this.selectedIndexes.map(function (selectedIndex) { return _this.resultSet.items[selectedIndex]; });
        };
        DataTable.prototype.findItem = function (matchFunction) {
            var data = this.resultSet.items;
            for (var i = 0; i < data.length; i++) {
                if (matchFunction(data[i]))
                    return data[i];
            }
            return null;
        };
        DataTable.prototype.renderGrid = function () {
            // render table
            // Table rendered as three separate sections, one table for the header columns, one table for the table body (that will scroll)
            // and one div for the footer. The scrolling body table has a copy of the header, that will be hidden under the fixed header.
            // We then copy the widths of the table columns up to the header - probably...
            var _this = this;
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
            html += "<tbody>";
            html += "<tr><td colspan=" + this.columns.length + "><h3 class='loadingMessage'>Loading...</h3></td></tr>\n";
            html += "</tbody></table></div>\n";
            // Footer (Paging)
            html += "<div class='dt-footer'><div>";
            //  Close Wrapper
            html += "</div>";
            this.$element.html(html);
            this.$wrapper = this.$element.find(".dt-wrapper");
            this.$headerTable = this.$element.find(".dt-header table.dt-table");
            this.$bodyTable = this.$element.find(".dt-body table.dt-table");
            this.$footerDiv = this.$element.find(".dt-footer");
            this.$headerTable.find(".sortable").on("click", function (evt) {
                var columnIndex = _this.$headerTable.find("th").index(evt.delegateTarget);
                if (_this.sortColumn == columnIndex) {
                    _this.sortReversed = !_this.sortReversed;
                }
                else {
                    _this.sortColumn = columnIndex;
                    _this.sortReversed = false;
                }
                _this.$headerTable.find(".sortable").removeClass("sortAsc").removeClass("sortDesc");
                $(evt.delegateTarget).addClass(_this.sortReversed ? "sortDesc" : "sortAsc");
                _this.reload();
            });
            this.pagingControls = new PagingControls(this.elementId + "_paging", this.$footerDiv, this.settings.pageSize);
            this.pagingControls.onLoadPage(function (skip, take) {
                _this.loadData(skip);
            });
            var headerHeight = this.$headerTable.outerHeight(true);
            this.$wrapper.css({ "padding-top": headerHeight });
            this.$bodyTable.css({ "margin-top": -headerHeight });
            this.$headerTable.find("th:last-child").css({ "padding-right": "15px" });
        };
        DataTable.prototype.renderTHEAD = function (isInteractive) {
            var columns = this.columns;
            var tdWidths = this.calculateColumnWidths();
            var html = "<thead><tr>";
            for (var i = 0; i < columns.length; i++) {
                var w = tdWidths[i] ? " style='width:" + columns[i].width + "px'" : "";
                var s = columns[i].isSortable ? " class='sortable'" : "";
                html += "<th" + w + s + ">" + columns[i].title + "</th>";
            }
            html += "</tr></thead>";
            return html;
        };
        DataTable.prototype.loadData = function (skip) {
            var _this = this;
            this.$element.find("tbody").html("<tr><td colspan=" + this.columns.length + "><h3 class='loadingMessage'>Loading...</h3></td></tr>\n");
            var params = { skip: skip, take: this.settings.pageSize };
            if (this.sortColumn != null) {
                params.sortBy = this.columns[this.sortColumn].sortBy || this.columns[this.sortColumn].dataProp;
                params.sortDir = this.sortReversed ? "DESC" : "ASC";
            }
            this.dataSource.getData(params, function (resultSet) {
                _this.resultSet = resultSet;
                _this.renderData();
            });
        };
        DataTable.prototype.renderData = function () {
            var _this = this;
            var html = "";
            if ((this.resultSet == null) || (this.resultSet.items == null) || (this.resultSet.items.length == 0)) {
                html = "<tr><td colspan=" + this.columns.length + ">No data to display.</td></tr>\n";
            }
            else {
                var columns = this.columns;
                for (var row = 0; row < this.resultSet.items.length; row++) {
                    var rowData = this.resultSet.items[row];
                    html += "<tr id='" + this.rowID(row) + "'>";
                    for (var col = 0; col < columns.length; col++) {
                        html += "<td>" + this.renderCellValue(rowData, columns[col]) + "</td>";
                    }
                    html += "</tr>";
                }
            }
            this.$element.find("tbody").html(html);
            this.$element.find("tr").on("click", function (evt) {
                _this.row_onClick(evt, false);
            }).on("dblclick", function (evt) {
                _this.row_onClick(evt, true);
            });
            this.selectedIndexes = [];
            this.updateActionButtons();
            this.updateColumnWidths();
            this.pagingControls.update(this.resultSet);
        };
        DataTable.prototype.renderCellValue = function (rowData, column) {
            try {
                var columnValue = column.dataProp ? eval("rowData." + column.dataProp) : null;
                if (column.renderer) {
                    return column.renderer(rowData, columnValue) || "";
                }
                else {
                    return columnValue || "";
                }
            }
            catch (e) {
                return e;
            }
        };
        DataTable.prototype.row_onClick = function (evt, doubleClick) {
            if (!this.settings.multiselect || (!(evt.ctrlKey || evt.metaKey) && !evt.shiftKey && this.selectedIndexes.length > 0)) {
                // deselect everything
                this.selectedIndexes = [];
                this.$element.find("tr").removeClass("selected");
            }
            var rowID = evt.delegateTarget.getAttribute("id");
            if (!rowID)
                return; // header
            var clickedRowIndex = Number(rowID.split("_")[1]);
            if (this.settings.multiselect && evt.shiftKey && this.selectedIndexes.length > 0) {
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
                for (var i = 0; i < numSelectedItems; i++) {
                    this.selectedIndexes.push(index);
                    this.$element.find("#" + this.rowID(index)).addClass("selected");
                    index += step;
                }
            }
            else {
                // select clicked row
                this.selectedIndexes.push(clickedRowIndex);
                this.$element.find("#" + this.rowID(clickedRowIndex)).addClass("selected");
            }
            this.updateActionButtons();
            if (this.selectionChangedHandler) {
                this.selectionChangedHandler({
                    selectedIndexes: this.selectedIndexes,
                    selectedItems: this.getSelectedItems(),
                    doubleClick: doubleClick
                });
            }
        };
        DataTable.prototype.updateActionButtons = function () {
            if (this.selectedIndexes.length > 0) {
                $("button.item-action").removeAttr("disabled");
                $("li.item-action").removeClass("disabled");
            }
            else {
                $("button.item-action").attr("disabled", "disabled");
                $("li.item-action").addClass("disabled");
            }
        };
        DataTable.prototype.rowID = function (rowIndex) {
            return "dt-" + this.elementId + "_" + rowIndex;
        };
        DataTable.prototype.calculateColumnWidths = function () {
            var columns = this.columns;
            var tableWidth = this.$element.width();
            var numFixedColumns = 0;
            var totalFixedColumnWidth = 0;
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].width) {
                    totalFixedColumnWidth += columns[i].width;
                    numFixedColumns++;
                }
            }
            var columnWidth = (tableWidth - totalFixedColumnWidth) / (columns.length - numFixedColumns);
            var tdWidths = [];
            for (var i = 0; i < columns.length - 1; i++) {
                tdWidths.push(columns[i].width ? columns[i].width : columnWidth);
            }
            tdWidths.push(null); // last column has default width
            return tdWidths;
        };
        DataTable.prototype.updateColumnWidths = function () {
            if (this.columns) {
                var tdWidths = this.calculateColumnWidths();
                this.$headerTable.find("tr th").each(function (index) {
                    var width = tdWidths[index];
                    if (width) {
                        $(this).css({ 'width': width });
                    }
                });
                this.$bodyTable.find("tr th").each(function (index) {
                    var width = tdWidths[index];
                    if (width) {
                        $(this).css({ 'width': width });
                    }
                });
            }
        };
        return DataTable;
    })(controls.Control);
    controls.DataTable = DataTable;
})(controls || (controls = {}));
