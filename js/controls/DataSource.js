var controls;
(function (controls) {
    var ServerPagedDataSource = (function () {
        function ServerPagedDataSource(getPagedData) {
            this.getPagedData = getPagedData;
        }
        ServerPagedDataSource.prototype.getData = function (params, callback) {
            this.getPagedData(params, callback);
        };
        return ServerPagedDataSource;
    })();
    controls.ServerPagedDataSource = ServerPagedDataSource;
    var ClientPagedDataSource = (function () {
        function ClientPagedDataSource(getData) {
            this.getServerData = getData;
        }
        ClientPagedDataSource.prototype.getData = function (params, callback) {
            var _this = this;
            var useCache = this.isSet(params.useCache) ? params.useCache : ((params.skip || 0) != 0);
            if (useCache && (this.resultCache != null)) {
                this.processResults(this.resultCache, params, callback);
            }
            else {
                this.getServerData(function (results) {
                    _this.resultCache = results;
                    _this.processResults(results, params, callback);
                });
            }
        };
        ClientPagedDataSource.prototype.processResults = function (results, params, callback) {
            var _this = this;
            var offset = 0;
            var filteredResults = results;
            if (this.isSet(params.filter)) {
                var nameValue = params.filter.split("=");
                if (nameValue.length == 2) {
                    var filterProperty = nameValue[0];
                    var filterValue = nameValue[1];
                    filteredResults = results.filter(function (item) {
                        var propertyValue = String(item[filterProperty]);
                        return (_this.isSet(propertyValue) && propertyValue.startsWith(filterValue));
                    });
                }
            }
            var sortedResults = filteredResults;
            if (this.isSet(params.sortBy)) {
                sortedResults = filteredResults.sort(function (a, b) {
                    var propertyValueA = a[params.sortBy];
                    var propertyValueB = b[params.sortBy];
                    if (propertyValueA < propertyValueB) {
                        return -1;
                    }
                    else if (propertyValueA > propertyValueB) {
                        return 1;
                    }
                    else {
                        return 0;
                    }
                });
                if (params.sortDir == "DESC") {
                    sortedResults = sortedResults.reverse();
                }
            }
            var page = results;
            if (this.isSet(params.skip) || this.isSet(params.take)) {
                offset = Math.min(this.isSet(params.skip) ? params.skip : 0, sortedResults.length - 1);
                var take = this.isSet(params.take) ? params.take : Number.MAX_VALUE;
                var end = Math.min(offset + take, sortedResults.length);
                page = sortedResults.slice(offset, end);
            }
            callback({
                totalItems: sortedResults.length,
                offset: offset,
                items: page
            });
        };
        ClientPagedDataSource.prototype.isSet = function (value) {
            return (typeof (value) != "undefined") && (value != null);
        };
        return ClientPagedDataSource;
    })();
    controls.ClientPagedDataSource = ClientPagedDataSource;
    var SimpleListDataSource = (function () {
        function SimpleListDataSource(listItems) {
            if (listItems === void 0) { listItems = null; }
            this.listItems = listItems || [];
        }
        SimpleListDataSource.prototype.getItems = function (filter, callback) {
            if (filter) {
                callback(this.listItems.filter(function (item) { return item.text.toLowerCase().startsWith(filter.toLowerCase()); }));
            }
            else {
                callback(this.listItems);
            }
        };
        return SimpleListDataSource;
    })();
    controls.SimpleListDataSource = SimpleListDataSource;
    var ServerListDataSource = (function () {
        function ServerListDataSource(getListItems) {
            this.listItems = null;
            this.getListItems = getListItems;
        }
        ServerListDataSource.prototype.getItems = function (filter, callback) {
            var _this = this;
            if (this.listItems) {
                this.filterItems(this.listItems, filter, callback);
            }
            else {
                this.getListItems(function (items) {
                    _this.listItems = items;
                    _this.filterItems(_this.listItems, filter, callback);
                });
            }
        };
        ServerListDataSource.prototype.filterItems = function (listItems, filter, callback) {
            if (filter) {
                callback(listItems.filter(function (item) { return item && item.text.toLowerCase().startsWith(filter.toLowerCase()); }));
            }
            else {
                callback(listItems.filter(function (item) { return item != null; }));
            }
        };
        return ServerListDataSource;
    })();
    controls.ServerListDataSource = ServerListDataSource;
})(controls || (controls = {}));
