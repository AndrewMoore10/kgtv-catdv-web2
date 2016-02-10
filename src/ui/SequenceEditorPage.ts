module ui
{
    import Control = controls.Control;
    import Element = controls.Element;
    import DraggableElement = controls.DraggableElement;
    import DragElementEvent = controls.DragElementEvent;
    import Direction = controls.Direction;
    import Label = controls.Label;
    import Panel = controls.Panel;
    import Button = controls.Button;
    import Modal = controls.Modal;
    import VideoPlayer = controls.VideoPlayer;
    import SequencePlayer = controls.SequencePlayer;
    import ItemDescriptor = controls.ItemDescriptor;
    import PlayerEvent = controls.PlayerEvent;
    import TabPanel = controls.TabPanel;
    import Console = controls.Console;
    import Timer = controls.Timer;

    import ClipMediaPanel = ui.panels.ClipMediaPanel;
    import PlayerControls = ui.panels.PlayerControls;
    import NavigatorPanel = ui.panels.NavigatorPanel;
    import ClipListPanel = ui.panels.ClipListPanel;
    import ClipViewType = ui.panels.ClipViewType;
    import QueryBuilder = ui.panels.QueryBuilder;
    import NavbarLoginMenu = ui.panels.NavbarLoginMenu;

    import $catdv = catdv.RestApi;
    import Clip = catdv.Clip;
    import SequenceItem = catdv.SequenceItem;
    import Thumbnail = catdv.Thumbnail;
    import Timecode = catdv.Timecode;
    import TimecodeUtil = catdv.TimecodeUtil;

    import ServerSettings = logic.ServerSettings;

    export class SequenceEditorPage
    {
        private clipHeading = new Label("clipHeading");
        private playerControls = new PlayerControls("playerControls", { MarkInOut: false, CreateMarkers: false, CreateSubClip: false, FullScreen: false });
        private sequencePlayer = new SequencePlayer("sequencePlayer");
        private clipInfoPanel = new ClipInfoPanel("clipInfoPanel");
        private timelinePanel = new TimelinePanel("timelinePanel");
        private navbarLoginMenu = new NavbarLoginMenu("navbarLoginMenu");

        private addItemBtn = new Button("addItemBtn");
        private deleteItemBtn = new Button("deleteItemBtn");
        private clipSaveBtn = new Button("clipSaveBtn");
        private clipCancelBtn = new Button("clipCancelBtn");
        private addBtn = new Button("addBtn");
        private cancelAddBtn = new Button("cancelAddBtn");

        private addItemPanel = new Panel("addItemPanel");
        private clipList = new ClipListPanel("clipListPanel", null);
        private navigatorPanel = new NavigatorPanel("navigatorPanel", this.clipList);


        // Currently selected sequenceItem
        private selectedItem: SequenceItem
        // Reference to the VideoPlayer inside the sequencePlayer that is responsible for playing the currently selected sequence item. 
        private itemPlayer: VideoPlayer;

        private sequenceId;
        private sequence: Clip = null;

        private editSeqBtn = new Button("editSeqBtn");

        constructor()
        {
            this.sequenceId = $.urlParam("id");

            ServerSettings.load(() =>
            {
                $catdv.getClip(this.sequenceId, (clip) =>
                {
                    this.setClip(clip);
                });
            });

            this.addItemBtn.onClick((evt) =>
            {
                Modal.setOverlayShowing(true);
                this.addItemPanel.show();
            });
            this.deleteItemBtn.onClick((evt) =>
            {
                this.sequence.seqItems = this.sequence.seqItems.filter((item) => item !== this.selectedItem);
                this.sequenceItemsChanged();
            });
            this.clipSaveBtn.onClick((evt) =>
            {
                this.saveSequence();
            });
            this.clipCancelBtn.onClick((evt) =>
            {
                document.location.href = "clip-details.jsp?id=" + this.sequenceId;
            });

            this.addBtn.onClick((evt) =>
            {
                this.addItemPanel.hide();
                var clips = this.clipList.getSelectedClips();
                this.addItems(clips);
                Modal.setOverlayShowing(false);
            });

            this.cancelAddBtn.onClick((evt) =>
            {
                this.addItemPanel.hide();
                Modal.setOverlayShowing(false);
            });

            // NOTE: we get both user play head moves and player head move events via the 
            // player controls so we don't need to listen to the player itself.
            this.playerControls.onPlayheadMoved((movieTime: Timecode) => 
            {
                if (!this.timelinePanel.currentlyDraggingPlayhead())
                {
                    this.timelinePanel.setPlayheadTime(movieTime);
                }
            });

            this.playerControls.onSetMarkIn((evt) =>
            {
                if (this.selectedItem)
                {
                    this.selectedItem.clipIn = this.playerControls.getCurrentTime();
                    if (this.selectedItem.clipIn.secs >= this.selectedItem.clipOut.secs)
                    {
                        this.selectedItem.clipOut.secs = this.selectedItem.clipIn.secs + 0.15;
                    }
                    this.clipInfoPanel.updateUI();
                    this.sequenceInOutsChanged();
                }
            });

            this.playerControls.onSetMarkOut((evt) =>
            {
                if (this.selectedItem)
                {
                    this.selectedItem.clipOut = this.playerControls.getCurrentTime();
                    if (this.selectedItem.clipOut.secs <= this.selectedItem.clipIn.secs)
                    {
                        this.selectedItem.clipIn.secs = this.selectedItem.clipIn.secs - 0.1;
                    }
                    this.clipInfoPanel.updateUI();
                    this.sequenceInOutsChanged();
                }
            });

            this.clipInfoPanel.onSelectionChanged((selectedTab) =>
            {
                if (selectedTab == "seqTab")
                {
                    this.selectWholeSequence();
                }
            });

            this.timelinePanel.onPlayheadMoved((movieTime) =>
            {
                if (this.selectedItem)
                {
                    var itemTime = { secs: movieTime.secs - this.selectedItem.seqIn.secs + this.selectedItem.clipIn.secs, fmt: movieTime.fmt };
                    this.itemPlayer.setCurrentTime(itemTime.secs - this.selectedItem.mediaStart.secs);
                    this.playerControls.setCurrentTime(itemTime);
                }
                else
                {
                    this.sequencePlayer.setCurrentTime(movieTime.secs - this.sequence["in"].secs);
                    this.playerControls.setCurrentTime(movieTime);
                }
            });

            this.timelinePanel.onSelectionChanged((item) => 
            {
                if (item)
                {
                    this.selectIndividualItem(item);
                }
                else
                {
                    this.selectWholeSequence();
                }
            });

            this.timelinePanel.onItemsReorders((items) =>
            {
                this.selectWholeSequence();
                this.sequence.seqItems = items;
                this.sequenceItemsChanged();
            });
        }

        private setClip(sequence: Clip)
        {
            this.sequence = sequence;
            this.clipHeading.setText(sequence.name);
            this.clipInfoPanel.setClip(sequence);
            this.timelinePanel.setSequence(sequence);

            this.openSequenceInPlayer();
        }

        private saveSequence()
        {
            // Strip out text and frames parts of timecodes (we do all the calculations in seconds
            // so frames and text are not guarateed to be correct)

            TimecodeUtil.simplify(this.sequence["in"]),
            TimecodeUtil.simplify(this.sequence.out),
            TimecodeUtil.simplify(this.sequence.duration),

            this.sequence.seqItems.forEach((seqItem) =>
            {
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

            $catdv.saveClip(updatedClip, () =>
            {
                document.location.href = "clip-details.jsp?id=" + this.sequenceId;
            });

        }

        private addItems(clips: Clip[])
        {
            //            var lastSeqItem = this.sequence.seqItems[this.sequence.seqItems.length - 1];

            //            var tc: Timecode = { secs: lastSeqItem.seqOut.secs, fmt: lastSeqItem.seqOut.fmt };

            clips.forEach((clip) =>
            {
                var duration = clip.duration2 || clip.duration;

                var seqItem: SequenceItem = {
                    catalogID: clip.catalogID,
                    seqID: this.sequence.ID,
                    seqIn: { secs: 0.0, fmt: this.sequence["in"].fmt },
                    seqOut: { secs: 0.0, fmt: this.sequence["in"].fmt },
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

                this.sequence.seqItems.push(seqItem);
            });

            this.sequenceItemsChanged();
        }

        private sequenceInOutsChanged()
        {
            this.recalculateSequenceInOuts();
            this.clipInfoPanel.updateUI();
            this.timelinePanel.sequenceInOutsChanged();
            this.sequencePlayer.updateSequenceItems(this.sequence.seqItems.map((seqItem) =>
            {
                return {
                    clipIn: seqItem.clipIn.secs - seqItem.mediaStart.secs,
                    clipOut: seqItem.clipOut.secs - seqItem.mediaStart.secs,
                    aspectRatio: seqItem.mediaAspectRatio
                };
            }));
        }

        // The set of items in the sequence has change
        private sequenceItemsChanged()
        {
            this.selectWholeSequence();
            this.recalculateSequenceInOuts();
            this.clipInfoPanel.updateUI();
            this.timelinePanel.sequenceItemsChanged();
            this.openSequenceInPlayer(() =>
            {
                this.setPlayheadTime(3600);
            });
        }

        private openSequenceInPlayer(callback: () => void = null)
        {
            // Convert SequenceItems into simplied item descriptors used by SequencePlayer           
            var playerItems: ItemDescriptor[] = this.sequence.seqItems.map((seqItem) =>
            {
                return {
                    url: $catdv.getApiUrl("media/" + seqItem.clipMediaID + "/clip.mov"),
                    clipIn: seqItem.clipIn.secs - seqItem.mediaStart.secs,
                    clipOut: seqItem.clipOut.secs - seqItem.mediaStart.secs,
                    aspectRatio: seqItem.mediaAspectRatio
                };
            });

            this.sequencePlayer.openSequence(playerItems, ServerSettings.useQuickTime, () =>
            {
                this.playerControls.setClipAndPlayer(this.sequence, this.sequencePlayer, { MarkInOut: false, CreateMarkers: false, CreateSubClip: false, FullScreen: false });
                this.playerControls.focus();
                if (callback) callback();
            });
        }

        // User has clicked on an individual item in the sequence
        private selectIndividualItem(item: SequenceItem)
        {
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
                "duration2": { secs: item.clipOut.secs - item.clipIn.secs, fmt: item.clipIn.fmt },
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
        }

        // User has clicked away, or selected sequence in the info tabs
        private selectWholeSequence()
        {
            var playheadTime: number = null;
            if (this.selectedItem)
            {
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
            this.playerControls.setClipAndPlayer(this.sequence, this.sequencePlayer,  { MarkInOut: false, CreateMarkers: false, CreateSubClip: false, FullScreen: false });
            this.playerControls.focus();

            if (playheadTime != null)
            {
                // Move the playhead to the equivalent of its current position in the overal sequence
                this.setPlayheadTime(playheadTime);
            }
        }

        private setPlayheadTime(playheadTime: number)
        {
            this.sequencePlayer.setCurrentTime(playheadTime - this.sequence["in"].secs);
            this.playerControls.setCurrentTime({ secs: playheadTime, fmt: this.sequence["in"].fmt });
            this.timelinePanel.setPlayheadTime({ secs: playheadTime, fmt: this.sequence["in"].fmt });
        }

        private recalculateSequenceInOuts()
        {
            var startTime = this.sequence["in"].secs;
            var currentTime = startTime;
            this.sequence.seqItems.forEach((seqItem, i) =>
            {
                var duration = seqItem.clipOut.secs - seqItem.clipIn.secs;
                seqItem.seqIn.secs = currentTime;
                currentTime += duration;
                seqItem.seqOut.secs = currentTime;
            });
            this.sequence.out.secs = currentTime;
            this.sequence.duration.secs = currentTime - startTime;
        }
    }

    class ClipInfoPanel extends Panel
    {
        private infoTabs = new TabPanel("infoTabs");

        private lblSequenceName = new Label("lblSequenceName");
        private lblSequenceDuration = new Label("lblSequenceDuration");
        private lblSequenceIn = new Label("lblSequenceIn");
        private lblSequenceOut = new Label("lblSequenceOut");

        private lblItemName = new Label("lblItemName");
        private lblItemIn = new Label("lblItemIn");
        private lblItemOut = new Label("lblItemOut");
        private lblItemDuration = new Label("lblItemDuration");
        private lblItemIn2 = new Label("lblItemIn2");
        private lblItemOut2 = new Label("lblItemOut2");
        private lblItemDuration2 = new Label("lblItemDuration2");

        private sequence: Clip = null;
        private item: SequenceItem = null;

        private selectionChangedHandler: (tabName: string) => void = null;

        constructor(element)
        {
            super(element);

            this.infoTabs.onTabSelected((selectedTabName) =>
            {
                if (this.selectionChangedHandler) this.selectionChangedHandler(selectedTabName);
            });
        }

        public setClip(sequence: Clip)
        {
            this.sequence = sequence;
            this.updateUI();
        }

        public setSelectedItem(item)
        {
            this.item = item;
            if (item)
            {
                this.infoTabs.showTab("clipTab");
            }
            else
            {
                this.infoTabs.showTab("seqTab");
            }
            this.updateUI();
        }


        public updateUI()
        {
            this.lblSequenceName.setText(this.sequence.name);
            this.lblSequenceDuration.setText(TimecodeUtil.formatTimecode(this.sequence.duration));
            this.lblSequenceIn.setText(TimecodeUtil.formatTimecode(this.sequence["in"]));
            this.lblSequenceOut.setText(TimecodeUtil.formatTimecode(this.sequence.out));

            if (this.item)
            {
                this.lblItemName.setText(this.item.clipName);
                this.lblItemIn.setText(TimecodeUtil.formatTimecode(this.item.mediaStart));
                this.lblItemOut.setText(TimecodeUtil.formatTimecode(this.item.mediaEnd));
                this.lblItemDuration.setText(TimecodeUtil.formatTimecode({ secs: this.item.mediaEnd.secs - this.item.mediaStart.secs, fmt: this.item.mediaStart.fmt }));
                this.lblItemIn2.setText(TimecodeUtil.formatTimecode(this.item.seqIn) + " (" + TimecodeUtil.formatTimecode(this.item.clipIn) + ")");
                this.lblItemOut2.setText(TimecodeUtil.formatTimecode(this.item.seqOut) + " (" + TimecodeUtil.formatTimecode(this.item.clipOut) + ")");
                this.lblItemDuration2.setText(TimecodeUtil.formatTimecode({ secs: this.item.clipOut.secs - this.item.clipIn.secs, fmt: this.item.clipIn.fmt }));
            }
        }


        public onSelectionChanged(selectionChangedHandler: (tabName: string) => void)
        {
            this.selectionChangedHandler = selectionChangedHandler;
        }
    }

    class Playhead extends DraggableElement
    {
        private head: Element;
        private rule: Element;

        constructor(element, minPosition: number, maxPosition: number)
        {
            super(element, Direction.Horizontal, minPosition, maxPosition);

            this.rule = new Element($("<div class='rule'>").appendTo(this.$element));
            this.head = new Element($("<div class='head'>").appendTo(this.$element));
        }

        public setText(labelText: string)
        {
            this.head.$element.text(labelText)
        }
    }

    class TimelinePanel extends Panel
    {
        private timelineScale: Element;
        private trackPanels: TrackPanel[] = [];
        private playhead: Playhead;
        private playheadTime: Timecode = { secs: 0.0, fmt: 25 };

        private playheadOffset: number; // Offset from left of playhead to vertical ruled line (width / 2)
        private leftMargin: number; // Offset to start of scale from left of control (with of track titles)

        private sequence: Clip = null;
        private selectedItem: SequenceItem = null;

        private playheadMovedHandler: (movietime: Timecode) => void = null;
        private selectionChangedHandler: (item: SequenceItem) => void = null;
        private reorderedHandler: (items: SequenceItem[]) => void = null;

        constructor(element)
        {
            super(element);

            this.$element.addClass("seq-timeline");

            var $timelineContainer = $("<div class='scale-container'>").appendTo(this.$element);
            this.timelineScale = new Element($("<div class='scale'>").appendTo($timelineContainer));

            this.leftMargin = this.timelineScale.getLeft();

            // just one track for now
            var trackPanel = TrackPanel.create(this);
            trackPanel.onSelectionChanged((item) =>
            {
                // this.selectedItem = item; - delay setting item until the page calls either setWholeSequence() or setIndividualItem()
                // so that we can lock the item player first. Otherwise setPlayheadTime() thinks the last even from teh sequence player
                // when it stops, is from an item player. Propabably should find a better way to do this,

                if (this.selectionChangedHandler) this.selectionChangedHandler(item);
            });

            trackPanel.onItemsReorders((items) => { if (this.reorderedHandler) this.reorderedHandler(items); });

            this.trackPanels.push(trackPanel);

            var $playhead = $("<div class='playhead'>").appendTo(this.$element);
            this.playheadOffset = $playhead.width() / 2;
            this.playhead = new Playhead($playhead, this.leftMargin - this.playheadOffset, this.leftMargin + this.getTrackWidth() + this.playheadOffset);
            this.playhead.onDrag((evt) =>
            {
                this.playheadTime = this.positionToMovieTime(evt.position + this.playheadOffset - this.leftMargin);
                Console.debug("playhead.onDrag() - playheadTime:" + this.playheadTime.secs);
                this.playhead.setText(TimecodeUtil.formatTimecode(this.playheadTime));
                if (this.playheadMovedHandler)
                {
                    this.playheadMovedHandler(this.playheadTime);
                }
            });
        }

        public onPlayheadMoved(playheadMovedHandler: (movietime: Timecode) => void)
        {
            this.playheadMovedHandler = playheadMovedHandler;
        }

        public onSelectionChanged(selectionChangedHandler: (item: SequenceItem) => void)
        {
            this.selectionChangedHandler = selectionChangedHandler;
        }

        public onItemsReorders(reorderedHandler: (items: SequenceItem[]) => void)
        {
            this.reorderedHandler = reorderedHandler;
        }

        public setSequence(sequence: Clip)
        {
            this.sequence = sequence;

            this.renderTimelineScale();

            // just one track for now
            this.trackPanels[0].setTrackItems(sequence, "AV1", this.sequence.seqItems);

            this.playhead.setText(TimecodeUtil.formatTimecode(this.sequence["in"]));
            //            this.playhead.show();
        }

        public getPlayheadTime(): Timecode
        {
            return this.playheadTime;
        }

        public setPlayheadTime(playheadTime: Timecode)
        {
            var tc = { secs: playheadTime.secs, fmt: playheadTime.fmt };

            // If single item selected then need to constrain playhead to that item
            if (this.selectedItem != null)
            {
                // If item is selected then playheadTime will be in item time so need to convert to sequence time
                var sequenceTime = tc.secs - this.selectedItem.clipIn.secs + this.selectedItem.seqIn.secs;
                tc.secs = Math.min(Math.max(sequenceTime, this.selectedItem.seqIn.secs), this.selectedItem.seqOut.secs);
            }

            this.playheadTime = tc;
            var playheadPosition = this.movieTimeToPosition(this.playheadTime.secs);
            this.playhead.setLeft(playheadPosition - this.playheadOffset + this.leftMargin);
            this.playhead.setText(TimecodeUtil.formatTimecode(this.playheadTime));
        }

        public currentlyDraggingPlayhead()
        {
            return this.playhead.isDragging();
        }

        public sequenceItemsChanged()
        {
            this.renderTimelineScale();
            this.trackPanels[0].itemsUpdated(this.sequence.seqItems);
        }

        public sequenceInOutsChanged()
        {
            this.renderTimelineScale();
            this.trackPanels.forEach((trackPanel) => trackPanel.itemInOutsUpdated());
        }

        public selectIndividualItem(seqItem: SequenceItem)
        {
            this.selectedItem = seqItem;
            this.trackPanels.forEach((trackPanel) => trackPanel.selectItem(seqItem));

            // Move the playhead to inside the item if necessary
            if (!this.playheadTime.secs || (this.playheadTime.secs < this.selectedItem.seqIn.secs) || (this.playheadTime.secs > this.selectedItem.seqOut.secs))
            {
                this.playheadTime = { secs: this.selectedItem.seqIn.secs, fmt: this.selectedItem.seqIn.fmt };
                var playheadPosition = this.movieTimeToPosition(this.playheadTime.secs);
                this.playhead.setLeft(playheadPosition - this.playheadOffset + this.leftMargin);
                this.playhead.setText(TimecodeUtil.formatTimecode(this.playheadTime));
            }
            var minPos = this.movieTimeToPosition(this.selectedItem.seqIn.secs);
            var maxPos = this.movieTimeToPosition(this.selectedItem.seqOut.secs);
            this.playhead.setLimits(this.leftMargin + minPos - this.playheadOffset, this.leftMargin + maxPos + this.playheadOffset);
        }

        public selectWholeSequence()
        {
            this.selectedItem = null;
            this.trackPanels.forEach((trackPanel) => trackPanel.selectedWholeTrack());

            this.playhead.setLimits(this.leftMargin - this.playheadOffset, this.leftMargin + this.getTrackWidth() + this.playheadOffset);
            this.playhead.setText(TimecodeUtil.formatTimecode(this.playheadTime));
        }

        private renderTimelineScale()
        {
            var duration = this.sequence.out.secs - this.sequence["in"].secs;

            // Calculate time between legends. No more than 10 legends in total 
            var secondsPerLegend = duration / 10;

            // Round it up to the next 'nice' number of seconds e.g. 15, 30, 60 etc.
            var niceSeconds = [1, 2, 5, 10, 30, 60, 120, 300, 600, 1200, 3600];
            for (var i = 0; i < niceSeconds.length; i++)
            {
                if ((niceSeconds[i] > secondsPerLegend) || (i == niceSeconds.length - 1))
                {
                    secondsPerLegend = niceSeconds[i];
                    break;
                }
            }

            var time = Math.floor(this.sequence["in"].secs / secondsPerLegend) * secondsPerLegend;

            this.timelineScale.$element.empty();
            var tc = { secs: time, fmt: this.sequence["in"].fmt };
            while (time < this.sequence.out.secs)
            {
                tc.secs = time;
                $("<span class='legend'>" + TimecodeUtil.formatTimecode(tc) + "</span>").appendTo(this.timelineScale.$element).css({
                    "left": this.movieTimeToPosition(time)
                });
                time += secondsPerLegend;
            }

            var pixelsPerSecond = this.getWidth() / duration;

        }

        private timespanToLength(timespan: number)
        {
            return (timespan / this.sequence.duration.secs) * this.getTrackWidth();
        }

        // Convert a position in pixels along the timeline into an absolute timecode, in seconds.
        private positionToMovieTime(position: number): Timecode
        {
            return { secs: ((position / this.getTrackWidth()) * this.sequence.duration.secs) + this.sequence["in"].secs, fmt: this.sequence.duration.fmt };
        }

        // Convert an absolute timecode, in seconds  into a position in pixels along the timeline.
        private movieTimeToPosition(movieTimeSecs: number): number
        {
            return Math.min((movieTimeSecs - this.sequence["in"].secs) / this.sequence.duration.secs, 1.0) * this.getTrackWidth();
        }

        private getTrackWidth()
        {
            return this.timelineScale.getWidth(); //  /* - this.playhead.getWidth() */ - 2;
        }
    }

    class TrackItem extends DraggableElement
    {
        public seqItem: SequenceItem;

        constructor(element: any, seqItem: SequenceItem, min_x: number, max_x: number)
        {
            super(element, Direction.Horizontal, min_x, max_x);
            this.seqItem = seqItem;
        }
    }

    class TrackPanel extends Panel
    {
        private trackNameLabel: Label;
        private track: Element;
        private trackItems: TrackItem[] = [];
        private sequence: Clip = null;

        private selectionChangedHandler: (item: SequenceItem) => void = null;
        private reorderedHandler: (items: SequenceItem[]) => void = null;

        constructor(element)
        {
            super(element);

            this.trackNameLabel = new Label($("<div class='track-label'>").appendTo(this.$element));
            this.trackNameLabel.onClick((evt) =>
            {
                // deselect all
                this.selectedWholeTrack();
                if (this.selectionChangedHandler)
                {
                    this.selectionChangedHandler(null);
                }
            });
            this.track = new Element($("<div class='track'>").appendTo(this.$element));
        }

        public static create(container: Element)
        {
            return new TrackPanel($("<div class='track-container'>").appendTo(container.$element));
        }

        public onSelectionChanged(selectionChangedHandler: (item: SequenceItem) => void)
        {
            this.selectionChangedHandler = selectionChangedHandler;
        }

        public onItemsReorders(reorderedHandler: (items: SequenceItem[]) => void)
        {
            this.reorderedHandler = reorderedHandler;
        }

        public setTrackItems(sequence: Clip, trackName: string, seqItems: SequenceItem[])
        {
            this.sequence = sequence;
            this.trackNameLabel.setText(trackName);
            this.itemsUpdated(seqItems);
        }

        public itemsUpdated(seqItems: SequenceItem[])
        {
            this.track.$element.empty();
            this.trackItems = [];

            seqItems.forEach((seqItem) =>
            {
                var trackItem = new TrackItem($("<div class='item'>").appendTo(this.track.$element), seqItem, 0, this.track.getWidth());
                trackItem.onClick((evt) =>
                {
                    Console.debug("TrackPanel.trackItem.onClick()");
                    this.trackItem_onClick(trackItem);
                });
                trackItem.onDrag((evt) =>
                {
                    Console.debug("TrackPanel.trackItem.onDrag()");
                    this.trackItem_onDrag(evt, trackItem);
                });
                trackItem.onDrop((evt) =>
                {
                    Console.debug("TrackPanel.trackItem.onDrop()");
                    this.trackItem_onDrop(evt, trackItem);
                });
                this.trackItems.push(trackItem);
            });

            this.updateTrackItemPositions();
        }

        public itemInOutsUpdated()
        {
            this.updateTrackItemPositions();
        }

        public selectItem(seqItem: SequenceItem)
        {
            var trackItem: TrackItem;
            this.trackItems.forEach((ti) => { if (ti.seqItem == seqItem) trackItem = ti; });
            if (trackItem)
            {
                this.$element.find(".item").removeClass("selected");
                this.$element.find(".item").addClass("deselected");
                trackItem.$element.removeClass("deselected").addClass("selected");
            }
        }

        public selectedWholeTrack()
        {
            this.$element.find(".item").removeClass("deselected").removeClass("selected");
        }

        private trackItem_onClick(trackItem: TrackItem)
        {
            // deselect everything
            this.$element.find(".item").removeClass("selected");
            this.$element.find(".item").addClass("deselected");
            trackItem.$element.removeClass("deselected").addClass("selected");

            if (this.selectionChangedHandler)
            {
                this.selectionChangedHandler(trackItem.seqItem);
            }
        }

        private trackItem_onDrag(evt: DragElementEvent, trackItem: TrackItem)
        {
            // provide feedback by moving the other items out of the way of the dragged one
            this.calculateDraggedItemPosition(trackItem, evt.position, true);
        }

        private trackItem_onDrop(evt: DragElementEvent, trackItem: TrackItem)
        {
            this.trackItems = this.calculateDraggedItemPosition(trackItem, evt.position, false);
            this.reorderedHandler(this.trackItems.map((trackItem) => trackItem.seqItem));
        }

        private calculateDraggedItemPosition(dragItem: TrackItem, dragItemPosition: number, updateDOM: boolean): TrackItem[]
        {
            var reorderdItems = [];

            var time: number = this.sequence["in"].secs;
            var insertedDraggedElement = false;

            this.trackItems.forEach((item) =>
            {
                var pos = this.movieTimeToPosition(time);

                if (item !== dragItem)
                {
                    var width = item.getWidth();

                    if (!insertedDraggedElement && (pos + (width / 2) > dragItemPosition))
                    {
                        // insert dragged element here    
                        time += dragItem.seqItem.seqOut.secs - dragItem.seqItem.seqIn.secs;
                        pos = this.movieTimeToPosition(time);
                        insertedDraggedElement = true;
                        reorderdItems.push(dragItem);
                    }

                    if (updateDOM)
                    {
                        item.css({ "left": pos });
                    }
                    time += item.seqItem.seqOut.secs - item.seqItem.seqIn.secs;
                    reorderdItems.push(item);
                }
            });
            if (!insertedDraggedElement)
            {
                reorderdItems.push(dragItem);
            }

            return reorderdItems;
        }

        private updateTrackItemPositions()
        {
            this.trackItems.forEach((item) =>
            {
                var left = this.movieTimeToPosition(item.seqItem.seqIn.secs);
                var right = this.movieTimeToPosition(item.seqItem.seqOut.secs);
                var width = right - left;
                item.css({
                    "left": left,
                    "width": right - left,
                });

                // Draggable element needs to recalculate the bounds if the item changes size
                item.setLimits(0, this.track.getWidth());

                ThumbnailLookup.getThumbnail(item.seqItem.clipMediaID, item.seqItem.clipIn.secs - item.seqItem.mediaStart.secs, (thumbnailID: number) =>
                {
                    item.css({
                        "background": "url(" + $catdv.getApiUrl("thumbnail/" + thumbnailID) + ")  center repeat-x",
                        "background-size": "auto 100%"
                    });
                });
            });
        }


        private timespanToLength(timespan: number)
        {
            return (timespan / this.sequence.duration.secs) * this.getTrackWidth();
        }

        // Convert a position in pixels along the timeline into an absolute timecode, in seconds.
        private positionToMovieTime(position: number): Timecode
        {
            return { secs: ((position / this.getTrackWidth()) * this.sequence.duration.secs) + this.sequence["in"].secs, fmt: this.sequence.duration.fmt };
        }

        // Convert an absolute timecode, in seconds  into a position in pixels along the timeline.
        private movieTimeToPosition(movieTimeSecs: number): number
        {
            return Math.min((movieTimeSecs - this.sequence["in"].secs) / this.sequence.duration.secs, 1.0) * this.getTrackWidth();
        }

        private getTrackWidth()
        {
            return this.track.getWidth() /* - this.playhead.getWidth() */ - 2;
        }

    }

    class ThumbnailLookup 
    {
        private static thumbnailLookup: { [mediaID: number]: Thumbnail[] } = {};

        public static getThumbnail(mediaID: number, time: number, callback: (thumbnailId: number) => void)
        {
            var thumbnails = ThumbnailLookup.thumbnailLookup[mediaID];
            if (thumbnails)
            {
                callback(ThumbnailLookup.findThumbnailAtTime(thumbnails, time));
            }
            else
            {
                $catdv.getThumbnailsForMedia(mediaID, (thumbnails) =>
                {
                    ThumbnailLookup.thumbnailLookup[mediaID] = thumbnails;
                    callback(ThumbnailLookup.findThumbnailAtTime(thumbnails, time));
                });
            }
        }

        private static findThumbnailAtTime(thumbnails: Thumbnail[], time: number): number
        {
            thumbnails.forEach((thumbnail) =>
            {
                if (thumbnail.time >= time) return thumbnail.ID;
            });
            return thumbnails.length > 0 ? thumbnails[0].ID : null;
        }
    }




}