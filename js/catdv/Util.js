// Wrapper around browser's console object - handles IE where console object only exists if console window open
var util;
(function (util) {
    var entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };
    var HtmlUtil = (function () {
        function HtmlUtil() {
        }
        HtmlUtil.escapeHtml = function (string) {
            return String(string).replace(/[&<>"'\/]/g, function (s) {
                return entityMap[s];
            });
        };
        return HtmlUtil;
    })();
    util.HtmlUtil = HtmlUtil;
    var PathUtil = (function () {
        function PathUtil() {
        }
        PathUtil.getFilename = function (path) {
            var separatorIndex = path.lastIndexOf("/");
            if (separatorIndex != -1) {
                return path.substring(separatorIndex + 1);
            }
            separatorIndex = path.lastIndexOf("\\");
            if (separatorIndex != -1) {
                return path.substring(separatorIndex + 1);
            }
            return path;
        };
        return PathUtil;
    })();
    util.PathUtil = PathUtil;
    var Platform = (function () {
        function Platform() {
        }
        Platform.isTouchDevice = function () {
            try {
                document.createEvent("TouchEvent");
                return true;
            }
            catch (e) {
                return false;
            }
        };
        Platform.isIOS = function () {
            return ((navigator.platform == "iPad") || (navigator.platform == "iPhone"));
        };
        Platform.isMac = function () {
            return ((navigator.platform == "MacIntel") || (navigator.platform == "Macintosh"));
        };
        Platform.isSafari = function () {
            return navigator.userAgent.contains("Safari");
        };
        Platform.isFirefox = function () {
            return navigator.userAgent.contains("Firefox");
        };
        // Pre IE 10
        Platform.isOldIE = function () {
            var userAgent = navigator.userAgent;
            var msieIndex = userAgent.indexOf("MSIE");
            if (msieIndex == -1)
                return false;
            var ieVersion = Number(userAgent.substring(msieIndex + 4, userAgent.indexOf(";", msieIndex + 4)));
            return (ieVersion < 10);
        };
        return Platform;
    })();
    util.Platform = Platform;
})(util || (util = {}));
var catdv;
(function (catdv) {
    var TimecodeUtil = (function () {
        function TimecodeUtil() {
        }
        TimecodeUtil.formatTimecode = function (timecode) {
            if (!timecode || isNaN(timecode.secs))
                return "-:--:--:--";
            var frames;
            // There are two strategies for dealing with formats with non-integer framerates:
            //
            // 1 - Drop Frame (DF) - attempts to keep the indicated timecode roughly the same as the wallclock time
            //     It does this by having the frame number in the timecode periodically only going to N-1
            //     e.g. for 29.97 fps the frame number normally runs 0-29, but periodically runs 0-28. (meaning indicated timecode 
            //     seconds are not all the same length - they jitter - but over many frames the timecode's hh:mm:ss stay
            //     in sync with real elapsed time)
            //     Note: all frames are still displayed - the 'dropping' just refers the the displayed frame numbers
            //
            // 2 - Non-drop-frame (NDF) - the timecode indicator effectively becomes a frame counter, with the 'seconds' column
            //     measuring units of 30 (or whatever) frames, rather than real seconds. Therefore the hh:mm:ss displayed in the 
            //     timecode drift out of sync with the actual elapsed time
            // 
            if (TimecodeUtil.isNonDropFrameFormat(timecode.fmt)) {
                // For non-drop-frame formats frames in the timecode map one-to-one with frames in the media 
                // so calculate the frames using the real framerate. (However the 'frames' aren't really
                // 1/30th second long so when we subsequently convert them to hh:mm:ss assuming they
                // are 1/30th long the hh:mm:ss will not represent wallclock time.) 
                frames = timecode.secs * TimecodeUtil.getFrameRate(timecode.fmt);
            }
            else {
                // For drop-frame we calculate notional frames, where each frame is exactly 1/30th (or whatever) seconds long.
                // This means when we subsequently convert them to hh:mm:ss using the assumption that they are 1/30th second
                // long then the resultant hh:mm:ss will correspond to wallclock time. However the
                // calculated frame numbers will contain a fractional part that represents the error between the real and notional
                // frame length, and this error will accumulate over time until rounding causes the frame
                // number to skip a value - as required by the DF format.
                // Note: integer framerates come through here too, but notional == actual for them so it has no effect
                frames = timecode.secs * TimecodeUtil.getNotionalFrameRate(timecode.fmt);
            }
            // fps is number of frames per indicated timecode second (which for NDF is longer than a wallclock second)
            var fps = TimecodeUtil.getNotionalFrameRate(timecode.fmt);
            var hours = Math.floor(frames / (fps * 60 * 60));
            frames -= hours * (fps * 60 * 60);
            var minutes = Math.floor(frames / (fps * 60));
            frames -= minutes * (fps * 60);
            var seconds = Math.floor(frames / fps);
            frames -= seconds * fps;
            if (timecode.fmt == 6000 /* P60_NTSC_NDF_FORMAT */) {
                frames = frames / 2;
            }
            var hhmmss = TimecodeUtil.twoDigits(hours) + ":" + TimecodeUtil.twoDigits(minutes) + ":" + TimecodeUtil.twoDigits(seconds);
            switch (timecode.fmt) {
                case 1 /* WHOLE_SECONDS_FORMAT */:
                    return hhmmss;
                case 10 /* DECIMAL_FORMAT */:
                    return hhmmss + "." + frames;
                case 100 /* HUNDREDTHS_FORMAT */:
                    return hhmmss + "." + TimecodeUtil.twoDigits(frames);
                case 2398 /* P24_NTSC_FORMAT */:
                case 24 /* P24_FORMAT */:
                    return hhmmss + "'" + TimecodeUtil.twoDigits(Math.floor(frames));
                case 2997 /* NTSC_DF_FORMAT */:
                case 5994 /* P60_NTSC_DF_FORMAT */:
                    return hhmmss + ";" + TimecodeUtil.twoDigits(Math.floor(frames));
                default:
                    return hhmmss + ":" + TimecodeUtil.twoDigits(Math.floor(frames));
            }
        };
        // TODO: this needs to take account of drop-frame formats
        TimecodeUtil.parseTimecode = function (timecodeString, timecodeFormat) {
            if (!timecodeString)
                return null;
            var fields = timecodeString.split(/[:;'.]/);
            var hours = Number(fields[0]);
            var mins = Number(fields[1]);
            var secs = Number(fields[2]);
            var frames = Number(fields.length > 3 ? fields[3] : "0");
            var seconds = hours * (3600) + mins * 60 + secs;
            switch (timecodeFormat) {
                case 1 /* WHOLE_SECONDS_FORMAT */:
                    break;
                case 10 /* DECIMAL_FORMAT */:
                case 100 /* HUNDREDTHS_FORMAT */:
                    seconds += Number("0." + frames);
                    break;
                default:
                    var frameRate = TimecodeUtil.getNotionalFrameRate(timecodeFormat);
                    seconds += Number(frames) / frameRate;
                    break;
            }
            if (TimecodeUtil.isNonDropFrameFormat(timecodeFormat)) {
                seconds = seconds * TimecodeUtil.getNotionalFrameRate(timecodeFormat) / TimecodeUtil.getFrameRate(timecodeFormat);
            }
            var frames = Math.floor(seconds * TimecodeUtil.getFrameRate(timecodeFormat));
            return { secs: seconds, frm: frames, fmt: timecodeFormat, txt: timecodeString };
        };
        TimecodeUtil.getFrameRate = function (timecodeFormat) {
            switch (timecodeFormat) {
                case 2398 /* P24_NTSC_FORMAT */:
                    return 24 / 1.001;
                case 3000 /* NTSC_NDF_FORMAT */:
                    return 30 / 1.001;
                case 6000 /* P60_NTSC_NDF_FORMAT */:
                    return 60 / 1.001;
                default:
                    return (timecodeFormat > 1000) ? (Math.floor(Number(timecodeFormat) / 100.0 + 0.5)) / 1.001 : Number(timecodeFormat);
            }
        };
        // Get the rounded-up integer framerate for the format (so 29.97 -> 30 etc.)
        // This value will always be the number of frames in each timecode second even for non-iteger framerates (DF & NDF).
        TimecodeUtil.getNotionalFrameRate = function (fmt) {
            return (fmt > 1000) ? (Math.floor(Number(fmt) / 100.0 + 0.5)) : Number(fmt);
        };
        // Formats with a non-integer framerate, where we periodically skip one in the frames column of the timcode to keep the 
        // timecode in sync with the wallclock time. This means tiemcode 1:00:00:00 corresponds to wallclock time of one hour
        TimecodeUtil.isDropFrameFormat = function (fmt) {
            return fmt == 2997 /* NTSC_DF_FORMAT */ || fmt == 5994 /* P60_NTSC_DF_FORMAT */;
        };
        // Formats with a non-integer framerate, where we do not periodically drop timcode frames to keep the timecode in sync
        // with the wallclock time. This means 1:00:00:00 doesn't correspond to a wallclock time of exactly one hour
        TimecodeUtil.isNonDropFrameFormat = function (fmt) {
            return fmt == 2398 /* P24_NTSC_FORMAT */ || fmt == 3000 /* NTSC_NDF_FORMAT */ || fmt == 6000 /* P60_NTSC_NDF_FORMAT */;
        };
        // Strip out text and frames parts of timecodes (we do all the calculations in seconds
        // so frames and text are not guarateed to be correct)
        TimecodeUtil.simplify = function (tc) {
            delete (tc.frm);
            delete (tc.txt);
        };
        TimecodeUtil.twoDigits = function (n) {
            var tmp = ("0" + n);
            return tmp.substring(tmp.length - 2);
        };
        return TimecodeUtil;
    })();
    catdv.TimecodeUtil = TimecodeUtil;
    var DateUtil = (function () {
        function DateUtil() {
        }
        DateUtil.format = function (date, format) {
            if (format === void 0) { format = null; }
            return moment(date).format(format);
        };
        DateUtil.parse = function (dateString, format) {
            if (format === void 0) { format = null; }
            return moment(dateString, format).toDate();
        };
        DateUtil.ISO_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
        DateUtil.ISO_DATE_FORMAT = "YYYY-MM-DD";
        DateUtil.ISO_TIME_FORMAT = "HH:mm:ss";
        return DateUtil;
    })();
    catdv.DateUtil = DateUtil;
    var FieldDefinitionUtil = (function () {
        function FieldDefinitionUtil() {
        }
        // True is this field has associated values (picklist, hiearchy, multi-checkbox etc.)
        FieldDefinitionUtil.hasValues = function (fieldDef) {
            return fieldDef && fieldDef.fieldType.contains("multi") || fieldDef.fieldType.contains("picklist") || fieldDef.fieldType.contains("hiearchy");
        };
        FieldDefinitionUtil.getLongIdentifier = function (fieldDef) {
            if (fieldDef.isBuiltin) {
                return fieldDef.memberOf + "." + fieldDef.identifier;
            }
            else {
                return fieldDef.memberOf + "[" + fieldDef.identifier + "]";
            }
        };
        FieldDefinitionUtil.getSortBy = function (fieldDef) {
            return fieldDef.isSortable ? fieldDef.memberOf + (fieldDef.isBuiltin ? "." + fieldDef.identifier : "[" + fieldDef.identifier + "]") : null;
        };
        FieldDefinitionUtil.makeDummyFieldDefinition = function (longIdentifier) {
            var fieldDef = { "fieldType": "text", "canQuery": true };
            var index = longIdentifier.indexOf("[");
            if (index != -1) {
                fieldDef.isBuiltin = false;
                fieldDef.memberOf = longIdentifier.substring(0, index);
                fieldDef.identifier = longIdentifier.substring(index + 1, longIdentifier.length - 1);
                fieldDef.name = fieldDef.identifier;
            }
            else {
                fieldDef.isBuiltin = true;
                var fields = longIdentifier.split(".");
                fieldDef.memberOf = fields[0];
                fieldDef.identifier = fields[1];
                fieldDef.name = fieldDef.identifier;
            }
            return fieldDef;
        };
        return FieldDefinitionUtil;
    })();
    catdv.FieldDefinitionUtil = FieldDefinitionUtil;
    var QueryDefinitionUtil = (function () {
        function QueryDefinitionUtil() {
        }
        QueryDefinitionUtil.toFilterString = function (queryDef) {
            // TODO: handle advanced options like related data
            var filterString = "";
            queryDef.terms.forEach(function (term) {
                var params = term.params ? term.params.replaceAll("~", "~7E").replaceAll("(", "~28").replaceAll(")", "~29") : "";
                filterString += (term.logicalOR ? "or" : "and") + (term.logicalNOT ? "Not" : "");
                filterString += "((" + term.field + ")" + term.op + "(" + params + "))";
            });
            return filterString;
        };
        QueryDefinitionUtil.parse = function (filterText) {
            return new QueryDefinitionParser(filterText).parse();
        };
        return QueryDefinitionUtil;
    })();
    catdv.QueryDefinitionUtil = QueryDefinitionUtil;
    var QueryDefinitionParser = (function () {
        function QueryDefinitionParser(filterText) {
            this.filterText = filterText;
        }
        QueryDefinitionParser.prototype.parse = function () {
            this.pos = -1;
            this.eol = false;
            this.next();
            var query = {
                name: "query",
                terms: []
            };
            if (this.filterText.length > 0) {
                do {
                    var term = {};
                    var logicalOp = this.readIdentifier(false);
                    term.logicalOR = (logicalOp != null) && logicalOp.toLowerCase().startsWith("or");
                    term.logicalNOT = (logicalOp != null) && logicalOp.toLowerCase().endsWith("not");
                    this.readChar('(');
                    this.readChar('(');
                    term.field = this.readIdentifier(true);
                    this.readChar(')');
                    term.op = this.readIdentifier(true);
                    this.readChar('(');
                    term.params = this.readString();
                    this.readChar(')');
                    this.readChar(')');
                    query.terms.push(term);
                } while (!this.eol);
            }
            return query;
        };
        QueryDefinitionParser.prototype.readIdentifier = function (mandatory) {
            var identifier = "";
            while (!this.eol && this.c != ')' && this.c != '(') {
                identifier += this.c;
                this.next();
            }
            if (mandatory && identifier.length == 0) {
                throw "expected identifier";
            }
            return identifier.toString();
        };
        QueryDefinitionParser.prototype.readString = function () {
            var str = "";
            while (!this.eol && this.c != ')') {
                str += this.c;
                this.next();
            }
            if (this.eol) {
                throw "unterminated string at " + this.pos;
            }
            return str.replace("~28", "(").replace("~29", ")").replace("~7E", "~");
        };
        QueryDefinitionParser.prototype.readChar = function (d) {
            if (this.c == d) {
                this.next();
            }
            else {
                throw "expected '" + d + "' at " + this.pos;
            }
        };
        QueryDefinitionParser.prototype.next = function () {
            if (++this.pos >= this.filterText.length) {
                this.eol = true;
            }
            else {
                this.c = this.filterText.charAt(this.pos);
            }
        };
        return QueryDefinitionParser;
    })();
})(catdv || (catdv = {}));
