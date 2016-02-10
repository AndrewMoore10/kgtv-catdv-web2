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
        // Note: about times. 
        // The players use times measured in seconds from the start of the physical media. They do not understand the concept
        // of media starting at a non-zero timecode. Therefore it is necessary to convert back and forth between playerTime 
        // and, what is referred to here as "movieTime", which is the absolute timecode as displayed to the user and stored in 
        // properties such as clip.in and clip.out.
        var Control = controls.Control;
        var Image = controls.Image;
        var Element = controls.Element;
        var Panel = controls.Panel;
        var Label = controls.Label;
        var FocusPanel = controls.FocusPanel;
        var DraggableElement = controls.DraggableElement;
        var Direction = controls.Direction;
        var QuickTimeVideoPlayer = controls.QuickTimeVideoPlayer;
        var HtmlVideoPlayer = controls.HtmlVideoPlayer;
        var SequencePlayer = controls.SequencePlayer;
        var PathUtil = util.PathUtil;
        var Platform = util.Platform;
        var $catdv = catdv.RestApi;
        var TimecodeUtil = catdv.TimecodeUtil;
        var ServerSettings = logic.ServerSettings;
        var ClipMediaPanel = (function (_super) {
            __extends(ClipMediaPanel, _super);
            function ClipMediaPanel(element, playerControls) {
                var _this = this;
                _super.call(this, element);
                this.clip = null;
                this.movieOriginSecs = 0.0;
                this.clipType = "clip"; // or "sequence"
                this.playerControls = playerControls;
                this.css({
                    "position": "relative"
                });
                this.imgPoster = new Image($("<img>").appendTo(this.$element));
                this.imgPoster.css({
                    "display": "block",
                    "width": "100%"
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
                this.imgPlayButton.onClick(function (evt) {
                    _this.playClip();
                });
                this.playerPanel = new Panel($("<div>").appendTo(this.$element));
                this.playerPanel.css({
                    "display": "none",
                    "width": "100%"
                });
            }
            ClipMediaPanel.prototype.setClip = function (clip) {
                var newClip = (this.clip == null || clip == null || this.clip.ID != clip.ID);
                this.clip = clip;
                if (this.clip != null) {
                    this.movieOriginSecs = this.clip.media ? this.clip.media.start.secs : clip["in"].secs;
                    if (newClip) {
                        var proxyPath = clip.media ? clip.media.proxyPath : null;
                        var hasDuration = (clip.duration != null) && (clip.duration.frm != 0 || clip.duration.secs != 0);
                        var proxyExt = proxyPath == null ? null : proxyPath.substring(proxyPath.lastIndexOf('.') + 1).toLowerCase();
                        if (!hasDuration && proxyExt != null && (proxyExt == "jpg" || proxyExt == "png" || proxyExt == "gif")) {
                            this.imgPoster.setSourceUrl($catdv.getApiUrl("media/" + clip.media.ID));
                        }
                        else {
                            this.imgPoster.setSourceUrl($catdv.getApiUrl("thumbnail/" + clip.posterID));
                        }
                        var isPlayable = ((clip.type == "seq") || ((clip.media != null) && (clip.media.proxyPath != null))) && hasDuration;
                        this.imgPlayButton.show(isPlayable);
                        this.clipType = this.clip.type == "seq" ? "sequence" : "clip";
                        if ((this.videoPlayer == null) || (this.videoPlayer.getClipType() != this.clipType)) {
                            if (this.videoPlayer != null)
                                this.videoPlayer.dispose();
                            if (this.clipType == "sequence") {
                                this.videoPlayer = new SequencePlayer(this.playerPanel);
                            }
                            else {
                                if (ServerSettings.useQuickTime) {
                                    this.videoPlayer = new QuickTimeVideoPlayer(this.playerPanel);
                                }
                                else {
                                    this.videoPlayer = new HtmlVideoPlayer(this.playerPanel);
                                }
                            }
                        }
                        this.imgPoster.show();
                        this.videoPlayer.hide();
                        this.playerControls.hide();
                    }
                    else if (this.playerControls.css("display") !== "none") {
                        this.playerControls.setClipAndPlayer(this.clip, this.videoPlayer);
                    }
                }
                else {
                    this.videoPlayer.stop();
                    this.videoPlayer.hide();
                    this.imgPoster.show();
                }
            };
            ClipMediaPanel.prototype.getCurrentTime = function () {
                return { secs: (this.videoPlayer ? this.videoPlayer.getCurrentTime() : 0.0) + this.movieOriginSecs, fmt: this.clip["in"].fmt };
            };
            ClipMediaPanel.prototype.setCurrentTime = function (timecode) {
                if (this.videoPlayer) {
                    this.videoPlayer.setCurrentTime(timecode.secs - this.movieOriginSecs);
                    this.playerControls.setCurrentTime(timecode);
                }
            };
            ClipMediaPanel.prototype.setSelection = function (markIn, markOut) {
                if (this.videoPlayer) {
                    this.videoPlayer.setCurrentTime(markIn.secs - this.movieOriginSecs);
                    this.playerControls.setCurrentTime(markIn);
                    if (markOut) {
                        this.playerControls.setSelection(markIn, markOut);
                    }
                }
            };
            ClipMediaPanel.prototype.playClip = function () {
                var _this = this;
                this.imgPoster.hide();
                this.imgPlayButton.hide();
                this.imgError.hide();
                this.videoPlayer.show();
                if (this.clipType == "clip") {
                    var proxyName = (this.clip.media && this.clip.media.proxyPath) ? PathUtil.getFilename(this.clip.media.proxyPath) : "clip.mp4";
                    var url = $catdv.getApiUrl("media/" + this.clip.sourceMediaID + "/" + proxyName);
                    this.videoPlayer.openMovie(url, this.clip.media ? this.clip.media.aspectRatio : null, function () {
                        _this.videoPlayer.setInOut(_this.clip["in"].secs - _this.movieOriginSecs, _this.clip.out.secs - _this.movieOriginSecs);
                        _this.videoPlayer.play();
                        _this.playerControls.show();
                        _this.playerControls.setClipAndPlayer(_this.clip, _this.videoPlayer);
                    }, function (errorCode) {
                        _this.imgError.show();
                        _this.imgPlayButton.hide();
                    });
                }
                else if (this.clipType == "sequence") {
                    var seqItems = this.clip.seqItems.map(function (seqItem) {
                        return {
                            url: $catdv.getApiUrl("media/" + seqItem.clipMediaID + "/clip.mov"),
                            clipIn: seqItem.clipIn.secs - seqItem.mediaStart.secs,
                            clipOut: seqItem.clipOut.secs - seqItem.mediaStart.secs,
                            aspectRatio: seqItem.mediaAspectRatio
                        };
                    });
                    this.videoPlayer.openSequence(seqItems, ServerSettings.useQuickTime, function () {
                        _this.videoPlayer.play();
                        _this.playerControls.show();
                        _this.playerControls.setClipAndPlayer(_this.clip, _this.videoPlayer);
                    });
                }
            };
            return ClipMediaPanel;
        })(Control);
        panels.ClipMediaPanel = ClipMediaPanel;
        var PlayerControls = (function (_super) {
            __extends(PlayerControls, _super);
            function PlayerControls(element, options) {
                var _this = this;
                _super.call(this, element);
                this.markInHandler = null;
                this.markOutHandler = null;
                this.addMarkerHandler = null;
                this.createSubclipHandler = null;
                this.currentTime = null;
                this.lastIsPlaying = false;
                _super.prototype.onKeyDown.call(this, function (evt) { return _this.focusPanel_onKeyDown(evt); });
                this.options = options || { MarkInOut: true, CreateMarkers: true, CreateSubClip: true, FullScreen: true };
                this.$element.addClass("playerControls");
                this.$element.append("<div id='timeline'><div id='selection'></div><div id='playhead'></div></div>" + "<div id='controlBarLeft'>" + " <a class='playerControlButton'><span id='playPauseBtn' class='glyphicon glyphicon-play playerControlButton'> </span></a>" + " <span class='moveTimes'><span id='movieTime'></span> / <span id='movieDuration'></span></span> " + "</div>" + "<div id='controlBarRight'></div>");
                this.timeline = new Element("timeline");
                this.timeline.onClick(function (evt) {
                    var x = evt.clientX - _this.timeline.getAbsoluteLeft();
                    var position = Math.max(Math.min(x - (_this.playhead.getWidth() / 2), _this.getTimelineWidth()), 0);
                    _this.playhead.setLeft(position);
                    var movieTime = _this.positionToMovieTime(position);
                    _this.videoPlayer.setCurrentTime(movieTime.secs - _this.mediaStart.secs);
                    _this.videoPlayer.stop();
                    _this.setCurrentTimeInternal(movieTime, false);
                });
                this.selection = new Element("selection");
                this.playhead = new DraggableElement("playhead", 1 /* Horizontal */, 0, this.timeline.getWidth() - 2);
                this.playhead.onDrag(function (evt) {
                    var movieTime = _this.positionToMovieTime(evt.position);
                    _this.videoPlayer.setCurrentTime(movieTime.secs - _this.mediaStart.secs);
                    _this.videoPlayer.stop();
                    _this.setCurrentTimeInternal(movieTime, false);
                });
                this.playPauseBtn = new Element("playPauseBtn");
                this.playPauseBtn.onClick(function (evt) { return _this.setPlayingState(_this.videoPlayer.togglePlay()); });
                this.renderControlButtons();
                this.movieTimeLabel = new Label("movieTime");
                this.movieDurationLabel = new Label("movieDuration");
                // Stored delegate to this.videoPlayer_playheadMoved() so we can unregister it from player
                this.videoPlayer_playheadMovedDelegate = function (evt) { return _this.videoPlayer_playheadMoved(evt); };
                $('.playerControlButton').tooltip();
                this.hide();
            }
            PlayerControls.prototype.renderControlButtons = function () {
                var _this = this;
                var $controlBarButtons = $("#controlBarRight");
                $controlBarButtons.empty();
                if (this.options.MarkInOut) {
                    $(this.renderLinkButton("markInBtn", "Mark in-point", "catdvicon-mark_in")).appendTo($controlBarButtons);
                    $(this.renderLinkButton("markOutBtn", "Mark out-point", "catdvicon-mark_out")).appendTo($controlBarButtons);
                    this.markInBtn = new Element("markInBtn");
                    this.markInBtn.onClick(function (evt) { return _this.markInBtn_onClick(evt); });
                    this.markOutBtn = new Element("markOutBtn");
                    this.markOutBtn.onClick(function (evt) { return _this.markOutBtn_onClick(evt); });
                }
                if (this.options.CreateMarkers) {
                    $(this.renderLinkButton("addEventMarkerBtn", "Add event marker", "catdvicon-event_marker")).appendTo($controlBarButtons);
                    $(this.renderLinkButton("addRangeMarkerBtn", "Add range marker", "catdvicon-range_marker")).appendTo($controlBarButtons);
                    this.addEventMarkerBtn = new Element("addEventMarkerBtn");
                    this.addEventMarkerBtn.onClick(function (evt) { return _this.addEventMarkerBtn_onClick(evt); });
                    this.addRangeMarkerBtn = new Element("addRangeMarkerBtn");
                    this.addRangeMarkerBtn.onClick(function (evt) { return _this.addRangeMarkerBtn_onClick(evt); });
                }
                if (this.options.CreateSubClip) {
                    $(this.renderLinkButton("createSubclipBtn", "Create subclip", "catdvicon-subclip")).appendTo($controlBarButtons);
                    this.createSubclipBtn = new Element("createSubclipBtn");
                    this.createSubclipBtn.onClick(function (evt) { return _this.createSubclipBtn_onClick(evt); });
                }
                if (this.options.FullScreen) {
                    $(this.renderLinkButton("fullscreenBtn", "Full screen", "glyphicon-fullscreen", true)).appendTo($controlBarButtons);
                    this.fullscreenBtn = new Element("fullscreenBtn");
                    this.fullscreenBtn.onClick(function (evt) { return _this.videoPlayer.fullscreen(); });
                }
            };
            PlayerControls.prototype.setClipAndPlayer = function (clip, videoPlayer, options) {
                if (options === void 0) { options = null; }
                this.clip = clip;
                if (options) {
                    this.options = options;
                    this.renderControlButtons();
                }
                this.mediaStart = clip.media && clip.media.start ? clip.media.start : clip["in"];
                this.selection.show(this.options.MarkInOut);
                if (videoPlayer) {
                    if (this.videoPlayer !== videoPlayer) {
                        if (this.videoPlayer) {
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
                    if (this.fullscreenBtn) {
                        this.fullscreenBtn.show(videoPlayer.supportsFullscreen());
                    }
                    if (!videoPlayer.supportsOverlays()) {
                        this.$element.addClass("no-overlap");
                    }
                }
                else {
                    this.videoPlayer = null;
                    this.hide();
                }
            };
            // Override - Element.show()
            PlayerControls.prototype.show = function (show) {
                _super.prototype.show.call(this, show);
                this.playhead.setLimits(0, this.timeline.getWidth() - 2);
            };
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
            PlayerControls.prototype.getCurrentTime = function () {
                return this.currentTime;
            };
            PlayerControls.prototype.setCurrentTime = function (currentTime) {
                if (!this.playhead.isDragging()) {
                    this.currentTime = currentTime;
                    this.movieTimeLabel.setText(TimecodeUtil.formatTimecode(this.currentTime));
                    this.playhead.setLeft(this.movieTimeToPosition(currentTime.secs));
                }
            };
            PlayerControls.prototype.renderLinkButton = function (id, tooltip, icon, hidden) {
                if (hidden === void 0) { hidden = false; }
                var glyphicon = icon.startsWith("glyphicon");
                var html = " <a id='" + id + "' class='" + (glyphicon ? "glyphiconButton " : "") + "playerControlButton'";
                if (hidden) {
                    html += " style='display:none;'";
                }
                if (!Platform.isIOS()) {
                    html += " data-placement='top' title='" + tooltip + "' ";
                }
                html += ">";
                html += "<span class='" + (glyphicon ? "glyphicon " : "catdvicon ") + icon + "'> </span></a>";
                return html;
            };
            // Internal verion of setCurrentTime() called when user interacts with playhead or
            // we receive playhead moved event from player
            PlayerControls.prototype.setCurrentTimeInternal = function (currentTime, setPlayheadPosition) {
                this.currentTime = currentTime;
                this.movieTimeLabel.setText(TimecodeUtil.formatTimecode(this.currentTime));
                if (setPlayheadPosition) {
                    this.playhead.setLeft(this.movieTimeToPosition(currentTime.secs));
                }
                // forward this event to listeners
                // It is easier for things to listen to this control than to listen to the videoPlayer
                // directly because of all the switching between players, which would mean they
                // would need to duplicate the wiring/unwiring event handler logic in setClipAndPlayer()
                if (this.playheadMovedHandler) {
                    this.playheadMovedHandler(this.currentTime);
                }
            };
            PlayerControls.prototype.setSelection = function (markIn, markOut) {
                this.clip.in2 = markIn;
                this.clip.out2 = markOut;
                this.updateSelection();
            };
            PlayerControls.prototype.onPlayheadMoved = function (playheadMovedHandler) {
                this.playheadMovedHandler = playheadMovedHandler;
            };
            PlayerControls.prototype.onAddMarker = function (addMarkerHandler) {
                this.addMarkerHandler = addMarkerHandler;
            };
            PlayerControls.prototype.onSetMarkIn = function (markInHandler) {
                this.markInHandler = markInHandler;
            };
            PlayerControls.prototype.onSetMarkOut = function (markOutHandler) {
                this.markOutHandler = markOutHandler;
            };
            PlayerControls.prototype.onCreateSubclip = function (createSubclipHandler) {
                this.createSubclipHandler = createSubclipHandler;
            };
            PlayerControls.prototype.videoPlayer_playheadMoved = function (evt) {
                this.setPlayingState(evt.isPlaying);
                if (!this.playhead.isDragging()) {
                    //                Console.debug("call setCurrentTimeInternal(" + evt.playerTimeSeconds + ")");
                    // Player reports times as seconds from start of media so add in the timecode of the start of the media to get an absolute timecode
                    this.setCurrentTimeInternal({ secs: evt.playerTimeSeconds + this.mediaStart.secs, fmt: this.clip["in"].fmt }, true);
                }
            };
            PlayerControls.prototype.updateSelection = function () {
                var markInSeconds = ((this.clip.in2 != null) && (this.clip.in2.secs != -1)) ? this.clip.in2.secs : this.clip["in"].secs;
                var markOutSeconds = ((this.clip.out2 != null) && (this.clip.out2.secs != -1)) ? this.clip.out2.secs : this.clip.out.secs;
                this.selection.setLeft(this.movieTimeToPosition(markInSeconds));
                this.selection.setRight(this.getTimelineWidth() - this.movieTimeToPosition(markOutSeconds));
            };
            PlayerControls.prototype.markInBtn_onClick = function (evt) {
                this.clip.in2 = this.currentTime;
                if (this.markInHandler)
                    this.markInHandler(evt);
                this.updateSelection();
            };
            PlayerControls.prototype.markOutBtn_onClick = function (evt) {
                this.clip.out2 = this.currentTime;
                if (this.markOutHandler)
                    this.markOutHandler(evt);
                this.updateSelection();
            };
            PlayerControls.prototype.addEventMarkerBtn_onClick = function (evt) {
                if (this.addMarkerHandler) {
                    this.addMarkerHandler({ "evt": evt, markerType: "event" });
                }
            };
            PlayerControls.prototype.addRangeMarkerBtn_onClick = function (evt) {
                if (this.addMarkerHandler) {
                    this.addMarkerHandler({ "evt": evt, markerType: "range" });
                }
            };
            PlayerControls.prototype.createSubclipBtn_onClick = function (evt) {
                if (this.createSubclipHandler) {
                    this.createSubclipHandler(evt);
                }
            };
            // Convert a position in pixels along the timeline into an absolute timecode, in seconds.
            PlayerControls.prototype.positionToMovieTime = function (position) {
                return { secs: ((position / this.getTimelineWidth()) * this.duration.secs) + this.clip["in"].secs, fmt: this.duration.fmt };
            };
            // Convert an absolute timecode, in seconds  into a position in pixels along the timeline.
            PlayerControls.prototype.movieTimeToPosition = function (movieTimeSecs) {
                return this.clip ? Math.min((movieTimeSecs - this.clip["in"].secs) / this.duration.secs, 1.0) * this.getTimelineWidth() : 0;
            };
            PlayerControls.prototype.getTimelineWidth = function () {
                return this.timeline.getWidth() - this.playhead.getWidth() - 2;
            };
            PlayerControls.prototype.setPlayingState = function (isPlaying) {
                if (isPlaying != this.lastIsPlaying) {
                    this.lastIsPlaying = isPlaying;
                    if (isPlaying) {
                        this.playPauseBtn.$element.removeClass("glyphicon-play");
                        this.playPauseBtn.$element.addClass("glyphicon-pause");
                    }
                    else {
                        this.playPauseBtn.$element.removeClass("glyphicon-pause");
                        this.playPauseBtn.$element.addClass("glyphicon-play");
                    }
                }
            };
            PlayerControls.prototype.focusPanel_onKeyDown = function (evt) {
                // process shortcuts such as I and O to set in and out points and M to insert a marker
                // but be careful not to consume all keyboard events such as Cmd-T to open a new tab
                var handled = false;
                if (!evt.altKey && !evt.ctrlKey && !evt.metaKey) {
                    handled = true; // Assume true. Set to false in default case
                    switch (evt.keyCode) {
                        case 32:
                            this.videoPlayer.togglePlay();
                            break;
                        case 37:
                            this.videoPlayer.stepBack(1);
                            break;
                        case 39:
                            this.videoPlayer.stepForward(1);
                            break;
                        case 77:
                            this.addEventMarkerBtn_onClick(evt);
                            break;
                        case 73:
                        case 219:
                            this.markInBtn_onClick(evt);
                            break;
                        case 79:
                        case 221:
                            this.markOutBtn_onClick(evt);
                            break;
                        default:
                            handled = false;
                            break;
                    }
                }
                if (handled) {
                    evt.preventDefault();
                }
                return !handled;
            };
            return PlayerControls;
        })(FocusPanel);
        panels.PlayerControls = PlayerControls;
        var MultiClipPreviewPanel = (function (_super) {
            __extends(MultiClipPreviewPanel, _super);
            function MultiClipPreviewPanel(element, clips) {
                var _this = this;
                _super.call(this, element);
                this.css({ "position": "relative" });
                var numClips = clips.length;
                var size = 40 + (40 / (numClips - 1));
                var offset = (100 - size) / (numClips - 1);
                clips.forEach(function (clip, i) {
                    Image.create({
                        "src": $catdv.getApiUrl("thumbnails/" + clip.posterID),
                        "style": "position:absolute;left:" + (i * offset) + "%;top:" + (2 * i * offset) + "px;width:" + size + "%;"
                    }, _this);
                });
            }
            return MultiClipPreviewPanel;
        })(Panel);
        panels.MultiClipPreviewPanel = MultiClipPreviewPanel;
    })(panels = ui.panels || (ui.panels = {}));
})(ui || (ui = {}));
