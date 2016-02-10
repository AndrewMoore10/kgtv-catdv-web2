module ui.panels
{
    // Note: about times. 
    // The players use times measured in seconds from the start of the physical media. They do not understand the concept
    // of media starting at a non-zero timecode. Therefore it is necessary to convert back and forth between playerTime 
    // and, what is referred to here as "movieTime", which is the absolute timecode as displayed to the user and stored in 
    // properties such as clip.in and clip.out.

    import Control = controls.Control;
    import Image = controls.Image;
    import Element = controls.Element;
    import Panel = controls.Panel;
    import Label = controls.Label;
    import TextBox = controls.TextBox;
    import RadioButton = controls.RadioButton;
    import Button = controls.Button;
    import FocusPanel = controls.FocusPanel;
    import DraggableElement = controls.DraggableElement;
    import DragElementEvent = controls.DragElementEvent;
    import Direction = controls.Direction;
    import VideoPlayer = controls.VideoPlayer;
    import QuickTimeVideoPlayer = controls.QuickTimeVideoPlayer;
    import HtmlVideoPlayer = controls.HtmlVideoPlayer;
    import SequencePlayer = controls.SequencePlayer;
    import ItemDescriptor = controls.ItemDescriptor;
    import PlayerEvent = controls.PlayerEvent;

    import PathUtil = util.PathUtil;
    import Platform = util.Platform;

    import $catdv = catdv.RestApi;
    import Clip = catdv.Clip;
    import Timecode = catdv.Timecode;
    import TimecodeFormat = catdv.TimecodeFormat;
    import TimecodeUtil = catdv.TimecodeUtil;

    import ServerSettings = logic.ServerSettings;

    export class ClipMediaPanel extends Control
    {
        private imgPoster: Image;
        private imgPlayButton: Image;
        private imgError: Image;
        private playerPanel: Panel;
        private videoPlayer: VideoPlayer;

        private playerControls: PlayerControls;

        private clip: Clip = null;
        private movieOriginSecs = 0.0;
        private clipType: string = "clip"; // or "sequence"

        constructor(element: any, playerControls: PlayerControls)
        {
            super(element);

            this.playerControls = playerControls;

            this.css({
                "position": "relative",
            });

            this.imgPoster = new Image($("<img>").appendTo(this.$element));
            this.imgPoster.css({
                "display": "block",
                "width": "100%",
            });

            this.imgError = new Image($("<img src='img/player-error-icon.png'>").appendTo(this.$element));
            this.imgError.css({
                "position": "absolute",
                "display": "none",
                "left": "0px",
                "right": "0px",
                "top": "0px",
                "bottom": "0px",
                "margin": "auto",
                "cursor": "pointer"
            });

            this.imgPlayButton = new Image($("<img src='img/play-icon.png'>").appendTo(this.$element));
            this.imgPlayButton.css({
                "position": "absolute",
                "display": "block",
                "left": "0px",
                "right": "0px",
                "top": "0px",
                "bottom": "0px",
                "margin": "auto",
                "cursor": "pointer"
            });
            this.imgPlayButton.onClick((evt) =>
            {
                this.playClip();
            });

            this.playerPanel = new Panel($("<div>").appendTo(this.$element));
            this.playerPanel.css({
                "display": "none",
                "width": "100%"
            });
        }

        public setClip(clip: Clip)
        {
            var newClip = (this.clip == null || clip == null || this.clip.ID != clip.ID);
            this.clip = clip;

            if (this.clip != null)
            {
                this.movieOriginSecs = this.clip.media ? this.clip.media.start.secs : clip["in"].secs;

                if (newClip)
                {
                    var proxyPath = clip.media ? clip.media.proxyPath : null;
                    var hasDuration = (clip.duration != null) && (clip.duration.frm != 0 || clip.duration.secs != 0);
                    var proxyExt = proxyPath == null ? null : proxyPath.substring(proxyPath.lastIndexOf('.') + 1).toLowerCase();
                    if (!hasDuration && proxyExt != null && (proxyExt == "jpg" || proxyExt == "png" || proxyExt == "gif"))
                    {
                        this.imgPoster.setSourceUrl($catdv.getApiUrl("media/" + clip.media.ID));
                    }
                    else 
                    {
                        this.imgPoster.setSourceUrl($catdv.getApiUrl("thumbnail/" + clip.posterID));
                    }
                    var isPlayable = ((clip.type == "seq") || ((clip.media != null) && (clip.media.proxyPath != null))) && hasDuration;
                    this.imgPlayButton.show(isPlayable);

                    this.clipType = this.clip.type == "seq" ? "sequence" : "clip";
                    if ((this.videoPlayer == null) || (this.videoPlayer.getClipType() != this.clipType))
                    {
                        if (this.videoPlayer != null) this.videoPlayer.dispose();

                        if (this.clipType == "sequence")
                        {
                            this.videoPlayer = new SequencePlayer(this.playerPanel);
                        }
                        else
                        {
                            if (ServerSettings.useQuickTime)
                            {
                                this.videoPlayer = new QuickTimeVideoPlayer(this.playerPanel);
                            }
                            else
                            {
                                this.videoPlayer = new HtmlVideoPlayer(this.playerPanel);
                            }
                        }
                    }

                    this.imgPoster.show();
                    this.videoPlayer.hide();
                    this.playerControls.hide();
                }
                else if (this.playerControls.css("display") !== "none")
                {
                    this.playerControls.setClipAndPlayer(this.clip, this.videoPlayer);
                }
            }
            else
            {
                this.videoPlayer.stop();
                this.videoPlayer.hide();
                this.imgPoster.show();
            }
        }

        public getCurrentTime(): Timecode
        {
            return { secs: (this.videoPlayer ? this.videoPlayer.getCurrentTime() : 0.0) + this.movieOriginSecs, fmt: this.clip["in"].fmt };
        }

        public setCurrentTime(timecode: Timecode)
        {
            if (this.videoPlayer)
            {
                this.videoPlayer.setCurrentTime(timecode.secs - this.movieOriginSecs);
                this.playerControls.setCurrentTime(timecode);
            }
        }

        public setSelection(markIn: Timecode, markOut: Timecode)
        {
            if (this.videoPlayer)
            {
                this.videoPlayer.setCurrentTime(markIn.secs - this.movieOriginSecs);
                this.playerControls.setCurrentTime(markIn);
                if (markOut)
                {
                    this.playerControls.setSelection(markIn, markOut);
                }
            }
        }

        private playClip()
        {
            this.imgPoster.hide();
            this.imgPlayButton.hide();
            this.imgError.hide();
            this.videoPlayer.show();

            if (this.clipType == "clip")
            {
                var proxyName = (this.clip.media && this.clip.media.proxyPath) ? PathUtil.getFilename(this.clip.media.proxyPath) : "clip.mp4";
                var url = $catdv.getApiUrl("media/" + this.clip.sourceMediaID + "/" + proxyName);

                this.videoPlayer.openMovie(url, this.clip.media ? this.clip.media.aspectRatio : null,
                    () =>
                    {
                        this.videoPlayer.setInOut(this.clip["in"].secs - this.movieOriginSecs, this.clip.out.secs - this.movieOriginSecs);
                        this.videoPlayer.play();
                        this.playerControls.show();
                        this.playerControls.setClipAndPlayer(this.clip, this.videoPlayer);
                    },
                    (errorCode: number) =>
                    {
                        this.imgError.show();
                        this.imgPlayButton.hide();
                    });
            }
            else if (this.clipType == "sequence")
            {
                var seqItems: ItemDescriptor[] = this.clip.seqItems.map((seqItem) =>
                {
                    return {
                        url: $catdv.getApiUrl("media/" + seqItem.clipMediaID + "/clip.mov"),
                        clipIn: seqItem.clipIn.secs - seqItem.mediaStart.secs,
                        clipOut: seqItem.clipOut.secs - seqItem.mediaStart.secs,
                        aspectRatio: seqItem.mediaAspectRatio
                    };
                });

                (<SequencePlayer>this.videoPlayer).openSequence(seqItems, ServerSettings.useQuickTime, () =>
                {
                    this.videoPlayer.play();
                    this.playerControls.show();
                    this.playerControls.setClipAndPlayer(this.clip, this.videoPlayer);
                });
            }
        }
    }

    export interface PlayerControlOptions
    {
        MarkInOut: boolean;
        CreateMarkers: boolean;
        CreateSubClip: boolean;
        FullScreen: boolean;
    }

    export class PlayerControls extends FocusPanel
    {
        private timeline: Element;
        private selection: Element;
        private playhead: DraggableElement;
        private movieTimeLabel: Label;
        private movieDurationLabel: Label;
        private playPauseBtn: Element;
        private markInBtn: Element;
        private markOutBtn: Element;
        private fullscreenBtn: Element;
        private addEventMarkerBtn: Element;
        private addRangeMarkerBtn: Element;
        private createSubclipBtn: Element;
        private videoPlayer: VideoPlayer;

        private markInHandler: (evt) => void = null;
        private markOutHandler: (evt) => void = null;
        private addMarkerHandler: (evt) => void = null;
        private createSubclipHandler: (evt) => void = null;
        private playheadMovedHandler: (evt: Timecode) => void;

        // Stored reference to this.videoPlayer_playheadMoved() so we can unregister it from player
        private videoPlayer_playheadMovedDelegate: (evt) => void;

        private options: PlayerControlOptions;
        private clip: Clip;
        private mediaStart: Timecode;
        private duration: Timecode;
        private currentTime: Timecode = null;
        private lastIsPlaying: boolean = false;

        constructor(element, options: PlayerControlOptions)
        {
            super(element);

            super.onKeyDown((evt) => this.focusPanel_onKeyDown(evt));

            this.options = options || { MarkInOut: true, CreateMarkers: true, CreateSubClip: true, FullScreen: true };

            this.$element.addClass("playerControls");
            this.$element.append("<div id='timeline'><div id='selection'></div><div id='playhead'></div></div>"
                + "<div id='controlBarLeft'>"
                + " <a class='playerControlButton'><span id='playPauseBtn' class='glyphicon glyphicon-play playerControlButton'> </span></a>"
                + " <span class='moveTimes'><span id='movieTime'></span> / <span id='movieDuration'></span></span> "
                + "</div>"
                + "<div id='controlBarRight'></div>");

            this.timeline = new Element("timeline");
            this.timeline.onClick((evt: JQueryMouseEventObject) =>
            {
                var x = evt.clientX - this.timeline.getAbsoluteLeft();
                var position = Math.max(Math.min(x - (this.playhead.getWidth() / 2), this.getTimelineWidth()), 0);
                this.playhead.setLeft(position);
                var movieTime = this.positionToMovieTime(position);
                this.videoPlayer.setCurrentTime(movieTime.secs - this.mediaStart.secs);
                this.videoPlayer.stop();
                this.setCurrentTimeInternal(movieTime, false);
            });

            this.selection = new Element("selection");
            this.playhead = new DraggableElement("playhead", Direction.Horizontal, 0, this.timeline.getWidth() - 2);
            this.playhead.onDrag((evt) =>
            {
                var movieTime = this.positionToMovieTime(evt.position);
                this.videoPlayer.setCurrentTime(movieTime.secs - this.mediaStart.secs);
                this.videoPlayer.stop();
                this.setCurrentTimeInternal(movieTime, false);
            });

            this.playPauseBtn = new Element("playPauseBtn");
            this.playPauseBtn.onClick((evt) => this.setPlayingState(this.videoPlayer.togglePlay()));

            this.renderControlButtons()

            this.movieTimeLabel = new Label("movieTime");
            this.movieDurationLabel = new Label("movieDuration");

            // Stored delegate to this.videoPlayer_playheadMoved() so we can unregister it from player
            this.videoPlayer_playheadMovedDelegate = (evt) => this.videoPlayer_playheadMoved(evt);

            $('.playerControlButton').tooltip();

            this.hide();
        }

        private renderControlButtons()
        {
            var $controlBarButtons = $("#controlBarRight");

            $controlBarButtons.empty();

            if (this.options.MarkInOut)
            {
                $(this.renderLinkButton("markInBtn", "Mark in-point", "catdvicon-mark_in")).appendTo($controlBarButtons);
                $(this.renderLinkButton("markOutBtn", "Mark out-point", "catdvicon-mark_out")).appendTo($controlBarButtons);

                this.markInBtn = new Element("markInBtn");
                this.markInBtn.onClick((evt) => this.markInBtn_onClick(evt));

                this.markOutBtn = new Element("markOutBtn");
                this.markOutBtn.onClick((evt) => this.markOutBtn_onClick(evt));
            }

            if (this.options.CreateMarkers)
            {
                $(this.renderLinkButton("addEventMarkerBtn", "Add event marker", "catdvicon-event_marker")).appendTo($controlBarButtons);
                $(this.renderLinkButton("addRangeMarkerBtn", "Add range marker", "catdvicon-range_marker")).appendTo($controlBarButtons);

                this.addEventMarkerBtn = new Element("addEventMarkerBtn");
                this.addEventMarkerBtn.onClick((evt) => this.addEventMarkerBtn_onClick(evt));

                this.addRangeMarkerBtn = new Element("addRangeMarkerBtn");
                this.addRangeMarkerBtn.onClick((evt) => this.addRangeMarkerBtn_onClick(evt));

            }
            if (this.options.CreateSubClip)
            {
                $(this.renderLinkButton("createSubclipBtn", "Create subclip", "catdvicon-subclip")).appendTo($controlBarButtons);

                this.createSubclipBtn = new Element("createSubclipBtn");
                this.createSubclipBtn.onClick((evt) => this.createSubclipBtn_onClick(evt));
            }

            if (this.options.FullScreen)
            {
                $(this.renderLinkButton("fullscreenBtn", "Full screen", "glyphicon-fullscreen", true)).appendTo($controlBarButtons);

                this.fullscreenBtn = new Element("fullscreenBtn");
                this.fullscreenBtn.onClick((evt) => this.videoPlayer.fullscreen());
            }
        }

        public setClipAndPlayer(clip: Clip, videoPlayer: VideoPlayer, options: PlayerControlOptions = null)
        {
            this.clip = clip;

            if (options)
            {
                this.options = options;
                this.renderControlButtons();
            }

            this.mediaStart = clip.media && clip.media.start ? clip.media.start : clip["in"];
            this.selection.show(this.options.MarkInOut);

            if (videoPlayer)
            {
                if (this.videoPlayer !== videoPlayer)
                {
                    if (this.videoPlayer)
                    {
                        this.videoPlayer.removePlayheadMovedListener(this.videoPlayer_playheadMovedDelegate);
                    }
                    this.videoPlayer = videoPlayer;
                    this.videoPlayer.addPlayheadMovedListener(this.videoPlayer_playheadMovedDelegate);
                }
                this.show();
                this.duration = clip.duration;
                this.movieDurationLabel.setText(TimecodeUtil.formatTimecode(this.duration));
                this.movieTimeLabel.setText(TimecodeUtil.formatTimecode({ secs: 0.0, fmt: this.duration.fmt }));
                this.updateSelection();
                this.setPlayingState(this.videoPlayer.isPlaying());
                if (this.fullscreenBtn)
                {
                    this.fullscreenBtn.show(videoPlayer.supportsFullscreen());
                }
                if (!videoPlayer.supportsOverlays())
                {
                    this.$element.addClass("no-overlap");
                }
            }
            else
            {
                this.videoPlayer = null;
                this.hide();
            }
        }

        // Override - Element.show()
        public show(show?: boolean)
        {
            super.show(show);
            this.playhead.setLimits(0, this.timeline.getWidth() - 2);
        }

        //        public setEditable(editable: boolean)
        //        {
        //            this.editingMode = editable;
        //            if (editable)
        //            {
        //                this.addEventMarkerBtn.$element.removeClass("disabled");
        //            }
        //            else
        //            {
        //                this.addEventMarkerBtn.$element.addClass("disabled");
        //            }
        //        }

        public getCurrentTime(): Timecode
        {
            return this.currentTime;
        }
        public setCurrentTime(currentTime: Timecode)
        {
            if (!this.playhead.isDragging())
            {
                this.currentTime = currentTime;
                this.movieTimeLabel.setText(TimecodeUtil.formatTimecode(this.currentTime));
                this.playhead.setLeft(this.movieTimeToPosition(currentTime.secs));
            }
        }

        private renderLinkButton(id: string, tooltip: string, icon: string, hidden: boolean = false): string
        {
            var glyphicon = icon.startsWith("glyphicon");

            var html = " <a id='" + id + "' class='" + (glyphicon ? "glyphiconButton " : "") + "playerControlButton'";
            if (hidden)
            {
                html += " style='display:none;'";
            }

            if (!Platform.isIOS())
            {
                html += " data-placement='top' title='" + tooltip + "' ";
            }
            html += ">";
            html += "<span class='" + (glyphicon ? "glyphicon " : "catdvicon ") + icon + "'> </span></a>"
            return html;
        }

        // Internal verion of setCurrentTime() called when user interacts with playhead or
        // we receive playhead moved event from player
        private setCurrentTimeInternal(currentTime: Timecode, setPlayheadPosition: boolean)
        {
            this.currentTime = currentTime;
            this.movieTimeLabel.setText(TimecodeUtil.formatTimecode(this.currentTime));
            if (setPlayheadPosition)
            {
                this.playhead.setLeft(this.movieTimeToPosition(currentTime.secs));
            }

            // forward this event to listeners
            // It is easier for things to listen to this control than to listen to the videoPlayer
            // directly because of all the switching between players, which would mean they
            // would need to duplicate the wiring/unwiring event handler logic in setClipAndPlayer()
            if (this.playheadMovedHandler)
            {
                this.playheadMovedHandler(this.currentTime);
            }
        }

        public setSelection(markIn: Timecode, markOut: Timecode)
        {
            this.clip.in2 = markIn;
            this.clip.out2 = markOut;
            this.updateSelection();
        }

        public onPlayheadMoved(playheadMovedHandler: (evt: Timecode) => void)
        {
            this.playheadMovedHandler = playheadMovedHandler;
        }

        public onAddMarker(addMarkerHandler: (evt) => void)
        {
            this.addMarkerHandler = addMarkerHandler;
        }

        public onSetMarkIn(markInHandler: (evt) => void)
        {
            this.markInHandler = markInHandler;
        }

        public onSetMarkOut(markOutHandler: (evt) => void)
        {
            this.markOutHandler = markOutHandler;
        }

        public onCreateSubclip(createSubclipHandler: (evt) => void)
        {
            this.createSubclipHandler = createSubclipHandler;
        }

        private videoPlayer_playheadMoved(evt: any)
        {
            this.setPlayingState(evt.isPlaying);
            if (!this.playhead.isDragging())
            {
                //                Console.debug("call setCurrentTimeInternal(" + evt.playerTimeSeconds + ")");
                // Player reports times as seconds from start of media so add in the timecode of the start of the media to get an absolute timecode
                this.setCurrentTimeInternal({ secs: evt.playerTimeSeconds + this.mediaStart.secs, fmt: this.clip["in"].fmt }, true);
            }
        }

        private updateSelection()
        {
            var markInSeconds = ((this.clip.in2 != null) && (this.clip.in2.secs != -1)) ? this.clip.in2.secs : this.clip["in"].secs;
            var markOutSeconds = ((this.clip.out2 != null) && (this.clip.out2.secs != -1)) ? this.clip.out2.secs : this.clip.out.secs;
            this.selection.setLeft(this.movieTimeToPosition(markInSeconds));
            this.selection.setRight(this.getTimelineWidth() - this.movieTimeToPosition(markOutSeconds));
        }

        private markInBtn_onClick(evt)
        {
            this.clip.in2 = this.currentTime;
            if (this.markInHandler) this.markInHandler(evt);
            this.updateSelection();
        }

        private markOutBtn_onClick(evt)
        {
            this.clip.out2 = this.currentTime;
            if (this.markOutHandler) this.markOutHandler(evt);
            this.updateSelection();
        }

        private addEventMarkerBtn_onClick(evt)
        {
            if (this.addMarkerHandler) 
            {
                this.addMarkerHandler({ "evt": evt, markerType: "event" });
            }
        }

        private addRangeMarkerBtn_onClick(evt)
        {
            if (this.addMarkerHandler) 
            {
                this.addMarkerHandler({ "evt": evt, markerType: "range" });
            }
        }

        private createSubclipBtn_onClick(evt)
        {
            if (this.createSubclipHandler) 
            {
                this.createSubclipHandler(evt);
            }
        }

        // Convert a position in pixels along the timeline into an absolute timecode, in seconds.
        private positionToMovieTime(position: number): Timecode
        {
            return { secs: ((position / this.getTimelineWidth()) * this.duration.secs) + this.clip["in"].secs, fmt: this.duration.fmt };
        }

        // Convert an absolute timecode, in seconds  into a position in pixels along the timeline.
        private movieTimeToPosition(movieTimeSecs: number): number
        {
            return this.clip ? Math.min((movieTimeSecs - this.clip["in"].secs) / this.duration.secs, 1.0) * this.getTimelineWidth() : 0;
        }

        private getTimelineWidth()
        {
            return this.timeline.getWidth() - this.playhead.getWidth() - 2;
        }

        private setPlayingState(isPlaying: boolean)
        {
            if (isPlaying != this.lastIsPlaying)
            {
                this.lastIsPlaying = isPlaying;
                if (isPlaying)
                {
                    this.playPauseBtn.$element.removeClass("glyphicon-play");
                    this.playPauseBtn.$element.addClass("glyphicon-pause");
                }
                else
                {
                    this.playPauseBtn.$element.removeClass("glyphicon-pause");
                    this.playPauseBtn.$element.addClass("glyphicon-play");
                }
            }
        }

        private focusPanel_onKeyDown(evt: JQueryKeyEventObject)
        {
            // process shortcuts such as I and O to set in and out points and M to insert a marker
            // but be careful not to consume all keyboard events such as Cmd-T to open a new tab
            var handled = false;
            if (!evt.altKey && !evt.ctrlKey && !evt.metaKey)
            {
                handled = true; // Assume true. Set to false in default case

                switch (evt.keyCode)
                {
                    case 32: // Space
                        this.videoPlayer.togglePlay();
                        break;
                    case 37: // left arrow
                        this.videoPlayer.stepBack(1);
                        break;
                    case 39: // right arrow
                        this.videoPlayer.stepForward(1);
                        break;
                    case 77: // 'M'
                        this.addEventMarkerBtn_onClick(evt);
                        break;
                    case 73: // 'I'
                    case 219: // left square bracket
                        this.markInBtn_onClick(evt);
                        break;
                    case 79: // 'O'
                    case 221: // right square bracket
                        this.markOutBtn_onClick(evt);
                        break;
                    // case 'P': this.videoPlayer.playSelection(evt); break;
                    // case 'T': this.playToInBtn_onClick(evt); break;
                    // case 'Y': this.playToOutBtn_onClick(evt); break;

                    default:
                        handled = false;
                        break;
                }
            }
            if (handled)
            {
                evt.preventDefault();
            }
            return !handled;
        }
    }

    export class MultiClipPreviewPanel extends Panel
    {
        constructor(element: any, clips: Clip[])
        {
            super(element);

            this.css({ "position": "relative" });

            var numClips = clips.length;

            var size = 40 + (40 / (numClips - 1));
            var offset = (100 - size) / (numClips - 1);

            clips.forEach((clip, i) =>
            {
                Image.create({
                    "src": $catdv.getApiUrl("thumbnails/" + clip.posterID),
                    "style": "position:absolute;left:" + (i * offset) + "%;top:" + (2 * i * offset) + "px;width:" + size + "%;"
                }, this);
            });
        }
    }
}