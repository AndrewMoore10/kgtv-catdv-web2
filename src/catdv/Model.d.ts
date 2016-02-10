declare module catdv
{
    export interface BaseDTO
    {
        ID?: number;
    }

    export interface EnumItem
    {
        ID: string;
        name: string;
    }

    export interface Catalog extends BaseDTO
    {
        userID?: number;
        userName?: string;
        groupID?: number;
        groupName?: string;
        name?: string;
        whoCreated?: string;
        whoSaved?: string;
        owner?: string;
        comment?: string;
        whenCreated?: number;
        whenExtended?: number;
        whenSaved?: number;
        whenPublished?: number;
        readOnly?: boolean;
        readProtected?: boolean;
        password?: number;
        version?: string;
    }

    export enum TimecodeFormat
    {
        WHOLE_SECONDS_FORMAT= 1,
        DECIMAL_FORMAT = 10,
        P15_FORMAT = 15,
        P24_NTSC_FORMAT = 2398,   // was P24_SLOW_FORMAT
        P24_FORMAT = 24,
        PAL_FORMAT = 25,
        NTSC_DF_FORMAT = 2997,   // was NTSC_DROPFRAME_FORMAT
        NTSC_NDF_FORMAT = 3000,   // was NONDROP_2997_FORMAT (29.97nd)
        NTSC_EXACT_FORMAT = 30,  // was NTSC_NONDROP_FORMAT (30.0)
        P50_FORMAT = 50,
        P60_NTSC_DF_FORMAT = 5994,    // was P60_SLOW_FORMAT
        P60_NTSC_NDF_FORMAT = 6000,   // was NONDROP_5994_FORMAT
        P60_FORMAT = 60,
        HUNDREDTHS_FORMAT = 100  // was HUNDRETHS_FORMAT
    }

    export interface Timecode
    {
        fmt: TimecodeFormat;
        secs: number;
        frm?: number;
        txt?: string;
    }

    export interface Clip extends BaseDTO
    {
        catalogID?: number;
        catalogName?: string;
        groupID?: number;
        groupName?: string;
        userID?: number;
        userName?: string;
        type?: string; // clip, subclip, metaclip, seq
        underlyingType?: string; // full type description
        name?: string;
        notes?: string;
        bigNotes?: string;
        tape?: string;
        status?: string;
        bin?: string;
        format?: string;
        fps?: number;
        in?: Timecode; //  start of clip 
        out?: Timecode; //  end of clip 
        duration?: Timecode; // Duration of clip as timecode 
        marked?: boolean;
        hidden?: boolean;
        orientation?: number;   // rotation of stills
        good?: string;
        rating?: number;
        posterID?: number;
        transition?: string;
        in2?: Timecode; //  start of selection within clip
        out2?: Timecode; //   end of selection within clip 
        duration2?: Timecode; // Duration of selection within clip as timecode 
        markers?: EventMarker[];
        importNotes?: string;
        seqItems?: SequenceItem[]; // if this clip is a sequence then this lists the sequences contents
        members?: Clip[]; // for metaclips - contains all the members clips
        clipref?: string;
        modifiedDate?: number;
        recordedDate?: number;
        gmtDate?: number;
        clockAdjust?: string;
        thumbnailIDs?: number[];
        sourceMediaID?: number;
        media?: SourceMedia;
        importSourceID?: number;
        importSource?: ImportSource;
        mediaStart?: Timecode; // start of source media 
        mediaEnd?: Timecode; //  end of source media
        userFields?: any; //  PropertyBag
        history?: ClipHistoryEntry[];
        isEditable?: boolean; // Calculated field based on currently logged in user's permissions
        tapeInfoRef?: string;
        tapeInfo?: TapeInfo;
    }

    export interface EventMarker
    {
        in?: Timecode;
        out?: Timecode;
        name?: string;
        category?: string;
        description?: string;
    }

    export interface SequenceItem extends BaseDTO
    {
        catalogID?: number;
        seqID?: number;
        seqIn?: Timecode;
        seqOut?: Timecode;
        clipID?: number;
        clipName?: string;
        clipTape?: string;
        clipIn?: Timecode;
        clipOut?: Timecode;
        clipMediaID?: number;
        track?: string; // V1, A1, A2 AV1 etc.
        mediaStart?: Timecode;
        mediaEnd?: Timecode;
        mediaAspectRatio?: number;
    }

    export interface SourceMedia extends BaseDTO
    {
        filePath?: string;
        fileSize?: number;
        tape?: string;
        videoFormat?: string;
        audioFormat?: string;
        tracks?: string;
        aspectRatio?: number;
        modifiedDate?: number;
        start?: Timecode;
        end?: Timecode;
        tcFmt?: number;
        importer?: string;
        still?: boolean;
        dataRate?: number;
        archiveStatus?: string;
        omfRef?: string;
        qttc?: number;
        proxyPath?: string;
        isMediaAvailable?: boolean;
        altPaths?: string[];
        metadata?: any;
    }

    export interface ImportSource extends BaseDTO
    {
        file?: string;
        modifiedDate?: number;
        size?: number;
        importedDate?: number;
        userData?: string;
        metadata?: any;
    }

    export interface ClipHistoryEntry
    {
        date?: number;
        user?: string;
        action?: string;
    }

    export interface TapeInfo
    {
        tapeName?: string;
        description?: string;
        notes?: string;
        location?: string;
        format?: string;
        history?: string;
        reelNumber?: string;
        videographer?: string;
        project?: string;
        status?: string;
        subject?: string;
        media?: string;
        loggedDate?: number;
        createdDate?: number;
        modifiedDate?: number;
    }

    export interface Thumbnail extends BaseDTO
    {
        time: number;
        orientation: number;
    }

    export interface QueryTerm
    {
        field?: string;
        op?: string;
        params?: string;
        logicalOR?: boolean;
        logicalNOT?: boolean;
        ignoreCase?: boolean;
    }

    export interface QueryDefinition
    {
        name?: string;
        terms?: QueryTerm[];
    }

    export interface SmartFolder extends BaseDTO
    {
        groupID?: number;
        groupName?: string;
        userID?: number;
        name?: string;
        notes?: string;
        modifiedDate?: number;
        query?: QueryDefinition;
    }

    export interface FieldDefinition
    {
        // ID is either FieldDefinition.ID or attributeID (e.g. NM1, STS etc.) for builtin fields
        ID?: string;
        fieldType?: string;
        memberOf?: string;

        // For built-in fields this is the name of the property of whatever object this field is a memberOf
        // For user-defined fields this is the key in the userFields/metadata object.
        // Value can be accessed in JavaScript by evaluating memberOf.identifier for built-ins or 
        // memberOf.userFields[identifier] where memberOf == 'clip' or memberOf.metadata[identifier] for other objects
        identifier?: string;

        // Human readable name
        name?: string;

        // Longer human-readable description of what is stored in this field
        description?: string;

        isBuiltin?: boolean;
        canQuery?: boolean;
        isSortable?: boolean;  // can this field be specified in sortBy argument to clip queries
        isCalculated?: boolean;

        isEditable?: boolean;
        isMandatory?: boolean;
        isMultiValue?: boolean;
        isList?: boolean;

        values?: string[];
        
        // Table column information - filled in in BuiltInFields.ts
        width?: number; // Width of the table column     
    }

    export interface Picklist extends BaseDTO
    {
        isExtensible?: boolean;
        isKeptSorted?: boolean;
        isLocked?: boolean;
        savesValues?: boolean;
        values?: string[];
    }

    export interface BaseViewDefinition extends BaseDTO
    {
        name?: string;
        description?: string;
        type?: string;
        options?: any;
        order?: number;
        visibility?: VisibilityRules;
    }

    export interface ViewDefinition extends BaseViewDefinition
    {
        viewSetID?: number;
        fields?: ViewField[];
    }

    export interface PanelDefinition extends BaseViewDefinition
    {
        panelSetID?: number;
        fields?: PanelField[];
    }

    export interface BaseViewField extends BaseDTO
    {
        viewDefID?: number;
        fieldDefID?: string;
        fieldDefinition?: FieldDefinition;
    }

    export interface ViewField extends BaseViewField
    {
    }

    export interface PanelField extends BaseViewField
    {
        readOnly?: boolean;
        hideIfBlank?: boolean;
        spanTwoColumns?: boolean;
        multiline?: boolean;
    }

    export interface VisibilityRules
    {
        visibleToGroups?: string[];
        hiddenFromGroups?: string[];
        visibleToRoles?: string[];
        hiddenFromRoles?: string[];
        visibleToClients?: string[];
        hiddenFromClients?: string[];
        notDisplayed?: boolean;
    }

    export interface CommandArgument
    {
        label?: string;
        type?: string; // one of "text", "radio", "list", "combo", etc.
        options?: string[];
        initialValue: string;
    }
    
    export interface ServerCommand 
    {
        id?: number;  // unique id of the command, assigned by server
        name?: string; // command name
        arguments: CommandArgument[]; // arguments that the command takes
        requiresClip: boolean; // does a clip need to be selected?
    }

    export interface CommandParams 
    {
        commandName?: string;
        clipIDs?: number[];
        arguments?: string[];
    }

    export interface CommandResults 
    {
        message: string;
        resultMode: number;
        clipIDs: number[];
        chainedCommand: ServerCommand;
    }

}