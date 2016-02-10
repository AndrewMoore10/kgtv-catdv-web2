declare var CATDV_API_URL : string;

module catdv
{
    export interface Reply
    {
        status: string;
        errorMessage: string;
        data: any;
    }

    export interface PartialResultSet<T>
    {
        totalItems: number;
        offset: number;
        items: T[];
        echo?: string;
    }

    export interface StdParams
    {
        filter?: string;
        skip?: number;
        take?: number;
        useCache?: boolean;
        include?: string;
        sortBy?: string;
        sortDir?: string
    }
    
    export interface successCallback<T>
    {
        (data: T): void; 
    }

    export interface failureCallback
    {
        (status: String, error: String, data: any): void;
    }

    export class _RestApi
    {
         private catdv_login_handler: failureCallback;

        constructor()
        {
                }

        public getApiUrl(path: string): string
        {
            var apiUrl = ((typeof(CATDV_API_URL) != "undefined") && (CATDV_API_URL != null)) ? CATDV_API_URL : "/catdv-web2/api";
            return  apiUrl + "/5/" + path;
        }

        public registerLogInHandler(login_handler: () => void)
        {
            this.catdv_login_handler = login_handler;
        }

        public getSessionKey(success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_get("session/key", {}, success_callback, failure_callback);
        }

        public getSession(success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_get("session", {}, success_callback, failure_callback);
        }

        public login(username: string, encryptedPassword: string, success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_call("POST", "session",
                {
                    username: username,
                    encryptedPassword: encryptedPassword
                }, success_callback, failure_callback);
        }

        public logout(success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_call('DELETE', "session", {}, success_callback, failure_callback);
        }

        public getServerProperty(propertyName : string, success_callback: successCallback<string>, failure_callback?: failureCallback)
        {
             this.api_get("info/properties/" + propertyName, {}, success_callback, failure_callback);
        }

        public getServerProperties(propertyNames : string[], success_callback: successCallback<string[]>, failure_callback?: failureCallback)
        {
             this.api_get("info/properties/[" + propertyNames.join(",") + "]", {}, success_callback, failure_callback);
        }

        public addToBasket(clipIds: number[], success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_call("POST", "basket", { clipIds: clipIds }, success_callback, failure_callback);
        }

        public removeFromBasket(clipIds: number[], success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_call("DELETE", "basket/[" + clipIds.join() + "]", {}, success_callback, failure_callback);
        }

        public getBasketItems(success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_get("basket", {}, success_callback, failure_callback);
        }

        public getNumBasketItems(success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_get("basket?count=true", {}, success_callback, failure_callback);
        }

        public isItemInBasket(clipId: number, success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_get("basket?clipId=" + clipId + "&count=true", {}, function(count) { success_callback(count > 0); }, failure_callback);
        }

        public getBasketActions(success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_get("basket/actions", {}, success_callback, failure_callback);
        }

        public performBasketAction(actionId: number, success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_call("POST", "basket/actions/" + actionId, {}, success_callback, failure_callback);
        }

        public getCatalogs(success_callback: successCallback<Catalog[]>, failure_callback?: failureCallback)
        {
            this.api_get("catalogs", null, success_callback, failure_callback);
        }

        public getClips(params : StdParams, success_callback: successCallback<PartialResultSet<Clip>>, failure_callback?: failureCallback)
        {
            this.api_get("clips", params, success_callback, failure_callback);
        }

        public exportClipsAsFcpXml(query, success_callback: successCallback<string>, failure_callback?: failureCallback)
        {
            this.api_get("clips", $.extend({ "fmt": "fcpxml" }, query), success_callback, failure_callback);
        }

        public getClip(clipId: number, success_callback: successCallback<Clip>, failure_callback?: failureCallback)
        {
            this.api_get("clips/" + clipId, { include: "proxyPath" }, success_callback, failure_callback);
        }

        public saveClip(clip: any, success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            if (!clip.ID)
            {
                this.api_call('POST', "clips", clip, success_callback, failure_callback);
            }
            else
            {
                this.api_call('PUT', "clips/" + clip.ID, clip, success_callback, failure_callback);
            }
        }

        public saveClips(clips : Clip[], success_callback: successCallback<number>, failure_callback?: failureCallback)
        {
            this.api_call('PUT', "clips", clips, success_callback, failure_callback);
        }

        public deleteClip(clipID: number, success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_call("DELETE", "clips/" + clipID, {}, success_callback, failure_callback);
        }

        public getFieldValues(groupID : number, field: string, success_callback: successCallback<string[]>, failure_callback?: failureCallback)
        {
            this.api_get("groups/" + groupID + "/settings/fields/" + field + "/values", {}, success_callback, failure_callback);
        }

        public getGroups(success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_get("groups", {}, success_callback, failure_callback);
        }
        
        public getUserFieldDefs(groupID: number, success_callback: successCallback<UserFieldDefinitionSet>, failure_callback?: failureCallback)
        {
            this.api_get("groups/" + groupID + "/settings/fields", {}, success_callback, failure_callback);
        }
 
        public getPanelDefinitions(groupID: number, success_callback: successCallback<LegacyPanelDefinition[]>, failure_callback?: failureCallback)
        {
            this.api_get("groups/" + groupID + "/settings/panels", { }, success_callback, failure_callback);
        }
        
        public getPanelFields(groupID: number, panelDefID: number, success_callback: successCallback<LegacyPanelField[]>, failure_callback?: failureCallback)
        {
            this.api_get("groups/" + groupID + "/settings/panels/" + panelDefID + "/fields", {}, success_callback, failure_callback);
        }

//        public getPicklist(fieldID: string, success_callback: successCallback<string[]>, failure_callback?: failureCallback)
//        {
//            this.api_get("fields/" + fieldID + "/list?include=values", {}, success_callback, failure_callback);
//        }

        public getSmartFolders(success_callback: successCallback<SmartFolder[]>, failure_callback?: failureCallback)
        {
            this.api_get("smartfolders", null, success_callback, failure_callback);
        }

        public saveSmartFolder(smartFolder: any, success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            if (!smartFolder.ID)
            {
                this.api_call('POST', "smartFolders", smartFolder, success_callback, failure_callback);
            }
            else
            {
                this.api_call('PUT', "smartFolders/" + smartFolder.ID, smartFolder, success_callback, failure_callback);
            }
        }

        public deleteSmartFolder(smartFolderID: number, success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_call("DELETE", "smartFolders/" + smartFolderID, {}, success_callback, failure_callback);
        }

        public setServerProperties(propertySet : any, success_callback: successCallback<Thumbnail[]>, failure_callback?: failureCallback)
        {
            this.api_call('PUT',"info/properties", propertySet, success_callback, failure_callback);
        }
        
        public getThumbnailsForMedia(mediaID : number, success_callback: successCallback<Thumbnail[]>, failure_callback?: failureCallback)
        {
            this.api_get("sourcemedia/" + mediaID + "/thumbnails", null, success_callback, failure_callback);
        }

        public initiateUpload(filename: string, fileSize: number, metadata: any, success_callback: successCallback<any>, failure_callback?: failureCallback)
        {
            this.api_call('POST', "uploads", { "filename": filename, "fileSize": fileSize, "metadata": metadata }, success_callback, failure_callback);
        }

        getServerCommands(success_callback: successCallback<ServerCommand[]>, failure_callback?: failureCallback)
        {
            this.api_get("commands", {}, success_callback, failure_callback);
        }

        public execServerCommand(commandID: number, commandParams: CommandParams, success_callback: successCallback<CommandResults>, failure_callback?: failureCallback)
        {
            var selector = commandID != null ? String(commandID) : "chained";
            this.api_call("POST", "commands/" + selector, commandParams, success_callback, failure_callback);
        }

        private api_get(path: string, data: any, success_callback: successCallback<any>, failure_callback?: failureCallback): void
        {
            try
            {
               $.ajax({
                    type: "GET",
                    url: this.getApiUrl(path), 
                    headers: {
                        "CatDV-Client" :"WC2"
                    },
                    data: data,
                    success: (reply) =>
                    {
                        this.handle_response(reply, success_callback, failure_callback);
                    },
                    error: (jqXHR: JQueryXHR, textStatus: string, errorThrown: string) => 
                    {
                        this.handle_failure(jqXHR, failure_callback);
                    }
                });
            }
            catch (e)
            {
                if (failure_callback != null)
                {
                    failure_callback("ERR", e, e);
                }
                else if ((e == "NoHost") && (this.catdv_login_handler != null))
                {
                    this.catdv_login_handler("AUTH", "Not Initialised", null);
                }
                else
                {
                    alert("EX:" + e + "\n[" + path + "]");
                }
            }
        }


        private api_call(method: string, path: string, data: any, success_callback: successCallback<any>, failure_callback?: failureCallback): void
        {
            try
            {
                $.ajax({
                    type: method,
                    url: this.getApiUrl(path), 
                    headers: {
                        "CatDV-Client" :"WC2"
                    },
                    contentType: "application/json; charset=UTF-8",
                    data: JSON.stringify(data),
                    success: (reply) =>
                    {
                        this.handle_response(reply, success_callback, failure_callback);
                    },
                    error: (jqXHR: JQueryXHR, textStatus: string, errorThrown: string) => 
                    {
                        this.handle_failure(jqXHR, failure_callback);
                    }
                });
            }
            catch (e)
            {
                if (failure_callback != null)
                {
                    failure_callback("ERR", e, e);
                }
                else if ((e == "NoHost") && (this.catdv_login_handler != null))
                {
                    this.catdv_login_handler("AUTH", "Not Initialised", null);
                }
                else
                {
                    alert("EX:" + e + "\n[" + path + "]");
                }
            }
        }

        private now(): number
        {
            return new Date().getTime();
        }

        private handle_response(reply: Reply, success_callback: successCallback<any>, failure_callback?: failureCallback): void
        {
            if ((typeof Document != "undefined") && reply instanceof Document)
            {
                // Handle raw XML response - used by FCP XML export
                success_callback((new XMLSerializer()).serializeToString(<Node>(<any>reply)));
            }
            else if (reply.status == "OK")
            {
                success_callback(reply.data);
            }
            else if ((reply.status == "AUTH") && (this.catdv_login_handler != null))
            {
                this.catdv_login_handler(reply.status, reply.errorMessage, reply.data);
            }
            else
            {
                if (failure_callback)
                {
                    failure_callback(reply.status, reply.errorMessage, reply.data);
                }
                else
                {
                    alert(reply.errorMessage);
                }
            }
        }

        private handle_failure(jqXHR: JQueryXHR, failure_callback: failureCallback)
        {
            // Ignore AJAX zero errors - they just indicate an interrrupted connection
            if (jqXHR.status != 0)
            {
                var errorMessage = "AJAX Error[" + jqXHR.status + "]:\n" + jqXHR.statusText;
                // parse the Apache error response to extract the underlying Java exception message
                var msg = jqXHR.responseText;
                var m = msg.indexOf("<b>message</b>");
                if (m != -1)
                {
                    var s = msg.indexOf("<u>", m);
                    if (s != -1)
                    {
                        var e = msg.indexOf("</u>", s);
                        if (e != -1)
                        {
                            errorMessage = msg.substring(s + 3, e);
                        }
                    }
                }
                if (failure_callback)
                {
                    failure_callback("ERR", errorMessage, jqXHR.status);
                }
                else if (jqXHR.status)
                {
                    alert(errorMessage);
                }
            }
        }
    }

    export var RestApi = new _RestApi();
}
