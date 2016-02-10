var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ui;
(function (ui) {
    var Element = controls.Element;
    var DraggableElement = controls.DraggableElement;
    var Direction = controls.Direction;
    var Label = controls.Label;
    var Panel = controls.Panel;
    var Button = controls.Button;
    var Modal = controls.Modal;
    var SequencePlayer = controls.SequencePlayer;
    var TabPanel = controls.TabPanel;
    var Console = controls.Console;
    var PlayerControls = ui.panels.PlayerControls;
    var NavigatorPanel = ui.panels.NavigatorPanel;
    var ClipListPanel = ui.panels.ClipListPanel;
    var NavbarLoginMenu = ui.panels.NavbarLoginMenu;
    var $catdv = catdv.RestApi;
    var TimecodeUtil = catdv.TimecodeUtil;
    var ServerSettings = logic.ServerSettings;
    var SequenceEditorPage = (function () {
        function SequenceEditorPage() {
            var _this = this;
            this.clipHeading = new Label("clipHeading");
            this.playerControls = new PlayerControls("playerControls", { MarkInOut: false, CreateMarkers: false, CreateSubClip: false, FullScreen: false });
            this.sequencePlayer = new SequencePlayer("sequencePlayer");
            this.clipInfoPanel = new ClipInfoPanel("clipInfoPanel");
            this.timelinePanel = new TimelinePanel("timelinePanel");
            this.navbarLoginMenu = new NavbarLoginMenu("navbarLoginMenu");
            this.addItemBtn = new Button("addItemBtn");
            this.deleteItemBtn = new Button("deleteItemBtn");
            this.clipSaveBtn = new Button("clipSaveBtn");
            this.clipCancelBtn = new Button("clipCancelBtn");
            this.addBtn = new Button("addBtn");
            this.cancelAddBtn = new Button("cancelAddBtn");
            this.addItemPanel = new Panel("addItemPanel");
            this.clipList = new ClipListPanel("clipListPanel", null);
            this.navigatorPanel = new NavigatorPanel("navigatorPanel", this.clipList);
            this.sequence = null;
            this.editSeqBtn = new Button("editSeqBtn");
            this.sequenceId = $.urlParam("id");
            ServerSettings.load(function () {
                $catdv.getClip(_this.sequenceId, function (clip) {
                    _this.setClip(clip);
                });
            });
            this.addItemBtn.onClick(function (evt) {
                Modal.setOverlayShowing(true);
                _this.addItemPanel.show();
            });
            this.deleteItemBtn.onClick(function (evt) {
                _this.sequence.seqItems = _this.sequence.seqItems.filter(function (item) { return item !== _this.selectedItem; });
                _this.sequenceItemsChanged();
            });
            this.clipSaveBtn.onClick(function (evt) {
                _this.saveSequence();
            });
            this.clipCancelBtn.onClick(function (evt) {
                document.location.href = "clip-details.jsp?id=" + _this.sequenceId;
            });
            this.addBtn.onClick(function (evt) {
                _this.addItemPanel.hide();
                var clips = _this.clipList.getSelectedClips();
                _this.addItems(clips);
                Modal.setOverlayShowing(false);
            });
            this.cancelAddBtn.onClick(function (evt) {
                _this.addItemPanel.hide();
                Modal.setOverlayShowing(false);
            });
            // NOTE: we get both user play head moves and player head move events via the 
            // player controls so we don't need to listen to the player itself.
            this.playerControls.onPlayheadMoved(function (movieTime) {
                if (!_this.timelinePanel.currentlyDraggingPlayhead()) {
                    _this.timelinePanel.setPlayheadTime(movieTime);
                }
            });
            this.playerControls.onSetMarkIn(function (evt) {
                if (_this.selectedItem) {
                    _this.selectedItem.clipIn = _this.playerControls.getCurrentTime();
                    if (_this.selectedItem.clipIn.secs >= _this.selectedItem.clipOut.secs) {
                        _this.selectedItem.clipOut.secs = _this.selectedItem.clipIn.secs + 0.15;
                    }
                    _this.clipInfoPanel.updateUI();
                    _this.sequenceInOutsChanged();
                }
            });
            this.playerControls.onSetMarkOut(function (evt) {
                if (_this.selectedItem) {
                    _this.selectedItem.clipOut = _this.playerControls.getCurrentTime();
                    if (_this.selectedItem.clipOut.secs <= _this.selectedItem.clipIn.secs) {
                        _this.selectedItem.clipIn.secs = _this.selectedItem.clipIn.secs - 0.1;
                    }
                    _this.clipInfoPanel.updateUI();
                    _this.sequenceInOutsChanged();
                }
            });
            this.clipInfoPanel.onSelectionChanged(function (selectedTab) {
                if (selectedTab == "seqTab") {
                    _this.selectWholeSequence();
                }
            });
            this.timelinePanel.onPlayheadMoved(function (movieTime) {
                if (_this.selectedItem) {
                    var itemTime = { secs: movieTime.secs - _this.selectedItem.seqIn.secs + _this.selectedItem.clipIn.secs, fmt: movieTime.fmt };
                    _this.itemPlayer.setCurrentTime(itemTime.secs - _this.selectedItem.mediaStart.secs);
                    _this.playerControls.setCurrentTime(itemTime);
                }
                else {
                    _this.sequencePlayer.setCurrentTime(movieTime.secs - _this.sequence["in"].secs);
                    _this.playerControls.setCurrentTime(movieTime);
                }
            });
            this.timelinePanel.onSelectionChanged(function (item) {
                if (item) {
                    _this.selectIndividualItem(item);
                }
                else {
                    _this.selectWholeSequence();
                }
            });
            this.timelinePanel.onItemsReorders(function (items) {
                _this.selectWholeSequence();
                _this.sequence.seqItems = items;
                _this.sequenceItemsChanged();
            });
        }
        SequenceEditorPage.prototype.setClip = function (sequence) {
            this.sequence = sequence;
            this.clipHeading.setText(sequence.name);
            this.clipInfoPanel.setClip(sequence);
            this.timelinePanel.setSequence(sequence);
            this.openSequenceInPlayer();
        };
        SequenceEditorPage.prototype.saveSequence = function () {
            // Strip out text and frames parts of timecodes (we do all the calculations in seconds
            // so frames and text are not guarateed to be correct)
            var _this = this;
            TimecodeUtil.simplify(this.sequence["in"]), TimecodeUtil.simplify(this.sequence.out), TimecodeUtil.simplify(this.sequence.duration), this.sequence.seqItems.forEach(function (seqItem) {
                TimecodeUtil.simplify(seqItem.seqIn);
                TimecodeUtil.simplify(seqItem.seqOut);
                TimecodeUtil.simplify(seqItem.clipIn);
                TimecodeUtil.simplify(seqItem.clipOut);
            });
            var updatedClip = {
                "ID": this.sequenceId,
                "in": this.sequence["in"],
                "out": this.sequence.out,
                "duration": this.sequence.duration,
                "seqItems": this.sequence.seqItems
            };
            $catdv.saveClip(updatedClip, function () {
                document.location.href = "clip-details.jsp?id=" + _this.sequenceId;
            });
        };
        SequenceEditorPage.prototype.addItems = function (clips) {
            //            var lastSeqItem = this.sequence.seqItems[this.sequence.seqItems.length - 1];
            var _this = this;
            //            var tc: Timecode = { secs: lastSeqItem.seqOut.secs, fmt: lastSeqItem.seqOut.fmt };
            clips.forEach(function (clip) {
                var duration = clip.duration2 || clip.duration;
                var seqItem = {
                    catalogID: clip.catalogID,
                    seqID: _this.sequence.ID,
                    seqIn: { secs: 0.0, fmt: _this.sequence["in"].fmt },
                    seqOut: { secs: 0.0, fmt: _this.sequence["in"].fmt },
                    clipID: clip.ID,
                    clipName: clip.name,
                    clipTape: clip.tape,
                    clipIn: clip.in2 || clip["in"],
                    clipOut: clip.out2 || clip.out,
                    clipMediaID: clip.sourceMediaID,
                    track: "AV1",
                    mediaStart: clip.media ? clip.media.start : clip["in"],
                    mediaEnd: clip.media ? clip.media.end : clip.out,
                    mediaAspectRatio: clip.media ? clip.media.aspectRatio : 16 / 9
                };
                //                tc.secs += duration.secs;
                _this.sequence.seqItems.push(seqItem);
            });
            this.sequenceItemsChanged();
        };
        SequenceEditorPage.prototype.sequenceInOutsChanged = function () {
            this.recalculateSequenceInOuts();
            this.clipInfoPanel.updateUI();
            this.timelinePanel.sequenceInOutsChanged();
            this.sequencePlayer.updateSequenceItems(this.sequence.seqItems.map(function (seqItem) {
                return {
                    clipIn: seqItem.clipIn.secs - seqItem.mediaStart.secs,
                    clipOut: seqItem.clipOut.secs - seqItem.mediaStart.secs,
                    aspectRatio: seqItem.mediaAspectRatio
                };
            }));
        };
        // The set of items in the sequence has change
        SequenceEditorPage.prototype.sequenceItemsChanged = function () {
            var _this = this;
            this.selectWholeSequence();
            this.recalculateSequenceInOuts();
            this.clipInfoPanel.updateUI();
            this.timelinePanel.sequenceItemsChanged();
            this.openSequenceInPlayer(function () {
                _this.setPlayheadTime(3600);
            });
        };
        SequenceEditorPage.prototype.openSequenceInPlayer = function (callback) {
            var _this = this;
            if (callback === void 0) { callback = null; }
            // Convert SequenceItems into simplied item descriptors used by SequencePlayer           
            var playerItems = this.sequence.seqItems.map(function (seqItem) {
                return {
                    url: $catdv.getApiUrl("media/" + seqItem.clipMediaID + "/clip.mov"),
                    clipIn: seqItem.clipIn.secs - seqItem.mediaStart.secs,
                    clipOut: seqItem.clipOut.secs - seqItem.mediaStart.secs,
                    aspectRatio: seqItem.mediaAspectRatio
                };
            });
            this.sequencePlayer.openSequence(playerItems, ServerSettings.useQuickTime, function () {
                _this.playerControls.setClipAndPlayer(_this.sequence, _this.sequencePlayer, { MarkInOut: false, CreateMarkers: false, CreateSubClip: false, FullScreen: false });
                _this.playerControls.focus();
                if (callback)
                    callback();
            });
        };
        // User has clicked on an individual item in the sequence
        SequenceEditorPage.prototype.selectIndividualItem = function (item) {
            this.selectedItem = item;
            this.clipInfoPanel.setSelectedItem(item);
            this.itemPlayer = this.sequencePlayer.lockItemPlayer(this.sequence.seqItems.indexOf(item));
            // synthesise clip from sequenceItem
            var selectedClip = {
                "name": item.clipName,
                "in": item.mediaStart,
                "out": item.mediaEnd,
                "duration": { secs: item.mediaEnd.secs - item.mediaStart.secs, fmt: item.mediaStart.fmt },
                "in2": item.clipIn,
                "out2": item.clipOut,
                "duration2": { secs: item.clipOut.secs - item.clipIn.secs, fmt: item.clipIn.fmt }
            };
            this.playerControls.setClipAndPlayer(selectedClip, this.itemPlayer, { MarkInOut: true, CreateMarkers: false, CreateSubClip: false, FullScreen: false });
            // Delay setting item on timelinePanel until after we've locked the player to avoid event confusion
            this.timelinePanel.selectIndividualItem(item);
            // Move item playhead to match position of sequence playhead
            //  var playheadTime = this.timelinePanel.getPlayheadTime().secs;
            this.itemPlayer.setCurrentTime(item.clipIn.secs - item.mediaStart.secs);
            this.playerControls.setCurrentTime({ secs: (item.clipIn.secs - item.mediaStart.secs) + item.mediaStart.secs, fmt: item.clipIn.fmt });
            this.playerControls.focus();
            this.deleteItemBtn.setEnabled(this.sequence.seqItems.length > 1);
        };
        // User has clicked away, or selected sequence in the info tabs
        SequenceEditorPage.prototype.selectWholeSequence = function () {
            var playheadTime = null;
            if (this.selectedItem) {
                //Calculate the equivalent position of the playhead in the whole sequence
                playheadTime = Math.max(Math.min(this.itemPlayer.getCurrentTime(), this.selectedItem.clipOut.secs), this.selectedItem.clipIn.secs);
                playheadTime = playheadTime - this.selectedItem.clipIn.secs + this.selectedItem.seqIn.secs;
            }
            this.selectedItem = null;
            this.itemPlayer = null;
            this.timelinePanel.selectWholeSequence();
            this.clipInfoPanel.setSelectedItem(null);
            this.sequencePlayer.unlockItemPlayer();
            this.deleteItemBtn.setEnabled(false);
            this.playerControls.setClipAndPlayer(this.sequence, this.sequencePlayer, { MarkInOut: false, CreateMarkers: false, CreateSubClip: false, FullScreen: false });
            this.playerControls.focus();
            if (playheadTime != null) {
                // Move the playhead to the equivalent of its current position in the overal sequence
                this.setPlayheadTime(playheadTime);
            }
        };
        SequenceEditorPage.prototype.setPlayheadTime = function (playheadTime) {
            this.sequencePlayer.setCurrentTime(playheadTime - this.sequence["in"].secs);
            this.playerControls.setCurrentTime({ secs: playheadTime, fmt: this.sequence["in"].fmt });
            this.timelinePanel.setPlayheadTime({ secs: playheadTime, fmt: this.sequence["in"].fmt });
        };
        SequenceEditorPage.prototype.recalculateSequenceInOuts = function () {
            var startTime = this.sequence["in"].secs;
            var currentTime = startTime;
            this.sequence.seqItems.forEach(function (seqItem, i) {
                var duration = seqItem.clipOut.secs - seqItem.clipIn.secs;
                seqItem.seqIn.secs = currentTime;
                currentTime += duration;
                seqItem.seqOut.secs = currentTime;
            });
            this.sequence.out.secs = currentTime;
            this.sequence.duration.secs = currentTime - startTime;
        };
        return SequenceEditorPage;
    })();
    ui.SequenceEditorPage = SequenceEditorPage;
    var ClipInfoPanel = (function (_super) {
        __extends(ClipInfoPanel, _super);
        function ClipInfoPanel(element) {
            var _this = this;
            _super.call(this, element);
            this.infoTabs = new TabPanel("infoTabs");
            this.lblSequenceName = new Label("lblSequenceName");
            this.lblSequenceDuration = new Label("lblSequenceDuration");
            this.lblSequenceIn = new Label("lblSequenceIn");
            this.lblSequenceOut = new Label("lblSequenceOut");
            this.lblItemName = new Label("lblItemName");
            this.lblItemIn = new Label("lblItemIn");
            this.lblItemOut = new Label("lblItemOut");
            this.lblItemDuration = new Label("lblItemDuration");
            this.lblItemIn2 = new Label("lblItemIn2");
            this.lblItemOut2 = new Label("lblItemOut2");
            this.lblItemDuration2 = new Label("lblItemDuration2");
            this.sequence = null;
            this.item = null;
            this.selectionChangedHandler = null;
            this.infoTabs.onTabSelected(function (selectedTabName) {
                if (_this.selectionChangedHandler)
                    _this.selectionChangedHandler(selectedTabName);
            });
        }
        ClipInfoPanel.prototype.setClip = function (sequence) {
            this.sequence = sequence;
            this.updateUI();
        };
        ClipInfoPanel.prototype.setSelectedItem = function (item) {
            this.item = item;
            if (item) {
                this.infoTabs.showTab("clipTab");
            }
            else {
                this.infoTabs.showTab("seqTab");
            }
            this.updateUI();
        };
        ClipInfoPanel.prototype.updateUI = function () {
            this.lblSequenceName.setText(this.sequence.name);
            this.lblSequenceDuration.setText(TimecodeUtil.formatTimecode(this.sequence.duration));
            this.lblSequenceIn.setText(TimecodeUtil.formatTimecode(this.sequence["in"]));
            this.lblSequenceOut.setText(TimecodeUtil.formatTimecode(this.sequence.out));
            if (this.item) {
                this.lblItemName.setText(this.item.clipName);
                this.lblItemIn.setText(TimecodeUtil.formatTimecode(this.item.mediaStart));
                this.lblItemOut.setText(TimecodeUtil.formatTimecode(this.item.mediaEnd));
                this.lblItemDuration.setText(TimecodeUtil.formatTimecode({ secs: this.item.mediaEnd.secs - this.item.mediaStart.secs, fmt: this.item.mediaStart.fmt }));
                this.lblItemIn2.setText(TimecodeUtil.formatTimecode(this.item.seqIn) + " (" + TimecodeUtil.formatTimecode(this.item.clipIn) + ")");
                this.lblItemOut2.setText(TimecodeUtil.formatTimecode(this.item.seqOut) + " (" + TimecodeUtil.formatTimecode(this.item.clipOut) + ")");
                this.lblItemDuration2.setText(TimecodeUtil.formatTimecode({ secs: this.item.clipOut.secs - this.item.clipIn.secs, fmt: this.item.clipIn.fmt }));
            }
        };
        ClipInfoPanel.prototype.onSelectionChanged = function (selectionChangedHandler) {
            this.selectionChangedHandler = selectionChangedHandler;
        };
        return ClipInfoPanel;
    })(Panel);
    var Playhead = (function (_super) {
        __extends(Playhead, _super);
        function Playhead(element, minPosition, maxPosition) {
            _super.call(this, element, 1 /* Horizontal */, minPosition, maxPosition);
            this.rule = new Element($("<div class='rule'>").appendTo(this.$element));
            this.head = new Element($("<div class='head'>").appendTo(this.$element));
        }
        Playhead.prototype.setText = function (labelText) {
            this.head.$element.text(labelText);
        };
        return Playhead;
    })(DraggableElement);
    var TimelinePanel = (function (_super) {
        __extends(TimelinePanel, _super);
        function TimelinePanel(element) {
            var _this = this;
            _super.call(this, element);
            this.trackPanels = [];
            this.playheadTime = { secs: 0.0, fmt: 25 };
            this.sequence = null;
            this.selectedItem = null;
            this.playheadMovedHandler = null;
            this.selectionChangedHandler = null;
            this.reorderedHandler = null;
            this.$element.addClass("seq-timeline");
            var $timelineContainer = $("<div class='scale-container'>").appendTo(this.$element);
            this.timelineScale = new Element($("<div class='scale'>").appendTo($timelineContainer));
            this.leftMargin = this.timelineScale.getLeft();
            // just one track for now
            var trackPanel = TrackPanel.create(this);
            trackPanel.onSelectionChanged(function (item) {
                // this.selectedItem = item; - delay setting item until the page calls either setWholeSequence() or setIndividualItem()
                // so that we can lock the item player first. Otherwise setPlayheadTime() thinks the last even from teh sequence player
                // when it stops, is from an item player. Propabably should find a better way to do this,
                if (_this.selectionChangedHandler)
                    _this.selectionChangedHandler(item);
            });
            trackPanel.onItemsReorders(function (items) {
                if (_this.reorderedHandler)
                    _this.reorderedHandler(items);
            });
            this.trackPanels.push(trackPanel);
            var $playhead = $("<div class='playhead'>").appendTo(this.$element);
            this.playheadOffset = $playhead.width() / 2;
            this.playhead = new Playhead($playhead, this.leftMargin - this.playheadOffset, this.leftMargin + this.getTrackWidth() + this.playheadOffset);
            this.playhead.onDrag(function (evt) {
                _this.playheadTime = _this.positionToMovieTime(evt.position + _this.playheadOffset - _this.leftMargin);
                Console.debug("playhead.onDrag() - playheadTime:" + _this.playheadTime.secs);
                _this.playhead.setText(TimecodeUtil.formatTimecode(_this.playheadTime));
                if (_this.playheadMovedHandler) {
                    _this.playheadMovedHandler(_this.playheadTime);
                }
            });
        }
        TimelinePanel.prototype.onPlayheadMoved = function (playheadMovedHandler) {
            this.playheadMovedHandler = playheadMovedHandler;
        };
        TimelinePanel.prototype.onSelectionChanged = function (selectionChangedHandler) {
            this.selectionChangedHandler = selectionChangedHandler;
        };
        TimelinePanel.prototype.onItemsReorders = function (reorderedHandler) {
            this.reorderedHandler = reorderedHandler;
        };
        TimelinePanel.prototype.setSequence = function (sequence) {
            this.sequence = sequence;
            this.renderTimelineScale();
            // just one track for now
            this.trackPanels[0].setTrackItems(sequence, "AV1", this.sequence.seqItems);
            this.playhead.setText(TimecodeUtil.formatTimecode(this.sequence["in"]));
            //            this.playhead.show();
        };
        TimelinePanel.prototype.getPlayheadTime = function () {
            return this.playheadTime;
        };
        TimelinePanel.prototype.setPlayheadTime = function (playheadTime) {
            var tc = { secs: playheadTime.secs, fmt: playheadTime.fmt };
            // If single item selected then need to constrain playhead to that item
            if (this.selectedItem != null) {
                // If item is selected then playheadTime will be in item time so need to convert to sequence time
                var sequenceTime = tc.secs - this.selectedItem.clipIn.secs + this.selectedItem.seqIn.secs;
                tc.secs = Math.min(Math.max(sequenceTime, this.selectedItem.seqIn.secs), this.selectedItem.seqOut.secs);
            }
            this.playheadTime = tc;
            var playheadPosition = this.movieTimeToPosition(this.playheadTime.secs);
            this.playhead.setLeft(playheadPosition - this.playheadOffset + this.leftMargin);
            this.playhead.setText(TimecodeUtil.formatTimecode(this.playheadTime));
        };
        TimelinePanel.prototype.currentlyDraggingPlayhead = function () {
            return this.playhead.isDragging();
        };
        TimelinePanel.prototype.sequenceItemsChanged = function () {
            this.renderTimelineScale();
            this.trackPanels[0].itemsUpdated(this.sequence.seqItems);
        };
        TimelinePanel.prototype.sequenceInOutsChanged = function () {
            this.renderTimelineScale();
            this.trackPanels.forEach(function (trackPanel) { return trackPanel.itemInOutsUpdated(); });
        };
        TimelinePanel.prototype.selectIndividualItem = function (seqItem) {
            this.selectedItem = seqItem;
            this.trackPanels.forEach(function (trackPanel) { return trackPanel.selectItem(seqItem); });
            // Move the playhead to inside the item if necessary
            if (!this.playheadTime.secs || (this.playheadTime.secs < this.selectedItem.seqIn.secs) || (this.playheadTime.secs > this.selectedItem.seqOut.secs)) {
                this.playheadTime = { secs: this.selectedItem.seqIn.secs, fmt: this.selectedItem.seqIn.fmt };
                var playheadPosition = this.movieTimeToPosition(this.playheadTime.secs);
                this.playhead.setLeft(playheadPosition - this.playheadOffset + this.leftMargin);
                this.playhead.setText(TimecodeUtil.formatTimecode(this.playheadTime));
            }
            var minPos = this.movieTimeToPosition(this.selectedItem.seqIn.secs);
            var maxPos = this.movieTimeToPosition(this.selectedItem.seqOut.secs);
            this.playhead.setLimits(this.leftMargin + minPos - this.playheadOffset, this.leftMargin + maxPos + this.playheadOffset);
        };
        TimelinePanel.prototype.selectWholeSequence = function () {
            this.selectedItem = null;
            this.trackPanels.forEach(function (trackPanel) { return trackPanel.selectedWholeTrack(); });
            this.playhead.setLimits(this.leftMargin - this.playheadOffset, this.leftMargin + this.getTrackWidth() + this.playheadOffset);
            this.playhead.setText(TimecodeUtil.formatTimecode(this.playheadTime));
        };
        TimelinePanel.prototype.renderTimelineScale = function () {
            var duration = this.sequence.out.secs - this.sequence["in"].secs;
            // Calculate time between legends. No more than 10 legends in total 
            var secondsPerLegend = duration / 10;
            // Round it up to the next 'nice' number of seconds e.g. 15, 30, 60 etc.
            var niceSeconds = [1, 2, 5, 10, 30, 60, 120, 300, 600, 1200, 3600];
            for (var i = 0; i < niceSeconds.length; i++) {
                if ((niceSeconds[i] > secondsPerLegend) || (i == niceSeconds.length - 1)) {
                    secondsPerLegend = niceSeconds[i];
                    break;
                }
            }
            var time = Math.floor(this.sequence["in"].secs / secondsPerLegend) * secondsPerLegend;
            this.timelineScale.$element.empty();
            var tc = { secs: time, fmt: this.sequence["in"].fmt };
            while (time < this.sequence.out.secs) {
                tc.secs = time;
                $("<span class='legend'>" + TimecodeUtil.formatTimecode(tc) + "</span>").appendTo(this.timelineScale.$element).css({
                    "left": this.movieTimeToPosition(time)
                });
                time += secondsPerLegend;
            }
            var pixelsPerSecond = this.getWidth() / duration;
        };
        TimelinePanel.prototype.timespanToLength = function (timespan) {
            return (timespan / this.sequence.duration.secs) * this.getTrackWidth();
        };
        // Convert a position in pixels along the timeline into an absolute timecode, in seconds.
        TimelinePanel.prototype.positionToMovieTime = function (position) {
            return { secs: ((position / this.getTrackWidth()) * this.sequence.duration.secs) + this.sequence["in"].secs, fmt: this.sequence.duration.fmt };
        };
        // Convert an absolute timecode, in seconds  into a position in pixels along the timeline.
        TimelinePanel.prototype.movieTimeToPosition = function (movieTimeSecs) {
            return Math.min((movieTimeSecs - this.sequence["in"].secs) / this.sequence.duration.secs, 1.0) * this.getTrackWidth();
        };
        TimelinePanel.prototype.getTrackWidth = function () {
            return this.timelineScale.getWidth(); //  /* - this.playhead.getWidth() */ - 2;
        };
        return TimelinePanel;
    })(Panel);
    var TrackItem = (function (_super) {
        __extends(TrackItem, _super);
        function TrackItem(element, seqItem, min_x, max_x) {
            _super.call(this, element, 1 /* Horizontal */, min_x, max_x);
            this.seqItem = seqItem;
        }
        return TrackItem;
    })(DraggableElement);
    var TrackPanel = (function (_super) {
        __extends(TrackPanel, _super);
        function TrackPanel(element) {
            var _this = this;
            _super.call(this, element);
            this.trackItems = [];
            this.sequence = null;
            this.selectionChangedHandler = null;
            this.reorderedHandler = null;
            this.trackNameLabel = new Label($("<div class='track-label'>").appendTo(this.$element));
            this.trackNameLabel.onClick(function (evt) {
                // deselect all
                _this.selectedWholeTrack();
                if (_this.selectionChangedHandler) {
                    _this.selectionChangedHandler(null);
                }
            });
            this.track = new Element($("<div class='track'>").appendTo(this.$element));
        }
        TrackPanel.create = function (container) {
            return new TrackPanel($("<div class='track-container'>").appendTo(container.$element));
        };
        TrackPanel.prototype.onSelectionChanged = function (selectionChangedHandler) {
            this.selectionChangedHandler = selectionChangedHandler;
        };
        TrackPanel.prototype.onItemsReorders = function (reorderedHandler) {
            this.reorderedHandler = reorderedHandler;
        };
        TrackPanel.prototype.setTrackItems = function (sequence, trackName, seqItems) {
            this.sequence = sequence;
            this.trackNameLabel.setText(trackName);
            this.itemsUpdated(seqItems);
        };
        TrackPanel.prototype.itemsUpdated = function (seqItems) {
            var _this = this;
            this.track.$element.empty();
            this.trackItems = [];
            seqItems.forEach(function (seqItem) {
                var trackItem = new TrackItem($("<div class='item'>").appendTo(_this.track.$element), seqItem, 0, _this.track.getWidth());
                trackItem.onClick(function (evt) {
                    Console.debug("TrackPanel.trackItem.onClick()");
                    _this.trackItem_onClick(trackItem);
                });
                trackItem.onDrag(function (evt) {
                    Console.debug("TrackPanel.trackItem.onDrag()");
                    _this.trackItem_onDrag(evt, trackItem);
                });
                trackItem.onDrop(function (evt) {
                    Console.debug("TrackPanel.trackItem.onDrop()");
                    _this.trackItem_onDrop(evt, trackItem);
                });
                _this.trackItems.push(trackItem);
            });
            this.updateTrackItemPositions();
        };
        TrackPanel.prototype.itemInOutsUpdated = function () {
            this.updateTrackItemPositions();
        };
        TrackPanel.prototype.selectItem = function (seqItem) {
            var trackItem;
            this.trackItems.forEach(function (ti) {
                if (ti.seqItem == seqItem)
                    trackItem = ti;
            });
            if (trackItem) {
                this.$element.find(".item").removeClass("selected");
                this.$element.find(".item").addClass("deselected");
                trackItem.$element.removeClass("deselected").addClass("selected");
            }
        };
        TrackPanel.prototype.selectedWholeTrack = function () {
            this.$element.find(".item").removeClass("deselected").removeClass("selected");
        };
        TrackPanel.prototype.trackItem_onClick = function (trackItem) {
            // deselect everything
            this.$element.find(".item").removeClass("selected");
            this.$element.find(".item").addClass("deselected");
            trackItem.$element.removeClass("deselected").addClass("selected");
            if (this.selectionChangedHandler) {
                this.selectionChangedHandler(trackItem.seqItem);
            }
        };
        TrackPanel.prototype.trackItem_onDrag = function (evt, trackItem) {
            // provide feedback by moving the other items out of the way of the dragged one
            this.calculateDraggedItemPosition(trackItem, evt.position, true);
        };
        TrackPanel.prototype.trackItem_onDrop = function (evt, trackItem) {
            this.trackItems = this.calculateDraggedItemPosition(trackItem, evt.position, false);
            this.reorderedHandler(this.trackItems.map(function (trackItem) { return trackItem.seqItem; }));
        };
        TrackPanel.prototype.calculateDraggedItemPosition = function (dragItem, dragItemPosition, updateDOM) {
            var _this = this;
            var reorderdItems = [];
            var time = this.sequence["in"].secs;
            var insertedDraggedElement = false;
            this.trackItems.forEach(function (item) {
                var pos = _this.movieTimeToPosition(time);
                if (item !== dragItem) {
                    var width = item.getWidth();
                    if (!insertedDraggedElement && (pos + (width / 2) > dragItemPosition)) {
                        // insert dragged element here    
                        time += dragItem.seqItem.seqOut.secs - dragItem.seqItem.seqIn.secs;
                        pos = _this.movieTimeToPosition(time);
                        insertedDraggedElement = true;
                        reorderdItems.push(dragItem);
                    }
                    if (updateDOM) {
                        item.css({ "left": pos });
                    }
                    time += item.seqItem.seqOut.secs - item.seqItem.seqIn.secs;
                    reorderdItems.push(item);
                }
            });
            if (!insertedDraggedElement) {
                reorderdItems.push(dragItem);
            }
            return reorderdItems;
        };
        TrackPanel.prototype.updateTrackItemPositions = function () {
            var _this = this;
            this.trackItems.forEach(function (item) {
                var left = _this.movieTimeToPosition(item.seqItem.seqIn.secs);
                var right = _this.movieTimeToPosition(item.seqItem.seqOut.secs);
                var width = right - left;
                item.css({
                    "left": left,
                    "width": right - left
                });
                // Draggable element needs to recalculate the bounds if the item changes size
                item.setLimits(0, _this.track.getWidth());
                ThumbnailLookup.getThumbnail(item.seqItem.clipMediaID, item.seqItem.clipIn.secs - item.seqItem.mediaStart.secs, function (thumbnailID) {
                    item.css({
                        "background": "url(" + $catdv.getApiUrl("thumbnail/" + thumbnailID) + ")  center repeat-x",
                        "background-size": "auto 100%"
                    });
                });
            });
        };
        TrackPanel.prototype.timespanToLength = function (timespan) {
            return (timespan / this.sequence.duration.secs) * this.getTrackWidth();
        };
        // Convert a position in pixels along the timeline into an absolute timecode, in seconds.
        TrackPanel.prototype.positionToMovieTime = function (position) {
            return { secs: ((position / this.getTrackWidth()) * this.sequence.duration.secs) + this.sequence["in"].secs, fmt: this.sequence.duration.fmt };
        };
        // Convert an absolute timecode, in seconds  into a position in pixels along the timeline.
        TrackPanel.prototype.movieTimeToPosition = function (movieTimeSecs) {
            return Math.min((movieTimeSecs - this.sequence["in"].secs) / this.sequence.duration.secs, 1.0) * this.getTrackWidth();
        };
        TrackPanel.prototype.getTrackWidth = function () {
            return this.track.getWidth() - 2;
        };
        return TrackPanel;
    })(Panel);
    var ThumbnailLookup = (function () {
        function ThumbnailLookup() {
        }
        ThumbnailLookup.getThumbnail = function (mediaID, time, callback) {
            var thumbnails = ThumbnailLookup.thumbnailLookup[mediaID];
            if (thumbnails) {
                callback(ThumbnailLookup.findThumbnailAtTime(thumbnails, time));
            }
            else {
                $catdv.getThumbnailsForMedia(mediaID, function (thumbnails) {
                    ThumbnailLookup.thumbnailLookup[mediaID] = thumbnails;
                    callback(ThumbnailLookup.findThumbnailAtTime(thumbnails, time));
                });
            }
        };
        ThumbnailLookup.findThumbnailAtTime = function (thumbnails, time) {
            thumbnails.forEach(function (thumbnail) {
                if (thumbnail.time >= time)
                    return thumbnail.ID;
            });
            return thumbnails.length > 0 ? thumbnails[0].ID : null;
        };
        ThumbnailLookup.thumbnailLookup = {};
        return ThumbnailLookup;
    })();
})(ui || (ui = {}));
