module ui.panels
{
    import Control = controls.Control;
    import Image = controls.Image;
    import Element = controls.Element;
    import Label = controls.Label;
    import TextBox = controls.TextBox;
    import RadioButton = controls.RadioButton;
    import Button = controls.Button;
    import FocusPanel = controls.FocusPanel;
    import DraggableElement = controls.DraggableElement;
    import DragElementEvent = controls.DragElementEvent;
    import Direction = controls.Direction;
    import VideoPlayer = controls.VideoPlayer;
    import QuickTimePlayer = controls.QuickTimeVideoPlayer;
    import PlayerEvent = controls.PlayerEvent;

    import $catdv = catdv.RestApi;
    import Clip = catdv.Clip;
    import EventMarker = catdv.EventMarker;
    import Timecode = catdv.Timecode;
    import TimecodeFormat = catdv.TimecodeFormat;
    import TimecodeUtil = catdv.TimecodeUtil;


    export class EventMarkersPanel extends Control
    {
        private eventTimelines: EventMarkerTimeline[] = [];
        private clip: Clip = null;
        private movieTimeChangedHandler: (movietime: Timecode) => void = null;
        private selectionChangedHandler: (markIn: Timecode, markOut: Timecode) => void = null;

        private addmarkerDialog = new AddMarkerDialog("addMarkerDialog");
        private editMarkerDialog = new EditMarkerDialog("editMarkerDialog");

        constructor(elementId)
        {
            super(elementId);

            super.css({
                "position": "relative",
                "width": "100%",
                "margin-top": "32px"
            });
        }

        public setClip(clip: Clip)
        {
            this.clip = clip;

            this.eventTimelines = [];
            this.$element.empty();

            if (this.clip.markers)
            {
                this.clip.markers.forEach((eventMarker) => this.addTimeline(eventMarker));
            }
        }

        public setEditable(editable: boolean)
        {
            this.eventTimelines.forEach((timeline) => timeline.setEditable(editable));
        }

        public onMovetimeChanged(movieTimeChangedHandler: (movietime: Timecode) => void)
        {
            this.movieTimeChangedHandler = movieTimeChangedHandler;
        }

        public onTimelineSelectionChanged(selectionChangedHandler: (markIn: Timecode, markOut: Timecode) => void)
        {
            this.selectionChangedHandler = selectionChangedHandler;
        }

        public addMarker(movieTime: Timecode, markerType: string)
        {
            if (markerType == "range")
            {
                this.addmarkerDialog.setMarkerInfo(true, this.clip.in2, this.clip.out2);
            }
            else
            {
                this.addmarkerDialog.setMarkerInfo(false, movieTime, null);
            }

            this.addmarkerDialog.onOK(() =>
            {
                var eventIn: Timecode = null;
                var eventOut: Timecode = null;
                if (markerType == "range")
                {
                    eventIn = this.clip.in2;
                    eventOut = this.clip.out2;
                }
                else
                {
                    eventIn = movieTime;
                }

                var newMarker: EventMarker = {
                    "name": this.addmarkerDialog.getName(),
                    "description": this.addmarkerDialog.getComment(),
                    "category": "Event",
                    "in": eventIn,
                    "out": eventOut
                };

                this.clip.markers = this.clip.markers || [];
                this.clip.markers.push(newMarker);
                this.addTimeline(newMarker).setEditable(true);
            });
            this.addmarkerDialog.show();
        }

        private addTimeline(eventMarker: EventMarker): EventMarkerTimeline
        {
            var eventMarkerTimeline = new EventMarkerTimeline(this, eventMarker, this.clip["in"].secs, this.clip.duration);
            this.eventTimelines.push(eventMarkerTimeline);

            eventMarkerTimeline.onMovetimeChanged((time) =>
            {
                if (this.movieTimeChangedHandler) this.movieTimeChangedHandler(time);
            });

            eventMarkerTimeline.onClick((evt: JQueryEventObject) =>
            {
                this.setSelectedItem(eventMarkerTimeline);
                if (this.selectionChangedHandler)
                {
                    this.selectionChangedHandler(eventMarkerTimeline.eventMarker["in"], eventMarkerTimeline.eventMarker.out);
                }
            });

            eventMarkerTimeline.onEdit((timeline: EventMarkerTimeline) =>
            {
                this.editMarkerDialog.setMarker(timeline.eventMarker);
                this.editMarkerDialog.onOK(() =>
                {
                    timeline.updateMarkerNameDescription(this.editMarkerDialog.getName(), this.editMarkerDialog.getComment());
                });
                this.editMarkerDialog.show();
            });

            eventMarkerTimeline.onDelete((deletedEventTimeline) =>
            {
                this.clip.markers = this.clip.markers.filter((marker) => marker !== deletedEventTimeline.eventMarker);
                this.eventTimelines = this.eventTimelines.filter((timeline) => timeline !== deletedEventTimeline);
            });

            return eventMarkerTimeline;
        }

        private setSelectedItem(timeline: EventMarkerTimeline)
        {
            this.eventTimelines.forEach((timeline) => timeline.$element.removeClass("selected"));
            if (timeline) timeline.$element.addClass("selected");
        }
    }

    export class EventMarkerTimeline extends Control
    {
        private timecode: Label;
        private title: Label;
        private description: Label;
        private timeline: Element;
        private inMarker: Element;
        private outMarker: Element;
        private rangeIndicator: Element;
        private deleteBtn: Element;
        private editBtn: Element;

        private clipInSecs: number;
        private clipDuration: Timecode;

        private movieTimeChangedHandler: (movietime: Timecode) => void = null;
        private deleteHandler: (evt: EventMarkerTimeline) => void = null;
        private editHandler: (evt: EventMarkerTimeline) => void = null;

        public eventMarker: EventMarker;

        constructor(parent: EventMarkersPanel, eventMarker: EventMarker, clipInSecs: number, clipDuration: Timecode)
        {
            super($("<div class='eventMarkerTimeline'></div>").appendTo(parent.$element));

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
            this.editBtn.onClick((evt) =>
            {
                if (this.editHandler)
                {
                    this.editHandler(this);
                }
            });

            this.deleteBtn = new Element($("<a href='#' title='Delete marker' style='display:none'><span class='glyphicon glyphicon-trash'> </span></a>").appendTo($buttons));
            this.deleteBtn.onClick((evt) =>
            {
                if (this.deleteHandler)
                {
                    this.$element.remove();
                    this.deleteHandler(this);
                }
            });

            this.timeline = new Element($("<div class='timeline' style='position:relative'>").appendTo(this.$element));

            var timelineWidth = this.timeline.getWidth();

            if (this.eventMarker.out)
            {
                // Range marker
                var inPosition = this.getTimelinePosition(eventMarker["in"]);
                var outPosition = this.getTimelinePosition(eventMarker.out);

                this.rangeIndicator = new Element($("<div class='range' style='position:absolute'>").appendTo(this.timeline.$element));

                this.inMarker = new Element($("<div class='mark-in' style='position:absolute'>").appendTo(this.timeline.$element));
                this.outMarker = new Element($("<div class='mark-out' style='position:absolute'>").appendTo(this.timeline.$element));
            }
            else
            {
                this.inMarker = new Element($("<div class='mark' style='position:absolute'>").appendTo(this.timeline.$element));
            }

            var inPosition = this.getTimelinePosition(this.eventMarker["in"]);
            this.inMarker.setLeft(inPosition);

            if (this.eventMarker.out)
            {
                // Range marker
                var outPosition = this.getTimelinePosition(this.eventMarker.out);
                this.outMarker.setLeft(outPosition);

                this.rangeIndicator.setLeft(inPosition);
                this.rangeIndicator.setWidth(outPosition - inPosition);
  
                this.timecode.setText("(" + TimecodeUtil.formatTimecode(this.eventMarker["in"]) + "-" + TimecodeUtil.formatTimecode(this.eventMarker.out)+ ")");
            }
            else
            {
                this.timecode.setText("(" + TimecodeUtil.formatTimecode(this.eventMarker["in"]) + ")");
            }
        }

        public setEditable(editable: boolean)
        {
            this.deleteBtn.show(editable);
            this.editBtn.show(editable);
        }

        public updateMarkerNameDescription(name: string, description: string)
        {
            this.title.setText(this.eventMarker.name = name);
            this.description.setText(this.eventMarker.description = description);
        }

        public onMovetimeChanged(movieTimeChangedHandler: (movietimeSeconds: Timecode) => void)
        {
            this.movieTimeChangedHandler = movieTimeChangedHandler
        }

        public onDelete(deleteHandler: (evt: EventMarkerTimeline) => void)
        {
            this.deleteHandler = deleteHandler;
        }
        public onEdit(editHandler: (evt: EventMarkerTimeline) => void)
        {
            this.editHandler = editHandler;
        }

        private getTimelinePosition(timecode: Timecode)
        {
            var timelineWidth = this.timeline.getWidth() - 2;
            return Math.min((timecode.secs - this.clipInSecs) / this.clipDuration.secs, 1.0) * timelineWidth;
        }

        private getTimecode(timelinePosition: number): Timecode
        {
            var timelineWidth = this.timeline.getWidth() - 2;
            return { secs: ((timelinePosition * this.clipDuration.secs) / timelineWidth) + this.clipInSecs, fmt: this.clipDuration.fmt };
        }
    }

    export class AddMarkerDialog extends controls.Modal
    {
        private lblAddMarkerDialogTitle = new Label("lblAddMarkerDialogTitle");
        private lblMarkerInfo = new Label("lblMarkerInfo");
        private txtName = new TextBox("txtName");
        private txtComment = new TextBox("txtComment");
        private btnAddMarkerOK = new Button("btnAddMarkerOK");

        constructor(elementId: string)
        {
            super(elementId);
            this.btnAddMarkerOK.onClick((evt: any) => this.close(true));
        }

        public setMarkerInfo(rangeMarker: boolean, tcIn: Timecode, tcOut: Timecode)
        {
            this.txtName.setText("");
            this.txtComment.setText("");
            if (rangeMarker)
            {
                this.lblAddMarkerDialogTitle.setText("Add Range Marker");
                this.lblMarkerInfo.setText("Add range marker between: " + TimecodeUtil.formatTimecode(tcIn) + " and " + TimecodeUtil.formatTimecode(tcOut));
            }
            else
            {
                this.lblAddMarkerDialogTitle.setText("Add Event Marker");
                this.lblMarkerInfo.setText("Add event marker at: " + TimecodeUtil.formatTimecode(tcIn));
            }
        }

        public getName()
        {
            return this.txtName.getText();
        }
        public getComment()
        {
            return this.txtComment.getText();
        }
    }

    export class EditMarkerDialog extends controls.Modal
    {
        private txtName = new TextBox("txtNewName");
        private txtComment = new TextBox("txtNewComment");
        private btnEditMarkerOK = new Button("btnEditMarkerOK");

        constructor(elementId: string)
        {
            super(elementId);

            this.btnEditMarkerOK.onClick((evt: any) => this.close(true));
        }

        public setMarker(marker: EventMarker)
        {
            this.txtName.setText(marker.name);
            this.txtComment.setText(marker.description);
        }

        public getName()
        {
            return this.txtName.getText();
        }
        public getComment()
        {
            return this.txtComment.getText();
        }
    }
}