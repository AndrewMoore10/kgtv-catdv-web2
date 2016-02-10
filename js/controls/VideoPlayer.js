var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var controls;
(function (controls) {
    var Platform = util.Platform;
    (function (PlayingState) {
        PlayingState[PlayingState["Playing"] = 1] = "Playing";
        PlayingState[PlayingState["Stopped"] = 2] = "Stopped";
    })(controls.PlayingState || (controls.PlayingState = {}));
    var PlayingState = controls.PlayingState;
    // implement features common to HTML5 and QuickTime players
    // NOTE: Typescript does not support Abstract classes, so if we made this the base class then it would
    // need to provide implementations for all the public VideoPlayer methods, with the 'abstract' ones
    // throwing some kind of AbstractMethodCalled exception. To avoid that we are using an interface to 
    // define all the public methods and then this class just implements the common methods. However
    // that means that it can't access any derived class methods, so to faciliate that we create a copy
    // of 'this' cast to VideoPlayer (thisPlayer) and call derived class methods through that. A bit
    // round about but keeps the public interface clean while reducing the amount of boilerplate code.
    var AbstractVideoPlayer = (function (_super) {
        __extends(AbstractVideoPlayer, _super);
        function AbstractVideoPlayer(element) {
            var _this = this;
            _super.call(this, element);
            this.lastMovieTime = 0;
            this.playheadMovedListeners = new controls.EventListeners();
            this.lastIsPlaying = false;
            this.readyCallback = null;
            this.thisPlayer = this;
            this.timer = new controls.Timer(100, function () {
                _this.fireReadyEvent();
                _this.firePlayerEvent();
            });
        }
        AbstractVideoPlayer.prototype.getClipType = function () {
            return "clip";
        };
        AbstractVideoPlayer.prototype.togglePlay = function () {
            if (this.thisPlayer.isMoviePlayable()) {
                if (this.thisPlayer.isPlaying()) {
                    this.thisPlayer.stop();
                    return false;
                }
                else {
                    this.thisPlayer.play();
                    return true;
                }
            }
            return false;
        };
        AbstractVideoPlayer.prototype.addPlayheadMovedListener = function (listener) {
            this.playheadMovedListeners.addListener(listener);
        };
        AbstractVideoPlayer.prototype.removePlayheadMovedListener = function (listener) {
            this.playheadMovedListeners.removeListener(listener);
        };
        AbstractVideoPlayer.prototype.openMovie = function (url, aspectRatio, readyCallback, errorCallback) {
            this.readyCallback = readyCallback;
            this.timer.start();
        };
        AbstractVideoPlayer.prototype.dispose = function () {
            this.timer.stop();
        };
        AbstractVideoPlayer.prototype.fireReadyEvent = function () {
            if (this.readyCallback && this.thisPlayer.isMoviePlayable()) {
                this.readyCallback();
                this.readyCallback = null;
            }
        };
        AbstractVideoPlayer.prototype.firePlayerEvent = function () {
            var isPlaying = this.thisPlayer.isPlaying();
            var newMovieTime = this.thisPlayer.getCurrentTime();
            if ((newMovieTime != this.lastMovieTime) || (isPlaying != this.lastIsPlaying)) {
                this.lastMovieTime = newMovieTime;
                this.lastIsPlaying = isPlaying;
                this.playheadMovedListeners.notifyListeners({ playerTimeSeconds: newMovieTime, isPlaying: isPlaying });
            }
        };
        return AbstractVideoPlayer;
    })(controls.Control);
    controls.AbstractVideoPlayer = AbstractVideoPlayer;
    var HtmlVideoPlayer = (function (_super) {
        __extends(HtmlVideoPlayer, _super);
        function HtmlVideoPlayer(element) {
            var _this = this;
            _super.call(this, element);
            this.startTime = null;
            this.endTime = null;
            this.playerInitialised = false;
            this.errorCallback = null;
            // We seem to have trouble if we use appendTo - just setting the html seems to work better for some reason
            // The vertical-align:top is required to stop the browser leaving a gap below the player to fit the decenders into! 
            this.$element.html("<video class='videoPlayer' style='vertical-align:top;' >");
            this.$video = this.$element.find("video");
            this.videoElement = (this.$video.get(0));
            this.setPlayerDimensions();
            this.$video.on("loadedmetadata", function (evt) {
                _this.playerInitialised = true;
                if (Platform.isIOS()) {
                    _super.prototype.fireReadyEvent.call(_this);
                }
            });
            this.$video.on("canplay", function (evt) {
                _super.prototype.fireReadyEvent.call(_this);
            });
            this.$video.on("timeupdate", function (evt) {
                var time = _this.getCurrentTime();
                if (_this.startTime && _this.endTime) {
                    if ((_this.startTime - time) > 0.1) {
                        _this.videoElement.currentTime = _this.startTime;
                    }
                    if ((time - _this.endTime) > 0.1) {
                        _this.stop();
                    }
                }
                _super.prototype.firePlayerEvent.call(_this);
            });
            this.$video.on("error", function (evt) {
                // Ignore error thrown because we haven't set a source yet
                if (_this.videoElement.attributes["src"].value == "")
                    return;
                // Ignore user cancelled loading error
                if (_this.videoElement.error.code == MediaError.MEDIA_ERR_ABORTED)
                    return;
                if (_this.errorCallback) {
                    _this.errorCallback(_this.videoElement.error.code);
                }
            });
        }
        HtmlVideoPlayer.prototype.openMovie = function (url, aspectRatio, readyCallback, errorCallback) {
            if (errorCallback === void 0) { errorCallback = null; }
            _super.prototype.openMovie.call(this, url, aspectRatio, readyCallback, errorCallback);
            this.errorCallback = errorCallback;
            this.startTime = null;
            this.endTime = null;
            this.playerInitialised = false;
            // Must set src='' before setting to another url. See - https://code.google.com/p/chromium/issues/detail?id=234779
            this.videoElement.src = '';
            this.videoElement.src = url; //"http://localhost:8080/api/4/media/12312312"; 
        };
        HtmlVideoPlayer.prototype.dispose = function () {
            _super.prototype.dispose.call(this);
            this.videoElement.pause();
            // Must set src='' before setting to another url. See - https://code.google.com/p/chromium/issues/detail?id=234779
            this.videoElement.src = '';
            this.$element.empty();
        };
        /* override css method so we can update video elements width/height */
        HtmlVideoPlayer.prototype.css = function (css) {
            _super.prototype.css.call(this, css);
            this.setPlayerDimensions();
        };
        HtmlVideoPlayer.prototype.setInOut = function (inTimeSecs, outTimeSecs) {
            this.startTime = inTimeSecs;
            this.endTime = outTimeSecs;
        };
        HtmlVideoPlayer.prototype.play = function () {
            if (this.isMoviePlayable()) {
                controls.Console.debug("HtmlVideoPlayer.play()");
                this.videoElement.play();
            }
        };
        HtmlVideoPlayer.prototype.stop = function () {
            if (this.isMoviePlayable()) {
                controls.Console.debug("HtmlVideoPlayer.stop()");
                this.videoElement.pause();
            }
        };
        HtmlVideoPlayer.prototype.stepForward = function (numFrames) {
            var _this = this;
            if (this.isMoviePlayable()) {
                this.videoElement.currentTime = this.videoElement.currentTime + 0.1; // TODO get frame rate
            }
            controls.Dispatcher.dispatch(function () { return _super.prototype.firePlayerEvent.call(_this); });
        };
        HtmlVideoPlayer.prototype.stepBack = function (numFrames) {
            var _this = this;
            if (this.isMoviePlayable()) {
                this.videoElement.currentTime = this.videoElement.currentTime - 0.1; // TODO get frame rate
            }
            controls.Dispatcher.dispatch(function () { return _super.prototype.firePlayerEvent.call(_this); });
        };
        HtmlVideoPlayer.prototype.supportsFullscreen = function () {
            return Boolean((this.videoElement.requestFullscreen) || (this.videoElement.msRequestFullscreen) || (this.videoElement.mozRequestFullScreen) || (this.videoElement.webkitEnterFullscreen));
        };
        HtmlVideoPlayer.prototype.fullscreen = function () {
            if (this.videoElement.requestFullscreen) {
                this.videoElement.requestFullscreen();
            }
            else if (this.videoElement.msRequestFullscreen) {
                this.videoElement.msRequestFullscreen();
            }
            else if (this.videoElement.mozRequestFullScreen) {
                this.videoElement.mozRequestFullScreen();
            }
            else if (this.videoElement.webkitEnterFullscreen) {
                this.videoElement.webkitEnterFullscreen();
            }
        };
        HtmlVideoPlayer.prototype.supportsOverlays = function () {
            return true;
        };
        // readyState
        // 0 = HAVE_NOTHING - no information whether or not the audio/video is ready
        // 1 = HAVE_METADATA - metadata for the audio/video is ready
        // 2 = HAVE_CURRENT_DATA - data for the current playback position is available, but not enough data to play next frame/millisecond
        // 3 = HAVE_FUTURE_DATA - data for the current and at least the next frame is available
        // 4 = HAVE_ENOUGH_DATA - enough data available to start playing
        HtmlVideoPlayer.prototype.isMoviePlayable = function () {
            return this.videoElement && (this.videoElement.readyState == HTMLMediaElement.HAVE_CURRENT_DATA || this.videoElement.readyState == HTMLMediaElement.HAVE_FUTURE_DATA || this.videoElement.readyState == HTMLMediaElement.HAVE_ENOUGH_DATA || (Platform.isIOS() && (this.videoElement.readyState == HTMLMediaElement.HAVE_METADATA)));
        };
        HtmlVideoPlayer.prototype.isPlaying = function () {
            return this.isMoviePlayable() && !this.videoElement.paused;
        };
        HtmlVideoPlayer.prototype.getCurrentTime = function () {
            return this.playerInitialised ? this.videoElement.currentTime : 0.0;
        };
        HtmlVideoPlayer.prototype.setCurrentTime = function (newTime, stateAfterSeek) {
            if (stateAfterSeek === void 0) { stateAfterSeek = 2 /* Stopped */; }
            if (this.isMoviePlayable()) {
                //                Console.debug("HtmlVideoPlayer.setCurrentTime(stateAfterSeek:" + stateAfterSeek + ")");
                // TODO: remember time and set when movie loads
                this.videoElement.currentTime = newTime;
                if (stateAfterSeek === 2 /* Stopped */) {
                    this.videoElement.pause();
                }
                else if (stateAfterSeek === 1 /* Playing */) {
                    this.videoElement.play();
                }
            }
        };
        // User's of this control set can set width/height, but they are really setting it on the 
        // wrapper div. Originally we just set with/height to 100% on the video element, but that
        // doesn't work if you want it to set its height automatically, by not setting a height 
        // at all. So only set width/height if container div has an explicit values set
        HtmlVideoPlayer.prototype.setPlayerDimensions = function () {
            this.videoElement.style.width = this.$element[0].style.width;
            this.videoElement.style.height = this.$element[0].style.height;
        };
        return HtmlVideoPlayer;
    })(AbstractVideoPlayer);
    controls.HtmlVideoPlayer = HtmlVideoPlayer;
    // Summary of QuickTime Plugin Events
    // ==================================
    // (http://genekc07.stowers.org/Users/mec/Library/Developer/Shared/Documentation/DocSets/com.apple.adc.documentation.AppleLion.CoreReference.docset/Contents/Resources/Documents/#documentation/QuickTime/Conceptual/QTScripting_JavaScript/bQTScripting_JavaScri_Document/QuickTimeandJavaScri.html#//apple_ref/doc/uid/TP40001526-CH001-DontLinkElementID_10)
    //
    // QuickTime can emit DOM events when the plug-in is instantiated and ready to interact with JavaScript, at various points during a movie’s 
    // loading process, when playback has begun, paused, or ended, or in the event of an error. The following list shows the DOM events that can 
    // be listened for. Note that all QuickTime DOM events begin with the prefix “qt_” to prevent name space collisions.
    //
    // qt_begin — The plug in has been instantiated and can interact with JavaScript.
    // qt_loadedmetadata — The movie header information has been loaded or created. The duration, dimensions, looping state, and so on are now known.
    // qt_loadedfirstframe — The first frame of the movie has been loaded and can be displayed. (The frame is displayed automatically at this point.)
    // qt_canplay — Enough media data has been loaded to begin playback (but not necessarily enough to play the entire file without pausing).
    // qt_canplaythrough — Enough media data has been loaded to play through to the end of the file without having to pause to buffer, assuming data continues to come in at the current rate or faster. 
    //                     (If the movie is set to autoplay, it will begin playing now.)
    // qt_durationchange — The media file’s duration is available or has changed. 
    //                     (A streaming movie, a SMIL movie, or a movie with a QTNEXT attribute may load multiple media segments or additional movies, causing a duration change.)
    // qt_load — All media data has been loaded.
    // qt_ended — Playback has stopped because end of the file was reached. (If the movie is set to loop, this event will not occur.)
    // qt_error — An error occurred while loading the file. No more data will be loaded.
    // qt_pause — Playback has paused. (This happens when the user presses the pause button before the movie ends.)
    // qt_play — Playback has begun.
    // qt_progress — More media data has been loaded. This event is fired no more than three times per second.
    //               This event occurs repeatedly until the qt_load event or qt_error event. The last progress event may or may not coincide with the loading of the last media data. 
    //               Use the progress function to monitor progress, but do not rely on it to determine whether the movie is completely loaded. 
    //               Use the qt_load function in conjunction with the qt_progress function to monitor load progress and determine when loading is complete.
    //
    // qt_waiting — Playback has stopped because no more media data is available, but more data is expected. 
    //              (This usually occurs if the user presses the play button prior to the qt_canplaythrough event. 
    //               It can also occur if the data throughput slows during movie playback, and the buffer runs dry.)
    // qt_stalled — No media has been received for approximately three seconds.
    // qt_timechanged — The current time has been changed (current time is indicated by the position of the playhead).
    // qt_volumechange — The audio volume or mute attribute has changed.
    var QuickTimeVideoPlayer = (function (_super) {
        __extends(QuickTimeVideoPlayer, _super);
        function QuickTimeVideoPlayer(element) {
            var _this = this;
            _super.call(this, element);
            this.startTime = 0;
            this.endTime = 0;
            this.aspectRatio = null;
            this.resizePlayerHandler = function () { return _this.resizePlayer(); };
            this.$element.addClass("videoPlayer");
            this.$element.css({ "position": "relative" });
            // If height not explicitly set then we should manage it
            this.handleResizeInCode = !this.$element.get(0).style.height;
        }
        QuickTimeVideoPlayer.prototype.openMovie = function (url, aspectRatio, readyCallback, errorCallback) {
            var _this = this;
            _super.prototype.openMovie.call(this, url, aspectRatio, readyCallback, errorCallback);
            this.aspectRatio = aspectRatio;
            this.playerId = "qt" + this.elementId;
            this.readyTimer = new controls.Timer(100, function () {
                _this.firePlayerEvent();
            });
            var height = this.handleResizeInCode ? "" + this.getPlayerHeight() + "px" : "100%";
            var html = "<object class='quicktimePlayer' classid='clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B'  " + " codebase='http://www.apple.com/qtactivex/qtplugin.cab'" + " id='" + this.playerId + "' style='behavior:url(#qt_event_source); width:100%; height:" + height + ";' >" + "<param name='enablejavascript' value='true'/>" + "<param name='postdomevents' value='true'/>" + "<param name='controller' value='false'/>" + "<param name='autoplay' value='false'/>" + "<param name='scale' value='ToFit'/>" + "<param name='src' value='" + url + "'/>" + "<embed id='" + this.playerId + "Embed' class='quicktimePlayer' type='video/quicktime' pluginspage='http://www.apple.com/quicktime/'" + " enablejavascript='true'" + " postdomevents='true'" + " controller='false'" + " autoplay='false'" + " scale='ToFit'" + " name='" + this.playerId + "' src='" + url + "' style='width:100%; height:" + height + ";'/>" + "</object>";
            this.$element.html(html);
            controls.Timer.defer(Platform.isSafari() || Platform.isOldIE() ? 1000 : 0, function () {
                _this.quicktimePlayer = _this.getQuickTimePlayerElement();
                _this.$quicktimePlayer = $(_this.quicktimePlayer);
                _this.bindPlugInEvent(_this.quicktimePlayer, "qt_begin", function (evt) {
                    _this.onQuickTimeEvent("qt_begin", evt);
                });
                _this.bindPlugInEvent(_this.quicktimePlayer, "qt_canplay", function (evt) {
                    _this.onQuickTimeEvent("qt_canplay", evt);
                });
                _this.bindPlugInEvent(_this.quicktimePlayer, "qt_error", function (evt) {
                    _this.onQuickTimeEvent("qt_error", evt);
                });
                _this.bindPlugInEvent(_this.quicktimePlayer, "qt_pause", function (evt) {
                    _this.onQuickTimeEvent("qt_pause", evt);
                });
                _this.bindPlugInEvent(_this.quicktimePlayer, "qt_play", function (evt) {
                    _this.onQuickTimeEvent("qt_play", evt);
                });
                _this.bindPlugInEvent(_this.quicktimePlayer, "qt_ended", function (evt) {
                    _this.onQuickTimeEvent("qt_play", evt);
                });
                if (_this.handleResizeInCode) {
                    $("#" + _this.playerId).css({ "position": "absolute", "top": "0px", "left": "0px" });
                    $("#" + _this.playerId + "Embed").css({ "position": "absolute", "top": "0px", "left": "0px" });
                    _this.resizePlayer();
                    $(window).on("resize", _this.resizePlayerHandler);
                }
            });
        };
        QuickTimeVideoPlayer.prototype.dispose = function () {
            _super.prototype.dispose.call(this);
            if (this.handleResizeInCode) {
                $(window).off("resize", this.resizePlayerHandler);
            }
            this.$element.empty();
        };
        // Note: jQuery cannot bind events to OBJECT or EMBED elements so have to do it manually
        QuickTimeVideoPlayer.prototype.bindPlugInEvent = function (plugin, event, handler) {
            if (document.addEventListener) {
                plugin.addEventListener(event, handler, false);
            }
            else {
                plugin.attachEvent('on' + event, handler); // IE
            }
        };
        QuickTimeVideoPlayer.prototype.setInOut = function (inTimeSecs, outTimeSecs) {
            this.startTime = inTimeSecs;
            this.endTime = outTimeSecs;
        };
        QuickTimeVideoPlayer.prototype.play = function () {
            controls.Console.debug("QuickTimeVideoPlayer.play()");
            if (this.isMoviePlayable()) {
                this.setPlayerInOut();
                this.quicktimePlayer.Play();
            }
            else {
                controls.Console.debug("Ignore play() - player not ready");
            }
        };
        QuickTimeVideoPlayer.prototype.stop = function () {
            controls.Console.debug("QuickTimeVideoPlayer.stop()");
            if (this.isMoviePlayable()) {
                this.quicktimePlayer.Stop();
            }
        };
        QuickTimeVideoPlayer.prototype.stepForward = function (numFrames) {
            if (this.isMoviePlayable()) {
                this.quicktimePlayer.Step(numFrames);
            }
            _super.prototype.firePlayerEvent.call(this);
        };
        QuickTimeVideoPlayer.prototype.stepBack = function (numFrames) {
            if (this.isMoviePlayable()) {
                this.quicktimePlayer.Step(-numFrames);
            }
            _super.prototype.firePlayerEvent.call(this);
        };
        QuickTimeVideoPlayer.prototype.supportsFullscreen = function () {
            return false;
        };
        QuickTimeVideoPlayer.prototype.fullscreen = function () {
            //TODO:....
        };
        QuickTimeVideoPlayer.prototype.supportsOverlays = function () {
            return false;
        };
        QuickTimeVideoPlayer.prototype.getCurrentTime = function () {
            return this.isMoviePlayable() ? this.toSeconds(this.quicktimePlayer.GetTime()) : 0.0;
        };
        QuickTimeVideoPlayer.prototype.setCurrentTime = function (newTime, stateAfterSeek) {
            if (stateAfterSeek === void 0) { stateAfterSeek = 2 /* Stopped */; }
            //            Console.debug("QuickTimeVideoPlayer.setCurrentTime()");
            if (this.isMoviePlayable()) {
                this.quicktimePlayer.SetTime(this.toPlayerTime(newTime));
                if (stateAfterSeek == 2 /* Stopped */)
                    this.stop();
                else
                    this.play();
            }
        };
        QuickTimeVideoPlayer.prototype.toPlayerTime = function (time) {
            var timescale = this.quicktimePlayer.GetTimeScale();
            return timescale > 0 ? Math.floor(time * timescale) : 0;
        };
        QuickTimeVideoPlayer.prototype.toSeconds = function (playerTime) {
            var timescale = this.quicktimePlayer.GetTimeScale();
            return timescale > 0 ? playerTime / timescale : 0.0;
        };
        QuickTimeVideoPlayer.prototype.isPlaying = function () {
            return this.isMoviePlayable() && (this.quicktimePlayer.GetRate() != 0.0);
        };
        QuickTimeVideoPlayer.prototype.isMoviePlayable = function () {
            try {
                var status = this.quicktimePlayer.GetPluginStatus();
                if (status == 'Complete' || status == 'Playable') {
                    return true;
                }
                else {
                    return false;
                }
            }
            catch (x) {
                return false;
            }
        };
        QuickTimeVideoPlayer.prototype.onQuickTimeEvent = function (qtEvent, evt) {
            controls.Console.debug("onQuickTimeEvent(" + qtEvent + ")");
            if (qtEvent == "qt_error") {
                alert(this.quicktimePlayer.GetPluginStatus());
            }
            else {
                if (qtEvent == "qt_canplay") {
                    _super.prototype.fireReadyEvent.call(this);
                }
                else {
                    _super.prototype.firePlayerEvent.call(this);
                }
            }
        };
        QuickTimeVideoPlayer.prototype.setPlayerInOut = function () {
            if (this.isMoviePlayable()) {
                if (this.startTime != 0 || this.endTime != 0) {
                    var timescale = this.quicktimePlayer.GetTimeScale();
                    var start = this.startTime * timescale;
                    var end = this.endTime * timescale;
                    // alert("moviePlayer.SetStartTime(" + (start / timescale) + ")
                    // - moviePlayer.SetEndTime(" + (end / timescale) + ") -
                    // timescale=" + timescale);
                    this.quicktimePlayer.SetStartTime(start);
                    this.quicktimePlayer.SetEndTime(end);
                }
            }
        };
        // Depending on browser player maybe on OBJECT (ActiveX) or an EMDEB (Netscape plug-in)
        QuickTimeVideoPlayer.prototype.getQuickTimePlayerElement = function () {
            var movie = $("#" + this.playerId);
            if (movie.length > 0) {
                var movieElement = movie.get(0);
                if (typeof movieElement.Play != 'undefined') {
                    return movieElement;
                }
            }
            movie = $("#" + this.playerId + "Embed");
            if (movie.length > 0) {
                var movieElement = movie.get(0);
                if (typeof movieElement.Play != 'undefined') {
                    return movieElement;
                }
            }
            return null;
        };
        QuickTimeVideoPlayer.prototype.resizePlayer = function () {
            var width = this.$element.width();
            var height = this.getPlayerHeight();
            this.setHeight(height);
            //            this.quicktimePlayer.style.width = "" + width + "px";
            //            this.quicktimePlayer.style.heightght + "px";
            $("#" + this.playerId).css({ "width": "" + width + "px", "height": "" + height + "px" });
            $("#" + this.playerId + "Embed").css({ "width": "" + width + "px", "height": "" + height + "px" });
        };
        QuickTimeVideoPlayer.prototype.getPlayerHeight = function () {
            var aspectRatio = this.aspectRatio || (16 / 9);
            var width = this.$element.width();
            return width / aspectRatio;
        };
        return QuickTimeVideoPlayer;
    })(AbstractVideoPlayer);
    controls.QuickTimeVideoPlayer = QuickTimeVideoPlayer;
})(controls || (controls = {}));
