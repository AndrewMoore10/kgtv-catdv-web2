var logic;
(function (logic) {
    var $catdv = catdv.RestApi;
    var Platform = util.Platform;
    // Server 6.9 implementation of Settings API, which maps returned values into Server 7.0-style representation so rest of 
    // application is identical across servers
    var ServerSettings = (function () {
        function ServerSettings() {
        }
        ServerSettings.load = function (callback) {
            $catdv.getServerProperties([
                "catdv.webDownloadOriginals",
                "catdv.webDownloadProxies",
                "catdv.webUploads",
                "catdv.edition",
                "web.player",
                "webclient.searchGroup",
                "builtin.dateformat"
            ], function (propertyValues) {
                ServerSettings.canDownloadOriginals = (propertyValues[0] && (propertyValues[0] == "true"));
                ServerSettings.canDownloadsProxies = (propertyValues[1] && (propertyValues[1] == "true"));
                ServerSettings.canUpload = (propertyValues[2] && (propertyValues[2] == "true"));
                ServerSettings.isEnterpriseServer = (propertyValues[3] == "enterprise");
                ServerSettings.useQuickTime = (propertyValues[4] && (propertyValues[4].toLowerCase() == "quicktime"));
                ServerSettings.searchGroup = propertyValues[5];
                if ((propertyValues[6] != null) && (propertyValues[6] !== "")) {
                    var dateTimeFmt = propertyValues[6];
                    ServerSettings.dateTimeFormat = dateTimeFmt;
                    var timeStart = dateTimeFmt.toLowerCase().indexOf("h");
                    ServerSettings.dateFormat = dateTimeFmt.substring(0, timeStart).trim();
                    ServerSettings.timeFormat = dateTimeFmt.substring(timeStart).trim();
                }
                // Always use QuickTime if running on older IEs or Firefox
                if (Platform.isFirefox() || Platform.isOldIE()) {
                    ServerSettings.useQuickTime = true;
                }
                callback();
            });
        };
        ServerSettings.canDownloadOriginals = false;
        ServerSettings.canDownloadsProxies = false;
        ServerSettings.canUpload = false;
        ServerSettings.isEnterpriseServer = false;
        ServerSettings.useQuickTime = false;
        ServerSettings.dateTimeFormat = "YYYY-MM-DD HH:mm:ss";
        ServerSettings.dateFormat = "YYYY-MM-DD";
        ServerSettings.timeFormat = "HH:mm:ss";
        ServerSettings.searchGroup = null;
        return ServerSettings;
    })();
    logic.ServerSettings = ServerSettings;
    var PanelSettingsManager = (function () {
        function PanelSettingsManager() {
        }
        PanelSettingsManager.getPanelDefinitions = function (groupID, callback) {
            if (groupID == -1) {
                callback([]);
                return;
            }
            FieldSettingsManager.getUserFieldDefinitions(groupID, function (fieldDefs, userFieldLookup) {
                var fieldDefinitionFactory = new FieldDefinitionFactory(userFieldLookup);
                $catdv.getPanelDefinitions(groupID, function (panelDefSet) {
                    // Convert 6.9 LegacyPanelDefinitions to 7.0 PanelDefinitions
                    var panels = [];
                    var statusFieldDef = null;
                    if (panelDefSet && panelDefSet.panelDefinitions) {
                        panelDefSet.panelDefinitions.forEach(function (legacyPanelDefinition) {
                            if (legacyPanelDefinition.isVisible && legacyPanelDefinition.fields) {
                                var panel = {
                                    name: legacyPanelDefinition.name,
                                    description: legacyPanelDefinition.name,
                                    type: "normal",
                                    options: null,
                                    fields: []
                                };
                                if (legacyPanelDefinition.fields) {
                                    legacyPanelDefinition.fields.forEach(function (legacyPanelField) {
                                        var fieldDefinition = fieldDefinitionFactory.getFieldDefinition(legacyPanelField.name);
                                        panel.fields.push({
                                            fieldDefID: legacyPanelField.name,
                                            fieldDefinition: fieldDefinition,
                                            readOnly: false,
                                            hideIfBlank: legacyPanelField.hideIfBlank,
                                            spanTwoColumns: legacyPanelField.twoCols,
                                            multiline: legacyPanelField.wrap,
                                        });
                                        if (fieldDefinition && (fieldDefinition.ID == "STS")) {
                                            statusFieldDef = fieldDefinition;
                                        }
                                    });
                                }
                                panels.push(panel);
                            }
                        });
                    }
                    if (statusFieldDef != null) {
                        $catdv.getFieldValues(groupID, "STS", function (values) {
                            statusFieldDef.values = values;
                            callback(panels);
                        });
                    }
                    else {
                        callback(panels);
                    }
                });
            });
        };
        return PanelSettingsManager;
    })();
    logic.PanelSettingsManager = PanelSettingsManager;
    var FieldDefinitionFactory = (function () {
        function FieldDefinitionFactory(userFieldLookup) {
            this.userFieldLookup = userFieldLookup;
        }
        FieldDefinitionFactory.prototype.getFieldDefinition = function (attributeID) {
            if (attributeID.startsWith("U")) {
                return this.userFieldLookup[attributeID];
            }
            else if (attributeID.startsWith("@")) {
                var metadataFieldID = attributeID.substring(1);
                var metadataField = {
                    ID: metadataFieldID,
                    fieldType: "text",
                    memberOf: "media",
                    identifier: metadataFieldID,
                    name: metadataFieldID,
                    description: metadataFieldID,
                    isBuiltin: false,
                    canQuery: false,
                    isEditable: false,
                    isMandatory: false,
                    isMultiValue: false,
                    isList: false,
                    values: null,
                };
                return metadataField;
            }
            else {
                return logic.BuiltInFields[attributeID];
            }
        };
        return FieldDefinitionFactory;
    })();
    var ViewSettingsManager = (function () {
        function ViewSettingsManager() {
        }
        // Requires Server 7 functionality so just return nulls
        ViewSettingsManager.getViewDefinitions = function (callback) {
            callback({ concise: null, normal: null, full: null });
        };
        return ViewSettingsManager;
    })();
    logic.ViewSettingsManager = ViewSettingsManager;
    var FieldSettingsManager = (function () {
        function FieldSettingsManager() {
        }
        FieldSettingsManager.getQueryFieldDefinitions = function (callback) {
            // IE8 tolerant implementation as getOwnPropertyNames() and keys() not implemented
            var builtInFieldIDs = [];
            for (var fieldID in logic.BuiltInFields) {
                builtInFieldIDs.push(fieldID);
            }
            var queryFieldDefs = builtInFieldIDs.map(function (fieldDefinitionID) { return logic.BuiltInFields[fieldDefinitionID]; }).filter(function (fieldDefinition) { return fieldDefinition.canQuery; }).sort(function (a, b) { return a.name.compare(b.name); });
            if (ServerSettings.isEnterpriseServer) {
                $catdv.getGroups(function (groups) {
                    var searchGroup = ServerSettings.searchGroup ? groups.find(function (g) { return g.name == ServerSettings.searchGroup; }) : null;
                    if (searchGroup) {
                        FieldSettingsManager.searchGroupID = searchGroup.ID;
                        FieldSettingsManager.getUserFieldDefinitions(searchGroup.ID, function (userFieldDefs, userFieldLookup) {
                            queryFieldDefs = queryFieldDefs.concat(userFieldDefs);
                            callback(queryFieldDefs.filter(function (fieldDef) { return !fieldDef.name.startsWith("User "); }).sort(function (a, b) { return a.name.compare(b.name); }));
                        });
                    }
                    else {
                        callback(queryFieldDefs);
                    }
                });
            }
            else {
                callback(queryFieldDefs);
            }
        };
        FieldSettingsManager.getUserFieldDefinitions = function (groupID, callback) {
            if (groupID == -1) {
                callback([], {});
                return;
            }
            var userFieldDefinitions = FieldSettingsManager.userFieldDefinitionsByGroupID[groupID];
            var userFieldLookup = FieldSettingsManager.fieldDefLookupByGroupID[groupID];
            if ((userFieldDefinitions != null) && (userFieldLookup != null)) {
                callback(userFieldDefinitions, userFieldLookup);
            }
            else {
                $catdv.getUserFieldDefs(groupID, function (userFieldDefinitionSet) {
                    // Convert 6.9 UserFieldDefinitions to 7.0 FieldDefinitions
                    userFieldDefinitions = [];
                    userFieldDefinitionSet.userFields.forEach(function (legacyUserField) {
                        var fieldType = legacyUserField.type.toLowerCase().replaceAll("_", "-").replace("grouping", "picklist");
                        userFieldDefinitions.push({
                            ID: legacyUserField.name,
                            fieldType: fieldType,
                            memberOf: "clip",
                            identifier: legacyUserField.name,
                            name: legacyUserField.label,
                            description: "[" + legacyUserField.name + "] - " + legacyUserField.name,
                            isBuiltin: false,
                            canQuery: true,
                            isEditable: legacyUserField.isEditable,
                            isMandatory: false,
                            isMultiValue: fieldType.contains("multi"),
                            isList: fieldType.contains("multi") || fieldType.contains("picklist") || fieldType.contains("hiearchy"),
                            values: legacyUserField.values,
                        });
                    });
                    userFieldLookup = {};
                    userFieldDefinitions.forEach(function (fieldDefinition) {
                        userFieldLookup[fieldDefinition.identifier] = fieldDefinition;
                    });
                    FieldSettingsManager.userFieldDefinitionsByGroupID[groupID] = userFieldDefinitions;
                    FieldSettingsManager.fieldDefLookupByGroupID[groupID] = userFieldLookup;
                    callback(userFieldDefinitions, userFieldLookup);
                });
            }
        };
        FieldSettingsManager.getUniqueFieldValues = function (fieldDef, callback) {
            $catdv.getFieldValues(-1, fieldDef.ID, function (values) {
                callback(values != null ? values.filter(function (value) { return value != null; }) : []);
            });
        };
        FieldSettingsManager.getFieldValues = function (fieldDef, callback) {
            $catdv.getFieldValues(FieldSettingsManager.searchGroupID, fieldDef.ID, function (values) {
                callback(values != null ? values.filter(function (value) { return value != null; }) : []);
            });
        };
        FieldSettingsManager.userFieldDefinitionsByGroupID = {};
        FieldSettingsManager.fieldDefLookupByGroupID = {};
        FieldSettingsManager.searchGroupID = -1;
        return FieldSettingsManager;
    })();
    logic.FieldSettingsManager = FieldSettingsManager;
})(logic || (logic = {}));
