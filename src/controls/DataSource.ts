module controls
{
    import StdParams = catdv.StdParams;
    import PartialResultSet = catdv.PartialResultSet;

    export interface PagedDataSource
    {
        getData(params: StdParams, callback: (PartialResultSet) => void);
    }

    export class ServerPagedDataSource implements PagedDataSource
    {
        private getPagedData: (params: StdParams, callback: (PartialResultSet) => void) => void;

        constructor(getPagedData: (params: StdParams, callback: (PartialResultSet) => void) => void)
        {
            this.getPagedData = getPagedData;
        }

        public getData(params: StdParams, callback: (PartialResultSet) => void)
        {
            this.getPagedData(params, callback);
        }
    }

    export class ClientPagedDataSource implements PagedDataSource
    {
        private resultCache: any[];
        private getServerData: (callback: (Array) => void) => void;

        constructor(getData: (callback: (Array) => void) => void)
        {
            this.getServerData = getData;
        }

        public getData(params: StdParams, callback: (PartialResultSet) => void)
        {
            var useCache = this.isSet(params.useCache) ? params.useCache : ((params.skip || 0) != 0)

            if (useCache && (this.resultCache != null))
            {
                this.processResults(this.resultCache, params, callback)
            }
            else
            {
                this.getServerData((results: any[]) =>
                {
                    this.resultCache = results;
                    this.processResults(results, params, callback);
                });
            }
        }

        private processResults(results: any[], params: StdParams, callback: (PartialResultSet) => void)
        {
            var offset = 0;

            var filteredResults = results;
            if (this.isSet(params.filter))
            {
                var nameValue = params.filter.split("=");
                if (nameValue.length == 2)
                {
                    var filterProperty = nameValue[0];
                    var filterValue = nameValue[1];

                    filteredResults = results.filter((item) =>
                    {
                        var propertyValue = String(item[filterProperty]);
                        return (this.isSet(propertyValue) && propertyValue.startsWith(filterValue));
                    });
                }
            }

            var sortedResults = filteredResults;
            if (this.isSet(params.sortBy))
            {
                sortedResults = filteredResults.sort((a, b) =>
                {
                    var propertyValueA: any = a[params.sortBy];
                    var propertyValueB: any = b[params.sortBy];

                    if (propertyValueA < propertyValueB)
                    {
                        return -1;
                    }
                    else if (propertyValueA > propertyValueB)
                    {
                        return 1;
                    }
                    else
                    {
                        return 0;
                    }
                });
                if (params.sortDir == "DESC")
                {
                    sortedResults = sortedResults.reverse();
                }
            }

            var page = results;
            if (this.isSet(params.skip) || this.isSet(params.take))
            {
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
        }

        private isSet(value): boolean
        {
            return (typeof (value) != "undefined") && (value != null);
        }
    }

    export interface ListDataSource
    {
        getItems(filter: string, callback: (items: ListItem[]) => void);
    }

    export class SimpleListDataSource implements ListDataSource
    {
        private listItems: ListItem[];

        constructor(listItems: ListItem[]= null)
        {
            this.listItems = listItems || [];
        }

        public getItems(filter: string, callback: (items: ListItem[]) => void)
        {
            if (filter)
            {
                callback(this.listItems.filter((item) => item.text.toLowerCase().startsWith(filter.toLowerCase())));
            }
            else
            {
                callback(this.listItems);
            }
        }
    }

    export interface ListItemArray
    {
        (items: ListItem[]): void;
    }

    export class ServerListDataSource implements ListDataSource
    {
        private listItems: ListItem[] = null;
        private getListItems: (callback: ListItemArray) => void;

        constructor(getListItems: (callback: ListItemArray) => void)
        {
            this.getListItems = getListItems;
        }

        public getItems(filter: string, callback: (listItems: ListItem[]) => void)
        {
            if (this.listItems)
            {
                this.filterItems(this.listItems, filter, callback);
            }
            else
            {
                this.getListItems((items: ListItem[]) =>
                {
                    this.listItems = items;
                    this.filterItems(this.listItems, filter, callback);
                });
            }
        }

        private filterItems(listItems: ListItem[], filter: string, callback: (items: ListItem[]) => void)
        {
            if (filter)
            {
                callback(listItems.filter((item) => item && item.text.toLowerCase().startsWith(filter.toLowerCase())));
            }
            else
            {
                callback(listItems.filter((item) => item != null));
            }
        }
    }

}