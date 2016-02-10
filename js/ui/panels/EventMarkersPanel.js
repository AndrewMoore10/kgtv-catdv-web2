var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ui;
(function (ui) {
    var panels;
    (function (panels) {
        var Control = controls.Control;
        var Element = controls.Element;
        var Label = controls.Label;
        var TextBox = controls.TextBox;
        var Button = controls.Button;
        var TimecodeUtil = catdv.TimecodeUtil;
        var EventMarkersPanel = (function (_super) {
            __extends(EventMarkersPanel, _super);
            function EventMarkersPanel(elementId) {
                _super.call(this, elementId);
                this.eventTimelines = [];
                this.clip = null;
                this.movieTimeChangedHandler = null;
                this.selectionChangedHandler = null;
                this.addmarkerDialog = new AddMarkerDialog("addMarkerDialog");
                this.editMarkerDialog = new EditMarkerDialog("editMarkerDialog");
                _super.prototype.css.call(this, {
                    "position": "relative",
                    "width": "100%",
                    "margin-top": "32px"
                });
            }
            EventMarkersPanel.prototype.setClip = function (clip) {
                var _this = this;
                this.clip = clip;
                this.eventTimelines = [];
                this.$element.empty();
                if (this.clip.markers) {
                    this.clip.markers.forEach(function (eventMarker) { return _this.addTimeline(eventMarker); });
                }
            };
            EventMarkersPanel.prototype.setEditable = function (editable) {
                this.eventTimelines.forEach(function (timeline) { return timeline.setEditable(editable); });
            };
            EventMarkersPanel.prototype.onMovetimeChanged = function (movieTimeChangedHandler) {
                this.movieTimeChangedHandler = movieTimeChangedHandler;
            };
            EventMarkersPanel.prototype.onTimelineSelectionChanged = function (selectionChangedHandler) {
                this.selectionChangedHandler = selectionChangedHandler;
            };
            EventMarkersPanel.prototype.addMarker = function (movieTime, markerType) {
                var _this = this;
                if (markerType == "range") {
                    this.addmarkerDialog.setMarkerInfo(true, this.clip.in2, this.clip.out2);
                }
                else {
                    this.addmarkerDialog.setMarkerInfo(false, movieTime, null);
                }
                this.addmarkerDialog.onOK(function () {
                    var eventIn = null;
                    var eventOut = null;
                    if (markerType == "range") {
                        eventIn = _this.clip.in2;
                        eventOut = _this.clip.out2;
                    }
                    else {
                        eventIn = movieTime;
                    }
                    var newMarker = {
                        "name": _this.addmarkerDialog.getName(),
                        "description": _this.addmarkerDialog.getComment(),
                        "category": "Event",
                        "in": eventIn,
                        "out": eventOut
                    };
                    _this.clip.markers = _this.clip.markers || [];
                    _this.clip.markers.push(newMarker);
                    _this.addTimeline(newMarker).setEditable(true);
                });
                this.addmarkerDialog.show();
            };
            EventMarkersPanel.prototype.addTimeline = function (eventMarker) {
                var _this = this;
                var eventMarkerTimeline = new EventMarkerTimeline(this, eventMarker, this.clip["in"].secs, this.clip.duration);
                this.eventTimelines.push(eventMarkerTimeline);
                eventMarkerTimeline.onMovetimeChanged(function (time) {
                    if (_this.movieTimeChangedHandler)
                        _this.movieTimeChangedHandler(time);
                });
                eventMarkerTimeline.onClick(function (evt) {
                    _this.setSelectedItem(eventMarkerTimeline);
                    if (_this.selectionChangedHandler) {
                        _this.selectionChangedHandler(eventMarkerTimeline.eventMarker["in"], eventMarkerTimeline.eventMarker.out);
                    }
                });
                eventMarkerTimeline.onEdit(function (timeline) {
                    _this.editMarkerDialog.setMarker(timeline.eventMarker);
                    _this.editMarkerDialog.onOK(function () {
                        timeline.updateMarkerNameDescription(_this.editMarkerDialog.getName(), _this.editMarkerDialog.getComment());
                    });
                    _this.editMarkerDialog.show();
                });
                eventMarkerTimeline.onDelete(function (deletedEventTimeline) {
                    _this.clip.markers = _this.clip.markers.filter(function (marker) { return marker !== deletedEventTimeline.eventMarker; });
                    _this.eventTimelines = _this.eventTimelines.filter(function (timeline) { return timeline !== deletedEventTimeline; });
                });
                return eventMarkerTimeline;
            };
            EventMarkersPanel.prototype.setSelectedItem = function (timeline) {
                this.eventTimelines.forEach(function (timeline) { return timeline.$element.removeClass("selected"); });
                if (timeline)
                    timeline.$element.addClass("selected");
            };
            return EventMarkersPanel;
        })(Control);
        panels.EventMarkersPanel = EventMarkersPanel;
        var EventMarkerTimeline = (function (_super) {
            __extends(EventMarkerTimeline, _super);
            function EventMarkerTimeline(parent, eventMarker, clipInSecs, clipDuration) {
                var _this = this;
                _super.call(this, $("<div class='eventMarkerTimeline'></div>").appendTo(parent.$element));
                this.movieTimeChangedHandler = null;
                this.deleteHandler = null;
                this.editHandler = null;
                this.eventMarker = eventMarker;
                this.clipInSecs = clipInSecs;
                this.clipDuration = clipDuration;
                var $header = $("<div class='header' style='position:relative;'>").appendTo(this.$element);
                var $headerText = $("<div>").appendTo($header);
                $headerText.css({ "position": "absolute", "left": 0, "right": 48, "height": "32px", "overflow": "hidden", "white-space": "nowrap" });
                this.title = new Label($("<span class='title'>").appendTo($headerText));
                this.title.setText(eventMarker.name);
                this.timecode = new Label($("<span class='timecode'>").appendTo($headerText));
                this.description = new Label($("<a href='#' class='description'></a>").appendTo($headerText));
                this.description.setText(eventMarker.description);
                this.description.$element.attr("title", eventMarker.description);
                var $buttons = $("<div class='buttons'>").appendTo($header).css({ "position": "absolute", "right": 0, "top": 2 });
                this.editBtn = new Element($("<a href='#' title='Edit marker' style='display:none'><span class='glyphicon glyphicon-pencil'> </span></a>").appendTo($buttons));
                this.editBtn.onClick(function (evt) {
                    if (_this.editHandler) {
                        _this.editHandler(_this);
                    }
                });
                this.deleteBtn = new Element($("<a href='#' title='Delete marker' style='display:none'><span class='glyphicon glyphicon-trash'> </span></a>").appendTo($buttons));
                this.deleteBtn.onClick(function (evt) {
                    if (_this.deleteHandler) {
                        _this.$element.remove();
                        _this.deleteHandler(_this);
                    }
                });
                this.timeline = new Element($("<div class='timeline' style='position:relative'>").appendTo(this.$element));
                var timelineWidth = this.timeline.getWidth();
                if (this.eventMarker.out) {
                    // Range marker
                    var inPosition = this.getTimelinePosition(eventMarker["in"]);
                    var outPosition = this.getTimelinePosition(eventMarker.out);
                    this.rangeIndicator = new Element($("<div class='range' style='position:absolute'>").appendTo(this.timeline.$element));
                    this.inMarker = new Element($("<div class='mark-in' style='position:absolute'>").appendTo(this.timeline.$element));
                    this.outMarker = new Element($("<div class='mark-out' style='position:absolute'>").appendTo(this.timeline.$element));
                }
                else {
                    this.inMarker = new Element($("<div class='mark' style='position:absolute'>").appendTo(this.timeline.$element));
                }
                var inPosition = this.getTimelinePosition(this.eventMarker["in"]);
                this.inMarker.setLeft(inPosition);
                if (this.eventMarker.out) {
                    // Range marker
                    var outPosition = this.getTimelinePosition(this.eventMarker.out);
                    this.outMarker.setLeft(outPosition);
                    this.rangeIndicator.setLeft(inPosition);
                    this.rangeIndicator.setWidth(outPosition - inPosition);
                    this.timecode.setText("(" + TimecodeUtil.formatTimecode(this.eventMarker["in"]) + "-" + TimecodeUtil.formatTimecode(this.eventMarker.out) + ")");
                }
                else {
                    this.timecode.setText("(" + TimecodeUtil.formatTimecode(this.eventMarker["in"]) + ")");
                }
            }
            EventMarkerTimeline.prototype.setEditable = function (editable) {
                this.deleteBtn.show(editable);
                this.editBtn.show(editable);
            };
            EventMarkerTimeline.prototype.updateMarkerNameDescription = function (name, description) {
                this.title.setText(this.eventMarker.name = name);
                this.description.setText(this.eventMarker.description = description);
            };
            EventMarkerTimeline.prototype.onMovetimeChanged = function (movieTimeChangedHandler) {
                this.movieTimeChangedHandler = movieTimeChangedHandler;
            };
            EventMarkerTimeline.prototype.onDelete = function (deleteHandler) {
                this.deleteHandler = deleteHandler;
            };
            EventMarkerTimeline.prototype.onEdit = function (editHandler) {
                this.editHandler = editHandler;
            };
            EventMarkerTimeline.prototype.getTimelinePosition = function (timecode) {
                var timelineWidth = this.timeline.getWidth() - 2;
                return Math.min((timecode.secs - this.clipInSecs) / this.clipDuration.secs, 1.0) * timelineWidth;
            };
            EventMarkerTimeline.prototype.getTimecode = function (timelinePosition) {
                var timelineWidth = this.timeline.getWidth() - 2;
                return { secs: ((timelinePosition * this.clipDuration.secs) / timelineWidth) + this.clipInSecs, fmt: this.clipDuration.fmt };
            };
            return EventMarkerTimeline;
        })(Control);
        panels.EventMarkerTimeline = EventMarkerTimeline;
        var AddMarkerDialog = (function (_super) {
            __extends(AddMarkerDialog, _super);
            function AddMarkerDialog(elementId) {
                var _this = this;
                _super.call(this, elementId);
                this.lblAddMarkerDialogTitle = new Label("lblAddMarkerDialogTitle");
                this.lblMarkerInfo = new Label("lblMarkerInfo");
                this.txtName = new TextBox("txtName");
                this.txtComment = new TextBox("txtComment");
                this.btnAddMarkerOK = new Button("btnAddMarkerOK");
                this.btnAddMarkerOK.onClick(function (evt) { return _this.close(true); });
            }
            AddMarkerDialog.prototype.setMarkerInfo = function (rangeMarker, tcIn, tcOut) {
                this.txtName.setText("");
                this.txtComment.setText("");
                if (rangeMarker) {
                    this.lblAddMarkerDialogTitle.setText("Add Range Marker");
                    this.lblMarkerInfo.setText("Add range marker between: " + TimecodeUtil.formatTimecode(tcIn) + " and " + TimecodeUtil.formatTimecode(tcOut));
                }
                else {
                    this.lblAddMarkerDialogTitle.setText("Add Event Marker");
                    this.lblMarkerInfo.setText("Add event marker at: " + TimecodeUtil.formatTimecode(tcIn));
                }
            };
            AddMarkerDialog.prototype.getName = function () {
                return this.txtName.getText();
            };
            AddMarkerDialog.prototype.getComment = function () {
                return this.txtComment.getText();
            };
            return AddMarkerDialog;
        })(controls.Modal);
        panels.AddMarkerDialog = AddMarkerDialog;
        var EditMarkerDialog = (function (_super) {
            __extends(EditMarkerDialog, _super);
            function EditMarkerDialog(elementId) {
                var _this = this;
                _super.call(this, elementId);
                this.txtName = new TextBox("txtNewName");
                this.txtComment = new TextBox("txtNewComment");
                this.btnEditMarkerOK = new Button("btnEditMarkerOK");
                this.btnEditMarkerOK.onClick(function (evt) { return _this.close(true); });
            }
            EditMarkerDialog.prototype.setMarker = function (marker) {
                this.txtName.setText(marker.name);
                this.txtComment.setText(marker.description);
            };
            EditMarkerDialog.prototype.getName = function () {
                return this.txtName.getText();
            };
            EditMarkerDialog.prototype.getComment = function () {
                return this.txtComment.getText();
            };
            return EditMarkerDialog;
        })(controls.Modal);
        panels.EditMarkerDialog = EditMarkerDialog;
    })(panels = ui.panels || (ui.panels = {}));
})(ui || (ui = {}));
