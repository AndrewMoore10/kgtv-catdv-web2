module logic
{
    import $catdv = catdv.RestApi;
    import LegacyPanelDefinitionSet = catdv.LegacyPanelDefinitionSet;
    import FieldDefinition = catdv.FieldDefinition;
    import PanelDefinition = catdv.PanelDefinition;
    import ViewDefinition = catdv.ViewDefinition;
    import ViewField = catdv.ViewField;
    import Platform = util.Platform;

    // Server 6.9 implementation of Settings API, which maps returned values into Server 7.0-style representation so rest of 
    // application is identical across servers

    export class ServerSettings 
    {
        public static canDownloadOriginals: boolean = false;
        public static canDownloadsProxies: boolean = false;
        public static canUpload: boolean = false;
        public static isEnterpriseServer: boolean = false;
        public static useQuickTime: boolean = false;
        public static dateTimeFormat: string = "YYYY-MM-DD HH:mm:ss";
        public static dateFormat: string = "YYYY-MM-DD";
        public static timeFormat: string = "HH:mm:ss";
        public static searchGroup: string = null;

        public static load(callback: () => void)
        {
            $catdv.getServerProperties([
                "catdv.webDownloadOriginals",
                "catdv.webDownloadProxies",
                "catdv.webUploads",                
                "catdv.edition",
                "web.player",
                "webclient.searchGroup",
                "builtin.dateformat"]
                , (propertyValues: string[]) =>
                {
                    ServerSettings.canDownloadOriginals = (propertyValues[0] && (propertyValues[0] == "true"));
                    ServerSettings.canDownloadsProxies = (propertyValues[1] && (propertyValues[1] == "true"));
                    ServerSettings.canUpload = (propertyValues[2] && (propertyValues[2] == "true"));
                    ServerSettings.isEnterpriseServer = (propertyValues[3] == "enterprise");
                    ServerSettings.useQuickTime = (propertyValues[4] && (propertyValues[4].toLowerCase() == "quicktime"));
                    ServerSettings.searchGroup = propertyValues[5];
                    if ((propertyValues[6] != null) && (propertyValues[6] !== ""))
                    {
                        var dateTimeFmt = propertyValues[6];
                        ServerSettings.dateTimeFormat = dateTimeFmt;
                        var timeStart = dateTimeFmt.toLowerCase().indexOf("h");
                        ServerSettings.dateFormat = dateTimeFmt.substring(0, timeStart).trim();
                        ServerSettings.timeFormat = dateTimeFmt.substring(timeStart).trim();
                    }

                    // Always use QuickTime if running on older IEs or Firefox
                    if (Platform.isFirefox() || Platform.isOldIE())
                    {
                        ServerSettings.useQuickTime = true;
                    }

                    callback();
                });
        }
    }

    export class PanelSettingsManager 
    {
        public static getPanelDefinitions(groupID: number, callback: (panels: PanelDefinition[]) => void)
        {
            if (groupID == -1) 
            {
                callback([]);
                return;
            }

            FieldSettingsManager.getUserFieldDefinitions(groupID, (fieldDefs: FieldDefinition[], userFieldLookup: { [id: string]: FieldDefinition }) =>
            {
                var fieldDefinitionFactory = new FieldDefinitionFactory(userFieldLookup);

                $catdv.getPanelDefinitions(groupID, (panelDefSet: LegacyPanelDefinitionSet) =>
                {
                    // Convert 6.9 LegacyPanelDefinitions to 7.0 PanelDefinitions
                    var panels: PanelDefinition[] = [];
                    var statusFieldDef: FieldDefinition = null;

                    if (panelDefSet && panelDefSet.panelDefinitions)
                    {
                        panelDefSet.panelDefinitions.forEach((legacyPanelDefinition) =>
                        {
                            if (legacyPanelDefinition.isVisible && legacyPanelDefinition.fields)
                            {
                                var panel: PanelDefinition = {
                                    name: legacyPanelDefinition.name,
                                    description: legacyPanelDefinition.name,
                                    type: "normal",
                                    options: null,
                                    fields: []
                                };

                                if (legacyPanelDefinition.fields)
                                {
                                    legacyPanelDefinition.fields.forEach((legacyPanelField) =>
                                    {
                                        var fieldDefinition = fieldDefinitionFactory.getFieldDefinition(legacyPanelField.name);
                                        panel.fields.push({
                                            fieldDefID: legacyPanelField.name,
                                            fieldDefinition: fieldDefinition,
                                            readOnly: false,
                                            hideIfBlank: legacyPanelField.hideIfBlank,
                                            spanTwoColumns: legacyPanelField.twoCols,
                                            multiline: legacyPanelField.wrap,
                                        });

                                        if (fieldDefinition && (fieldDefinition.ID == "STS"))
                                        {
                                            statusFieldDef = fieldDefinition;
                                        }
                                    });
                                }

                                panels.push(panel);
                            }
                        });
                    }

                    if (statusFieldDef != null)
                    {
                        $catdv.getFieldValues(groupID, "STS", (values: string[]) =>
                        {
                            statusFieldDef.values = values;
                            callback(panels);
                        });
                    }
                    else
                    {
                        callback(panels);
                    }
                });
            });
        }
    }

    class FieldDefinitionFactory
    {
        private userFieldLookup: { [id: string]: FieldDefinition };

        constructor(userFieldLookup: { [id: string]: FieldDefinition })
        {
            this.userFieldLookup = userFieldLookup;
        }

        public getFieldDefinition(attributeID: string): FieldDefinition
        {
            if (attributeID.startsWith("U"))
            {
                return this.userFieldLookup[attributeID];
            }
            else if (attributeID.startsWith("@"))
            {
                var metadataFieldID = attributeID.substring(1);
                var metadataField: FieldDefinition = {
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
            else
            {
                return BuiltInFields[attributeID];
            }
        }
    }

    export interface ViewDefinitions
    {
        concise: ViewField[];
        normal: ViewField[];
        full: ViewField[];
    }

    export class ViewSettingsManager
    {
        // Requires Server 7 functionality so just return nulls
        public static getViewDefinitions(callback: (viewDefs: ViewDefinitions) => void)
        {
            callback({ concise: null, normal: null, full: null })
        }
    }

    export class FieldSettingsManager
    {
        private static userFieldDefinitionsByGroupID: { [groupID: number]: FieldDefinition[] } = {};
        private static fieldDefLookupByGroupID: { [groupID: string]: { [id: string]: FieldDefinition } } = {};
        private static searchGroupID = -1;

        public static getQueryFieldDefinitions(callback: (fieldDefs: FieldDefinition[]) => void)
        {
            // IE8 tolerant implementation as getOwnPropertyNames() and keys() not implemented
            var builtInFieldIDs: string[] = [];
            for (var fieldID in BuiltInFields)
            {
                builtInFieldIDs.push(fieldID);
            }

            var queryFieldDefs = builtInFieldIDs.map((fieldDefinitionID) => BuiltInFields[fieldDefinitionID])
                .filter((fieldDefinition) => fieldDefinition.canQuery)
                .sort((a, b) => a.name.compare(b.name));

            if (ServerSettings.isEnterpriseServer)
            {
                $catdv.getGroups((groups) =>
                {
                    var searchGroup = ServerSettings.searchGroup ? groups.find((g) => g.name == ServerSettings.searchGroup) : null;
                    if (searchGroup)
                    {
                        FieldSettingsManager.searchGroupID = searchGroup.ID;

                        FieldSettingsManager.getUserFieldDefinitions(searchGroup.ID, (userFieldDefs, userFieldLookup) =>
                        {
                            queryFieldDefs = queryFieldDefs.concat(userFieldDefs);
                            callback(queryFieldDefs.filter((fieldDef) => !fieldDef.name.startsWith("User ")).sort((a, b) => a.name.compare(b.name)));
                        });
                    }
                    else
                    {
                        callback(queryFieldDefs);
                    }
                });
            }
            else
            {
                callback(queryFieldDefs);
            }
        }

        public static getUserFieldDefinitions(groupID: number, callback: (fieldDefs: FieldDefinition[], userFieldLookup: { [id: string]: FieldDefinition }) => void)
        {
            if (groupID == -1)
            {
                callback([], {});
                return;
            }

            var userFieldDefinitions = FieldSettingsManager.userFieldDefinitionsByGroupID[groupID];
            var userFieldLookup = FieldSettingsManager.fieldDefLookupByGroupID[groupID];

            if ((userFieldDefinitions != null) && (userFieldLookup != null))
            {
                callback(userFieldDefinitions, userFieldLookup);
            }
            else
            {
                $catdv.getUserFieldDefs(groupID, (userFieldDefinitionSet) =>
                {
                    // Convert 6.9 UserFieldDefinitions to 7.0 FieldDefinitions
                    userFieldDefinitions = [];
                    userFieldDefinitionSet.userFields.forEach((legacyUserField) =>
                    {
                        var fieldType = legacyUserField.type.toLowerCase().replaceAll("_", "-").replace("grouping", "picklist")
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
                    userFieldDefinitions.forEach((fieldDefinition) =>
                    {
                        userFieldLookup[fieldDefinition.identifier] = fieldDefinition;
                    });


                    FieldSettingsManager.userFieldDefinitionsByGroupID[groupID] = userFieldDefinitions;
                    FieldSettingsManager.fieldDefLookupByGroupID[groupID] = userFieldLookup;

                    callback(userFieldDefinitions, userFieldLookup);
                });
            }
        }

        public static getUniqueFieldValues(fieldDef: FieldDefinition, callback: (values: string[]) => void)
        {
            $catdv.getFieldValues(-1, fieldDef.ID, (values: string[]) =>
            {
                callback(values != null ? values.filter((value) => value != null) : []);
            });
        }

        public static getFieldValues(fieldDef: FieldDefinition, callback: (values: string[]) => void)
        {
            $catdv.getFieldValues(FieldSettingsManager.searchGroupID, fieldDef.ID, (values: string[]) =>
            {
                callback(values != null ? values.filter((value) => value != null) : []);
            });
        }
    }
}