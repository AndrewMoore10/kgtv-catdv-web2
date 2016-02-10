var catdv;
(function (catdv) {
    var _RestApi = (function () {
        function _RestApi() {
        }
        _RestApi.prototype.getApiUrl = function (path) {
            var apiUrl = ((typeof (CATDV_API_URL) != "undefined") && (CATDV_API_URL != null)) ? CATDV_API_URL : "/catdv-web2/api";
            return apiUrl + "/5/" + path;
        };
        _RestApi.prototype.registerLogInHandler = function (login_handler) {
            this.catdv_login_handler = login_handler;
        };
        _RestApi.prototype.getSessionKey = function (success_callback, failure_callback) {
            this.api_get("session/key", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getSession = function (success_callback, failure_callback) {
            this.api_get("session", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.login = function (username, encryptedPassword, success_callback, failure_callback) {
            this.api_call("POST", "session", {
                username: username,
                encryptedPassword: encryptedPassword
            }, success_callback, failure_callback);
        };
        _RestApi.prototype.logout = function (success_callback, failure_callback) {
            this.api_call('DELETE', "session", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getServerProperty = function (propertyName, success_callback, failure_callback) {
            this.api_get("info/properties/" + propertyName, {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getServerProperties = function (propertyNames, success_callback, failure_callback) {
            this.api_get("info/properties/[" + propertyNames.join(",") + "]", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.addToBasket = function (clipIds, success_callback, failure_callback) {
            this.api_call("POST", "basket", { clipIds: clipIds }, success_callback, failure_callback);
        };
        _RestApi.prototype.removeFromBasket = function (clipIds, success_callback, failure_callback) {
            this.api_call("DELETE", "basket/[" + clipIds.join() + "]", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getBasketItems = function (success_callback, failure_callback) {
            this.api_get("basket", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getNumBasketItems = function (success_callback, failure_callback) {
            this.api_get("basket?count=true", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.isItemInBasket = function (clipId, success_callback, failure_callback) {
            this.api_get("basket?clipId=" + clipId + "&count=true", {}, function (count) {
                success_callback(count > 0);
            }, failure_callback);
        };
        _RestApi.prototype.getBasketActions = function (success_callback, failure_callback) {
            this.api_get("basket/actions", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.performBasketAction = function (actionId, success_callback, failure_callback) {
            this.api_call("POST", "basket/actions/" + actionId, {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getCatalogs = function (success_callback, failure_callback) {
            this.api_get("catalogs", null, success_callback, failure_callback);
        };
        _RestApi.prototype.getClips = function (params, success_callback, failure_callback) {
            this.api_get("clips", params, success_callback, failure_callback);
        };
        _RestApi.prototype.exportClipsAsFcpXml = function (query, success_callback, failure_callback) {
            this.api_get("clips", $.extend({ "fmt": "fcpxml" }, query), success_callback, failure_callback);
        };
        _RestApi.prototype.getClip = function (clipId, success_callback, failure_callback) {
            this.api_get("clips/" + clipId, { include: "proxyPath" }, success_callback, failure_callback);
        };
        _RestApi.prototype.saveClip = function (clip, success_callback, failure_callback) {
            if (!clip.ID) {
                this.api_call('POST', "clips", clip, success_callback, failure_callback);
            }
            else {
                this.api_call('PUT', "clips/" + clip.ID, clip, success_callback, failure_callback);
            }
        };
        _RestApi.prototype.saveClips = function (clips, success_callback, failure_callback) {
            this.api_call('PUT', "clips", clips, success_callback, failure_callback);
        };
        _RestApi.prototype.deleteClip = function (clipID, success_callback, failure_callback) {
            this.api_call("DELETE", "clips/" + clipID, {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getFieldValues = function (groupID, field, success_callback, failure_callback) {
            this.api_get("groups/" + groupID + "/settings/fields/" + field + "/values", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getGroups = function (success_callback, failure_callback) {
            this.api_get("groups", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getUserFieldDefs = function (groupID, success_callback, failure_callback) {
            this.api_get("groups/" + groupID + "/settings/fields", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getPanelDefinitions = function (groupID, success_callback, failure_callback) {
            this.api_get("groups/" + groupID + "/settings/panels", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.getPanelFields = function (groupID, panelDefID, success_callback, failure_callback) {
            this.api_get("groups/" + groupID + "/settings/panels/" + panelDefID + "/fields", {}, success_callback, failure_callback);
        };
        //        public getPicklist(fieldID: string, success_callback: successCallback<string[]>, failure_callback?: failureCallback)
        //        {
        //            this.api_get("fields/" + fieldID + "/list?include=values", {}, success_callback, failure_callback);
        //        }
        _RestApi.prototype.getSmartFolders = function (success_callback, failure_callback) {
            this.api_get("smartfolders", null, success_callback, failure_callback);
        };
        _RestApi.prototype.saveSmartFolder = function (smartFolder, success_callback, failure_callback) {
            if (!smartFolder.ID) {
                this.api_call('POST', "smartFolders", smartFolder, success_callback, failure_callback);
            }
            else {
                this.api_call('PUT', "smartFolders/" + smartFolder.ID, smartFolder, success_callback, failure_callback);
            }
        };
        _RestApi.prototype.deleteSmartFolder = function (smartFolderID, success_callback, failure_callback) {
            this.api_call("DELETE", "smartFolders/" + smartFolderID, {}, success_callback, failure_callback);
        };
        _RestApi.prototype.setServerProperties = function (propertySet, success_callback, failure_callback) {
            this.api_call('PUT', "info/properties", propertySet, success_callback, failure_callback);
        };
        _RestApi.prototype.getThumbnailsForMedia = function (mediaID, success_callback, failure_callback) {
            this.api_get("sourcemedia/" + mediaID + "/thumbnails", null, success_callback, failure_callback);
        };
        _RestApi.prototype.initiateUpload = function (filename, fileSize, metadata, success_callback, failure_callback) {
            this.api_call('POST', "uploads", { "filename": filename, "fileSize": fileSize, "metadata": metadata }, success_callback, failure_callback);
        };
        _RestApi.prototype.getServerCommands = function (success_callback, failure_callback) {
            this.api_get("commands", {}, success_callback, failure_callback);
        };
        _RestApi.prototype.execServerCommand = function (commandID, commandParams, success_callback, failure_callback) {
            var selector = commandID != null ? String(commandID) : "chained";
            this.api_call("POST", "commands/" + selector, commandParams, success_callback, failure_callback);
        };
        _RestApi.prototype.api_get = function (path, data, success_callback, failure_callback) {
            var _this = this;
            try {
                $.ajax({
                    type: "GET",
                    url: this.getApiUrl(path),
                    headers: {
                        "CatDV-Client": "WC2"
                    },
                    data: data,
                    success: function (reply) {
                        _this.handle_response(reply, success_callback, failure_callback);
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        _this.handle_failure(jqXHR, failure_callback);
                    }
                });
            }
            catch (e) {
                if (failure_callback != null) {
                    failure_callback("ERR", e, e);
                }
                else if ((e == "NoHost") && (this.catdv_login_handler != null)) {
                    this.catdv_login_handler("AUTH", "Not Initialised", null);
                }
                else {
                    alert("EX:" + e + "\n[" + path + "]");
                }
            }
        };
        _RestApi.prototype.api_call = function (method, path, data, success_callback, failure_callback) {
            var _this = this;
            try {
                $.ajax({
                    type: method,
                    url: this.getApiUrl(path),
                    headers: {
                        "CatDV-Client": "WC2"
                    },
                    contentType: "application/json; charset=UTF-8",
                    data: JSON.stringify(data),
                    success: function (reply) {
                        _this.handle_response(reply, success_callback, failure_callback);
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        _this.handle_failure(jqXHR, failure_callback);
                    }
                });
            }
            catch (e) {
                if (failure_callback != null) {
                    failure_callback("ERR", e, e);
                }
                else if ((e == "NoHost") && (this.catdv_login_handler != null)) {
                    this.catdv_login_handler("AUTH", "Not Initialised", null);
                }
                else {
                    alert("EX:" + e + "\n[" + path + "]");
                }
            }
        };
        _RestApi.prototype.now = function () {
            return new Date().getTime();
        };
        _RestApi.prototype.handle_response = function (reply, success_callback, failure_callback) {
            if ((typeof Document != "undefined") && reply instanceof Document) {
                // Handle raw XML response - used by FCP XML export
                success_callback((new XMLSerializer()).serializeToString(reply));
            }
            else if (reply.status == "OK") {
                success_callback(reply.data);
            }
            else if ((reply.status == "AUTH") && (this.catdv_login_handler != null)) {
                this.catdv_login_handler(reply.status, reply.errorMessage, reply.data);
            }
            else {
                if (failure_callback) {
                    failure_callback(reply.status, reply.errorMessage, reply.data);
                }
                else {
                    alert(reply.errorMessage);
                }
            }
        };
        _RestApi.prototype.handle_failure = function (jqXHR, failure_callback) {
            // Ignore AJAX zero errors - they just indicate an interrrupted connection
            if (jqXHR.status != 0) {
                var errorMessage = "AJAX Error[" + jqXHR.status + "]:\n" + jqXHR.statusText;
                // parse the Apache error response to extract the underlying Java exception message
                var msg = jqXHR.responseText;
                var m = msg.indexOf("<b>message</b>");
                if (m != -1) {
                    var s = msg.indexOf("<u>", m);
                    if (s != -1) {
                        var e = msg.indexOf("</u>", s);
                        if (e != -1) {
                            errorMessage = msg.substring(s + 3, e);
                        }
                    }
                }
                if (failure_callback) {
                    failure_callback("ERR", errorMessage, jqXHR.status);
                }
                else if (jqXHR.status) {
                    alert(errorMessage);
                }
            }
        };
        return _RestApi;
    })();
    catdv._RestApi = _RestApi;
    catdv.RestApi = new _RestApi();
})(catdv || (catdv = {}));
