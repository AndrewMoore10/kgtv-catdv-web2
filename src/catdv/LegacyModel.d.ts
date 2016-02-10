declare module catdv
{

    export interface UserFieldDefinition
    {
        name?: string;
        label?: string;
        type?: string;
        isEditable?: boolean;
        values?: string[];
    }

    export interface UserFieldDefinitionSet
    {
        settingsId: number;
        settingsSeqNum: number;
        userFields: UserFieldDefinition[];
    }

    export interface LegacyPanelField
    {
        name?: string;
        readOnly?: boolean;
        hideIfBlank?: boolean;
        twoCols?: boolean;
        wrap?: boolean;
    }

    export enum EPanelType
    {
        PANEL_TYPE_ATTRIBUTES = 0,    // normal panel displaying a list of specific attributes
        PANEL_TYPE_EVENTMARKERS = 1,  // special panel that displays timecode event markers
        PANEL_TYPE_METADATA = 2, // special panel that displays all metadata fields
        // Internal type - not used by CatDV
        PANEL_TYPE_USERFIELDS = 3 // special panel that displays all user fields
    }

    export interface LegacyPanelDefinition 
    {
        name?: string;
        type?: number;
        isVisible?: boolean;
        fields?: LegacyPanelField[];
    }

    export interface LegacyPanelDefinitionSet
    {
        settingsId?: number;
        fieldSetName?: string;
        settingsSeqNum?: number;
        panelDefinitions?: LegacyPanelDefinition[]
    }
}