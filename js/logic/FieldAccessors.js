var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var logic;
(function (logic) {
    var DateUtil = catdv.DateUtil;
    var TimecodeUtil = catdv.TimecodeUtil;
    var StandardFieldAccessor = (function () {
        function StandardFieldAccessor(fieldDef) {
            this.fieldDef = fieldDef;
        }
        StandardFieldAccessor.prototype.getValue = function (clip) {
            var containerObject = this.getContainerObject(clip);
            var value = (containerObject != null) ? containerObject[this.fieldDef.identifier] : "Not supported";
            if (value) {
                if (this.fieldDef.isMultiValue) {
                    if (value instanceof Array) {
                        return value;
                    }
                    else {
                        return String(value).split("\n");
                    }
                }
                else if ((this.fieldDef.fieldType == "date") || (this.fieldDef.fieldType == "datetime") || (this.fieldDef.fieldType == "time")) {
                    // Built-in fields store dates/time as milliseconds, whereas user fields store them as strings
                    if (this.fieldDef.isBuiltin) {
                        return new Date(Number(value));
                    }
                    else {
                        return DateUtil.parse(String(value));
                    }
                }
                else {
                    return value;
                }
            }
            else {
                return this.fieldDef.isMultiValue ? [] : "";
            }
        };
        StandardFieldAccessor.prototype.setValue = function (clip, value) {
            var containerObject = this.getContainerObject(clip);
            if (containerObject != null) {
                if (typeof value != 'undefined') {
                    if (value != null) {
                        if (this.fieldDef.isMultiValue) {
                            if (value instanceof Array) {
                                // So code works with 6.9 and 7 send multi-value values back to server as newline separated
                                // string. Server 7 will convert to array server-side.
                                value = value.join("\n");
                            }
                        }
                        else if ((this.fieldDef.fieldType == "date") || (this.fieldDef.fieldType == "datetime") || (this.fieldDef.fieldType == "time")) {
                            // Built-in fields sotre dates/time as milliseconds, whereas user fields store them as strings
                            if (this.fieldDef.isBuiltin) {
                                value = value.getTime();
                            }
                            else {
                                value = DateUtil.format(value, DateUtil.ISO_DATETIME_FORMAT);
                            }
                        }
                    }
                    containerObject[this.fieldDef.identifier] = value;
                }
            }
        };
        StandardFieldAccessor.prototype.getContainerObject = function (clip) {
            switch (this.fieldDef.memberOf) {
                case "clip":
                    if (this.fieldDef.isBuiltin) {
                        return clip;
                    }
                    else {
                        if (!clip.userFields) {
                            clip.userFields = {};
                        }
                        return clip.userFields;
                    }
                case "media":
                    if (!clip.media) {
                        clip.media = {};
                    }
                    if (this.fieldDef.isBuiltin) {
                        return clip.media;
                    }
                    else {
                        if (!clip.media.metadata) {
                            clip.media.metadata = {};
                        }
                        return clip.media.metadata;
                    }
                case "importSource":
                    if (!clip.importSource) {
                        clip.importSource = {};
                    }
                    if (this.fieldDef.isBuiltin) {
                        return clip.importSource;
                    }
                    else {
                        if (!clip.importSource.metadata) {
                            clip.importSource.metadata = {};
                        }
                        return clip.importSource.metadata;
                    }
                default:
                    return null;
            }
        };
        return StandardFieldAccessor;
    })();
    var MediaPathAccessor = (function () {
        function MediaPathAccessor(fieldDef) {
            this.fieldDef = fieldDef;
        }
        MediaPathAccessor.prototype.getValue = function (clip) {
            var link = {};
            if (this.fieldDef.ID == "MF") {
                link.path = clip.media ? clip.media.filePath : null;
                link.downloadUrl = logic.ClipManager.getDownloadUrl(clip, true, false);
            }
            else if (this.fieldDef.ID == "PF") {
                link.path = clip.media ? clip.media.proxyPath : null;
                link.downloadUrl = logic.ClipManager.getDownloadUrl(clip, false, true);
            }
            return link;
        };
        MediaPathAccessor.prototype.setValue = function (clip, value) {
            /* Read only */
        };
        return MediaPathAccessor;
    })();
    var TimecodeFieldAccessor = (function (_super) {
        __extends(TimecodeFieldAccessor, _super);
        function TimecodeFieldAccessor(fieldDef) {
            _super.call(this, fieldDef);
        }
        TimecodeFieldAccessor.prototype.getValue = function (clip) {
            var timecode = _super.prototype.getValue.call(this, clip);
            return timecode.txt || TimecodeUtil.formatTimecode(timecode);
        };
        TimecodeFieldAccessor.prototype.setValue = function (clip, value) {
            _super.prototype.setValue.call(this, clip, value ? TimecodeUtil.parseTimecode(value, clip["in"].fmt) : null);
        };
        return TimecodeFieldAccessor;
    })(StandardFieldAccessor);
    // Custom Bindings for calculated fields
    var CustomAccessor = (function () {
        function CustomAccessor(fieldDef, getter) {
            this.fieldDef = fieldDef;
            this.getter = getter;
        }
        CustomAccessor.prototype.getValue = function (clip) {
            return this.getter(clip);
        };
        CustomAccessor.prototype.setValue = function (clip, value) {
            /* Read only */
        };
        return CustomAccessor;
    })();
    var AccessorFactory = (function () {
        function AccessorFactory() {
        }
        AccessorFactory.createAccessor = function (fieldDef) {
            switch (fieldDef.ID) {
                case "IO":
                    return new CustomAccessor(fieldDef, function (clip) {
                        return TimecodeUtil.formatTimecode(clip["in"]) + " - " + (clip.out ? TimecodeUtil.formatTimecode(clip.out) : "--:--:--:--");
                    });
                case "IO2":
                    return new CustomAccessor(fieldDef, function (clip) {
                        return TimecodeUtil.formatTimecode(clip.in2) + " - " + (clip.out2 ? TimecodeUtil.formatTimecode(clip.out2) : "--:--:--:--");
                    });
                case "CAT":
                    return new CustomAccessor(fieldDef, function (clip) {
                        return clip.catalogName;
                    });
                case "CGRP":
                    return new CustomAccessor(fieldDef, function (clip) {
                        return clip.groupName;
                    });
                case "SM":
                    return new CustomAccessor(fieldDef, function (clip) {
                        if (!clip.media || !clip.media.filePath)
                            return null;
                        var lastSeparator = Math.max(clip.media.filePath.lastIndexOf("/"), clip.media.filePath.lastIndexOf("\\"));
                        return (lastSeparator != -1) ? clip.media.filePath.substring(lastSeparator + 1) : clip.media.filePath;
                    });
                case "FLD":
                    return new CustomAccessor(fieldDef, function (clip) {
                        if (!clip.media || !clip.media.filePath)
                            return null;
                        var lastSeparator = Math.max(clip.media.filePath.lastIndexOf("/"), clip.media.filePath.lastIndexOf("\\"));
                        return (lastSeparator != -1) ? clip.media.filePath.substring(0, lastSeparator) : "";
                    });
                case "MF":
                case "PF":
                    return new MediaPathAccessor(fieldDef);
                default:
                    if (fieldDef.fieldType == "timecode") {
                        return new TimecodeFieldAccessor(fieldDef);
                    }
                    else {
                        return new StandardFieldAccessor(fieldDef);
                    }
            }
        };
        return AccessorFactory;
    })();
    logic.AccessorFactory = AccessorFactory;
})(logic || (logic = {}));
