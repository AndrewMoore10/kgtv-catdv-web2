module logic
{
    import Clip = catdv.Clip;
    import FieldDefinition = catdv.FieldDefinition;
    import DateUtil = catdv.DateUtil;
    import TimecodeUtil = catdv.TimecodeUtil;


    export interface FieldAccessor
    {
        getValue(clip: Clip): any;
        setValue(clip: Clip, value: any);
    }

    class StandardFieldAccessor implements FieldAccessor
    {
        private fieldDef: FieldDefinition;

        constructor(fieldDef: FieldDefinition)
        {
            this.fieldDef = fieldDef;
        }

        public getValue(clip: any): any
        {
            var containerObject = this.getContainerObject(clip);
            var value = (containerObject != null) ? containerObject[this.fieldDef.identifier] : "Not supported";
            if (value)
            {
                if (this.fieldDef.isMultiValue)
                {
                    if (value instanceof Array)
                    {
                        return value;
                    }
                    else
                    {
                        return String(value).split("\n");
                    }
                }
                else if ((this.fieldDef.fieldType == "date") || (this.fieldDef.fieldType == "datetime") || (this.fieldDef.fieldType == "time"))
                {
                    // Built-in fields store dates/time as milliseconds, whereas user fields store them as strings
                    if (this.fieldDef.isBuiltin)
                    {
                        return new Date(Number(value));
                    }
                    else
                    {
                        return DateUtil.parse(String(value));
                    }
                }
                else
                {
                    return value;
                }
            }
            else
            {
                return this.fieldDef.isMultiValue ? [] : "";
            }
        }

        public setValue(clip: Clip, value: any)
        {
            var containerObject = this.getContainerObject(clip);
            if (containerObject != null)
            {
                if (typeof value != 'undefined')
                {
                    if (value != null)
                    {
                        if (this.fieldDef.isMultiValue)
                        {
                            if (value instanceof Array)
                            {
                                // So code works with 6.9 and 7 send multi-value values back to server as newline separated
                                // string. Server 7 will convert to array server-side.
                                value = (<Array<any>>value).join("\n");
                            }
                        }
                        else if ((this.fieldDef.fieldType == "date") || (this.fieldDef.fieldType == "datetime") || (this.fieldDef.fieldType == "time"))
                        {
                            // Built-in fields sotre dates/time as milliseconds, whereas user fields store them as strings
                            if (this.fieldDef.isBuiltin)
                            {
                                value = (<Date>value).getTime();
                            }
                            else
                            {
                                value = DateUtil.format(<Date>value, DateUtil.ISO_DATETIME_FORMAT);
                            }
                        }
                    }
                    containerObject[this.fieldDef.identifier] = value;
                }
            }
        }

        private getContainerObject(clip: Clip): any
        {
            switch (this.fieldDef.memberOf)
            {
                case "clip":
                    if (this.fieldDef.isBuiltin)
                    {
                        return clip;
                    }
                    else
                    {
                        if (!clip.userFields)
                        {
                            clip.userFields = {};
                        }
                        return clip.userFields;
                    }

                case "media":
                    if (!clip.media)
                    {
                        clip.media = {};
                    }
                    if (this.fieldDef.isBuiltin)
                    {
                        return clip.media;
                    }
                    else
                    {
                        if (!clip.media.metadata)
                        {
                            clip.media.metadata = {};
                        }
                        return clip.media.metadata;
                    }

                case "importSource":
                    if (!clip.importSource)
                    {
                        clip.importSource = {};
                    }
                    if (this.fieldDef.isBuiltin)
                    {
                        return clip.importSource;
                    }
                    else
                    {
                        if (!clip.importSource.metadata)
                        {
                            clip.importSource.metadata = {};
                        }
                        return clip.importSource.metadata;
                    }

                default:
                    return null;

            }
        }
    }

    class MediaPathAccessor implements FieldAccessor
    {
        private fieldDef: FieldDefinition;

        constructor(fieldDef: FieldDefinition)
        {
            this.fieldDef = fieldDef;
        }

        public getValue(clip: Clip): any
        {
            var link: { path?: string; downloadUrl?: string } = {};

            if (this.fieldDef.ID == "MF") // Media Path
            {
                link.path = clip.media ? clip.media.filePath : null;
                link.downloadUrl = ClipManager.getDownloadUrl(clip, true, false);
            }
            else if (this.fieldDef.ID == "PF") // Proxy Path
            {
                link.path = clip.media ? clip.media.proxyPath : null;
                link.downloadUrl = ClipManager.getDownloadUrl(clip, false, true);
            }
            return link;
        }

        public setValue(clip: Clip, value: any)
        {
            /* Read only */
        }
    }

    class TimecodeFieldAccessor extends StandardFieldAccessor
    {
        constructor(fieldDef: FieldDefinition)
        {
            super(fieldDef);
        }

        public getValue(clip: Clip): any
        {
            var timecode = super.getValue(clip);
            return timecode.txt || TimecodeUtil.formatTimecode(timecode);
        }

        public setValue(clip: Clip, value: any)
        {
            super.setValue(clip, value ? TimecodeUtil.parseTimecode(value, clip["in"].fmt) : null);
        }
    }

    // Custom Bindings for calculated fields
    class CustomAccessor implements FieldAccessor
    {
        private fieldDef: FieldDefinition;
        private getter: (clip: Clip) => any;

        constructor(fieldDef: FieldDefinition, getter: (clip: Clip) => any)
        {
            this.fieldDef = fieldDef;
            this.getter = getter;
        }

        public getValue(clip: Clip): any
        {
            return this.getter(clip);
        }

        public setValue(clip: Clip, value: any)
        {
            /* Read only */
        }
    }

    export class AccessorFactory
    {
        public static createAccessor(fieldDef: FieldDefinition): FieldAccessor
        {
            switch (fieldDef.ID)
            {
                case "IO":
                    return new CustomAccessor(fieldDef, (clip: Clip) =>
                    {
                        return TimecodeUtil.formatTimecode(clip["in"]) + " - " + (clip.out ? TimecodeUtil.formatTimecode(clip.out) : "--:--:--:--");
                    });
                case "IO2":
                    return new CustomAccessor(fieldDef, (clip: Clip) =>
                    {
                        return TimecodeUtil.formatTimecode(clip.in2) + " - " + (clip.out2 ? TimecodeUtil.formatTimecode(clip.out2) : "--:--:--:--");
                    });
                case "CAT":
                    return new CustomAccessor(fieldDef, (clip: Clip) =>
                    {
                        return clip.catalogName;
                    });
                case "CGRP":
                    return new CustomAccessor(fieldDef, (clip: Clip) =>
                    {
                        return clip.groupName;
                    });
                case "SM": // Source media file name
                    return new CustomAccessor(fieldDef, (clip: Clip) =>
                    {
                        if (!clip.media || !clip.media.filePath) return null;
                        var lastSeparator = Math.max(clip.media.filePath.lastIndexOf("/"), clip.media.filePath.lastIndexOf("\\"));
                        return (lastSeparator != -1) ? clip.media.filePath.substring(lastSeparator + 1) : clip.media.filePath;
                    });
                case "FLD": // Source media file location (full path of parent folder)
                    return new CustomAccessor(fieldDef, (clip: Clip) =>
                    {
                        if (!clip.media || !clip.media.filePath) return null;
                        var lastSeparator = Math.max(clip.media.filePath.lastIndexOf("/"), clip.media.filePath.lastIndexOf("\\"));
                        return (lastSeparator != -1) ? clip.media.filePath.substring(0, lastSeparator) : "";
                    });
                case "MF":
                case "PF":
                    return new MediaPathAccessor(fieldDef);
                default:
                    if (fieldDef.fieldType == "timecode")
                    {
                        return new TimecodeFieldAccessor(fieldDef);
                    }
                    else
                    {
                        return new StandardFieldAccessor(fieldDef);
                    }
            }
        }
    }
}