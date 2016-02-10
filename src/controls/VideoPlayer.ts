module controls
{
    import Platform = util.Platform;

    export interface PlayerEvent 
    {
        // Seconds from start of media. (Player has no knowledge of any start timecode that may be set on SourceMedia)
        playerTimeSeconds: number;
        isPlaying: boolean;
    }

    export enum PlayingState
    {
        Playing = 1,
        Stopped = 2
    }

    export interface VideoPlayer
    {
        // Control methods
        css(css: any);
        getWidth();
        getHeight();
        show();
        hide();

        // Player methods
        openMovie(url: string, aspectRatio: number, readyCallback: () => void, errorCallback?: (errorCode: number) => void);
        dispose(); // close any resources owned by the player
        getClipType(); // "clip" or "sequence"
        setInOut(inTimeSecs: number, outTimeSecs: number); // Times in seconds from start of media
        play();
        stop();
        togglePlay(): boolean;
        stepForward(numFrames: number);
        stepBack(numFrames: number);
        isMoviePlayable(): boolean;
        isPlaying(): boolean;
        getCurrentTime(): number; // In seconds from start of media
        setCurrentTime(newTime: number, stateAfterSeek?: PlayingState); // In seconds from start of media
        addPlayheadMovedListener(callback: (evt: PlayerEvent) => void);
        removePlayheadMovedListener(callback: (evt: PlayerEvent) => void);

        supportsFullscreen(): boolean;
        fullscreen();

        // True if the player allows other DOM elements to appear on top of it
        supportsOverlays(): boolean;
    }

    // implement features common to HTML5 and QuickTime players
    // NOTE: Typescript does not support Abstract classes, so if we made this the base class then it would
    // need to provide implementations for all the public VideoPlayer methods, with the 'abstract' ones
    // throwing some kind of AbstractMethodCalled exception. To avoid that we are using an interface to 
    // define all the public methods and then this class just implements the common methods. However
    // that means that it can't access any derived class methods, so to faciliate that we create a copy
    // of 'this' cast to VideoPlayer (thisPlayer) and call derived class methods through that. A bit
    // round about but keeps the public interface clean while reducing the amount of boilerplate code.
    export class AbstractVideoPlayer extends Control
    {
        // Re-typed this to allow us to call derived class methods without need for 'abstract' stubs
        private thisPlayer: VideoPlayer;

        private lastMovieTime: Number = 0;
        private playheadMovedListeners: EventListeners<PlayerEvent> = new EventListeners<PlayerEvent>();
        private timer: Timer;
        private lastIsPlaying: boolean = false;
        private readyCallback: () => void = null;

        constructor(element: any)
        {
            super(element);

            this.thisPlayer = <VideoPlayer>(<any>this);

            this.timer = new Timer(100, () =>
            {
                this.fireReadyEvent();
                this.firePlayerEvent();
            });
        }

        public getClipType()
        {
            return "clip";
        }

        public togglePlay(): boolean
        {
            if (this.thisPlayer.isMoviePlayable())
            {
                if (this.thisPlayer.isPlaying())
                {
                    this.thisPlayer.stop();
                    return false;
                }
                else
                {
                    this.thisPlayer.play();
                    return true;
                }
            }
            return false;
        }

        public addPlayheadMovedListener(listener: (evt) => void)
        {
            this.playheadMovedListeners.addListener(listener);
        }

        public removePlayheadMovedListener(listener: (evt) => void)
        {
            this.playheadMovedListeners.removeListener(listener);
        }

        public openMovie(url: string, aspectRatio: number, readyCallback: () => void, errorCallback: (errorCode: number) => void)
        {
            this.readyCallback = readyCallback;
            this.timer.start();
        }

        public dispose()
        {
            this.timer.stop();
        }

        public fireReadyEvent()
        {
            if (this.readyCallback && this.thisPlayer.isMoviePlayable())
            {
                this.readyCallback();
                this.readyCallback = null;
            }
        }

        public firePlayerEvent()
        {
            var isPlaying = this.thisPlayer.isPlaying();
            var newMovieTime = this.thisPlayer.getCurrentTime();
            if ((newMovieTime != this.lastMovieTime) || (isPlaying != this.lastIsPlaying))
            {
                this.lastMovieTime = newMovieTime;
                this.lastIsPlaying = isPlaying;
                this.playheadMovedListeners.notifyListeners({ playerTimeSeconds: newMovieTime, isPlaying: isPlaying });
            }
        }
    }

    export class HtmlVideoPlayer extends AbstractVideoPlayer implements VideoPlayer
    {
        private $video: JQuery;
        private videoElement: HTMLVideoElement;
        private startTime: number = null;
        private endTime: number = null;
        private playerInitialised: boolean = false;
        private errorCallback: (errorCode: number) => void = null;

        constructor(element: any)
        {
            super(element);

            // We seem to have trouble if we use appendTo - just setting the html seems to work better for some reason
            // The vertical-align:top is required to stop the browser leaving a gap below the player to fit the decenders into! 
            this.$element.html("<video class='videoPlayer' style='vertical-align:top;' >");

            this.$video = this.$element.find("video");
            this.videoElement = <HTMLVideoElement>(this.$video.get(0));

            this.setPlayerDimensions();

            this.$video.on("loadedmetadata", (evt) =>
            {
                this.playerInitialised = true;

                if (Platform.isIOS())
                {
                    super.fireReadyEvent();
                }
            });

            this.$video.on("canplay", (evt) =>
            {
                super.fireReadyEvent();
            });

            this.$video.on("timeupdate", (evt) =>
            {
                var time = this.getCurrentTime();
                if (this.startTime && this.endTime)
                {
                    if ((this.startTime - time) > 0.1)
                    {
                        this.videoElement.currentTime = this.startTime;
                    }

                    if ((time - this.endTime) > 0.1)
                    {
                        this.stop();
                    }
                }

                super.firePlayerEvent();

            });

            this.$video.on("error", (evt) =>
            {
                // Ignore error thrown because we haven't set a source yet
                if (this.videoElement.attributes["src"].value == "") return;

                // Ignore user cancelled loading error
                if (this.videoElement.error.code == MediaError.MEDIA_ERR_ABORTED) return;

                if (this.errorCallback) 
                {
                    this.errorCallback(this.videoElement.error.code);
                }
            });
        }

        openMovie(url: string, aspectRatio: number, readyCallback: () => void, errorCallback: (errorCode: number) => void = null)
        {
            super.openMovie(url, aspectRatio, readyCallback, errorCallback);
            this.errorCallback = errorCallback;
            this.startTime = null;
            this.endTime = null;
            this.playerInitialised = false;

            // Must set src='' before setting to another url. See - https://code.google.com/p/chromium/issues/detail?id=234779
            this.videoElement.src = '';
            this.videoElement.src = url; //"http://localhost:8080/api/4/media/12312312"; 
        }

        public dispose() // close any resources owned by the player
        {
            super.dispose();
            this.videoElement.pause();
            // Must set src='' before setting to another url. See - https://code.google.com/p/chromium/issues/detail?id=234779
            this.videoElement.src = '';
            this.$element.empty();
        }

        /* override css method so we can update video elements width/height */
        public css(css: any)
        {
            super.css(css);
            this.setPlayerDimensions();
        }

        public setInOut(inTimeSecs: number, outTimeSecs: number)
        {
            this.startTime = inTimeSecs;
            this.endTime = outTimeSecs;
        }

        public play()
        {
            if (this.isMoviePlayable())
            {
                Console.debug("HtmlVideoPlayer.play()");
                this.videoElement.play();
            }
        }

        public stop()
        {
            if (this.isMoviePlayable())
            {
                Console.debug("HtmlVideoPlayer.stop()");
                this.videoElement.pause();
            }
        }

        public stepForward(numFrames: number)
        {
            if (this.isMoviePlayable())
            {
                this.videoElement.currentTime = this.videoElement.currentTime + 0.1; // TODO get frame rate
            }
            Dispatcher.dispatch(() => super.firePlayerEvent());
        }

        public stepBack(numFrames: number)
        {
            if (this.isMoviePlayable())
            {
                this.videoElement.currentTime = this.videoElement.currentTime - 0.1; // TODO get frame rate
            }
            Dispatcher.dispatch(() => super.firePlayerEvent());
        }

        public supportsFullscreen(): boolean
        {
            return Boolean(((<any>this.videoElement).requestFullscreen)
                || (this.videoElement.msRequestFullscreen)
                || ((<any>this.videoElement).mozRequestFullScreen)
                || ((<any>this.videoElement).webkitEnterFullscreen));
        }

        public fullscreen()
        {
            if ((<any>this.videoElement).requestFullscreen)
            {
                (<any>this.videoElement).requestFullscreen();
            }
            else if (this.videoElement.msRequestFullscreen)
            {
                this.videoElement.msRequestFullscreen();
            }
            else if ((<any>this.videoElement).mozRequestFullScreen)
            {
                (<any>this.videoElement).mozRequestFullScreen();
            }
            else if ((<any>this.videoElement).webkitEnterFullscreen)
            {
                (<any>this.videoElement).webkitEnterFullscreen();
            }
        }

        public supportsOverlays(): boolean
        {
            return true;
        }
 
        // readyState
        // 0 = HAVE_NOTHING - no information whether or not the audio/video is ready
        // 1 = HAVE_METADATA - metadata for the audio/video is ready
        // 2 = HAVE_CURRENT_DATA - data for the current playback position is available, but not enough data to play next frame/millisecond
        // 3 = HAVE_FUTURE_DATA - data for the current and at least the next frame is available
        // 4 = HAVE_ENOUGH_DATA - enough data available to start playing

        public isMoviePlayable(): boolean
        {
            return this.videoElement &&
                (this.videoElement.readyState == HTMLMediaElement.HAVE_CURRENT_DATA
                || this.videoElement.readyState == HTMLMediaElement.HAVE_FUTURE_DATA
                || this.videoElement.readyState == HTMLMediaElement.HAVE_ENOUGH_DATA
                || (Platform.isIOS() && (this.videoElement.readyState == HTMLMediaElement.HAVE_METADATA)));
        }

        public isPlaying(): boolean
        {
            return this.isMoviePlayable() && !this.videoElement.paused;
        }

        public getCurrentTime(): number
        {
            return this.playerInitialised ? this.videoElement.currentTime : 0.0;
        }

        public setCurrentTime(newTime: number, stateAfterSeek: PlayingState = PlayingState.Stopped)
        {
            if (this.isMoviePlayable())
            {
                //                Console.debug("HtmlVideoPlayer.setCurrentTime(stateAfterSeek:" + stateAfterSeek + ")");
                // TODO: remember time and set when movie loads
                this.videoElement.currentTime = newTime;
                if (stateAfterSeek === PlayingState.Stopped)
                {
                    this.videoElement.pause();
                }
                else if (stateAfterSeek === PlayingState.Playing)
                {
                    this.videoElement.play();
                }
            }
        }

        // User's of this control set can set width/height, but they are really setting it on the 
        // wrapper div. Originally we just set with/height to 100% on the video element, but that
        // doesn't work if you want it to set its height automatically, by not setting a height 
        // at all. So only set width/height if container div has an explicit values set
        private setPlayerDimensions()
        {
            this.videoElement.style.width = this.$element[0].style.width;
            this.videoElement.style.height = this.$element[0].style.height;
        }
        
     }


    interface QuickTimePlugin extends HTMLElement
    {
        // Settable properties
        width: number
        height: number;

        // Methods
        GetPluginStatus(): string;
        GetTimeScale(): number;
        GetTime(): number;
        SetTime(time: number);
        GetRate(): number;
        Play(): string;
        Stop(): string;
        SetStartTime(time: number);
        SetEndTime(time: number);
        Step(numFrames: number);
        // ActiveX
        onqt_begin(callback: (evt) => void);
        addEventListener(string, callback: (evt) => void, boolean);
    }

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

    export class QuickTimeVideoPlayer extends AbstractVideoPlayer implements VideoPlayer
    {
        private playerId: string;
        private startTime: number = 0;
        private endTime: number = 0;
        private quicktimePlayer: QuickTimePlugin;
        private $quicktimePlayer: JQuery;
        private aspectRatio: number = null;
        private handleResizeInCode: boolean;
        private resizePlayerHandler = () => this.resizePlayer();
        private readyTimer: Timer;

        constructor(element: any)
        {
            super(element);
            this.$element.addClass("videoPlayer");
            this.$element.css({ "position": "relative" });

            // If height not explicitly set then we should manage it
            this.handleResizeInCode = !this.$element.get(0).style.height;
        }

        public openMovie(url: string, aspectRatio: number, readyCallback: () => void, errorCallback: (errorCode: number) => void)
        {
            super.openMovie(url, aspectRatio, readyCallback, errorCallback);

            this.aspectRatio = aspectRatio;
            this.playerId = "qt" + this.elementId;
            this.readyTimer = new Timer(100, () => { this.firePlayerEvent(); });

            var height = this.handleResizeInCode ? "" + this.getPlayerHeight() + "px" : "100%";

            var html = "<object class='quicktimePlayer' classid='clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B'  " 
                + " codebase='http://www.apple.com/qtactivex/qtplugin.cab'"
                + " id='" + this.playerId + "' style='behavior:url(#qt_event_source); width:100%; height:" + height + ";' >"
                + "<param name='enablejavascript' value='true'/>"
                + "<param name='postdomevents' value='true'/>"
//                + "<param name='wmode' value='transparent'/>" // tells plugin to respect HTML z-index so HTML elements can appear on top of it
                + "<param name='controller' value='false'/>"
                + "<param name='autoplay' value='false'/>"
                + "<param name='scale' value='ToFit'/>"
                + "<param name='src' value='" + url + "'/>"
                + "<embed id='" + this.playerId + "Embed' class='quicktimePlayer' type='video/quicktime' pluginspage='http://www.apple.com/quicktime/'"
                + " enablejavascript='true'"
                + " postdomevents='true'"
//                + " wmode='transparent'"
                + " controller='false'"
                + " autoplay='false'"
                + " scale='ToFit'"
                + " name='" + this.playerId + "' src='" + url + "' style='width:100%; height:" + height + ";'/>"
                + "</object>";

            this.$element.html(html);

            Timer.defer(Platform.isSafari() || Platform.isOldIE() ? 1000 : 0, () =>
            {
                this.quicktimePlayer = this.getQuickTimePlayerElement();
                this.$quicktimePlayer = $(this.quicktimePlayer);

                this.bindPlugInEvent(this.quicktimePlayer, "qt_begin", (evt) => { this.onQuickTimeEvent("qt_begin", evt); });
                this.bindPlugInEvent(this.quicktimePlayer, "qt_canplay", (evt) => { this.onQuickTimeEvent("qt_canplay", evt); });
                this.bindPlugInEvent(this.quicktimePlayer, "qt_error", (evt) => { this.onQuickTimeEvent("qt_error", evt); });
                this.bindPlugInEvent(this.quicktimePlayer, "qt_pause", (evt) => { this.onQuickTimeEvent("qt_pause", evt); });
                this.bindPlugInEvent(this.quicktimePlayer, "qt_play", (evt) => { this.onQuickTimeEvent("qt_play", evt); });
                this.bindPlugInEvent(this.quicktimePlayer, "qt_ended", (evt) => { this.onQuickTimeEvent("qt_play", evt); });

                if (this.handleResizeInCode)
                {
                    $("#" + this.playerId).css({ "position": "absolute", "top": "0px", "left": "0px" });
                    $("#" + this.playerId + "Embed").css({ "position": "absolute", "top": "0px", "left": "0px" });

                    this.resizePlayer();
                    $(window).on("resize", this.resizePlayerHandler);
                }
            });
        }

        public dispose()
        {
            super.dispose();

            if (this.handleResizeInCode)
            {
                $(window).off("resize", this.resizePlayerHandler);
            }
            this.$element.empty();
        }

        // Note: jQuery cannot bind events to OBJECT or EMBED elements so have to do it manually
        private bindPlugInEvent(plugin: any, event: string, handler: (evt) => void)
        {
            if (document.addEventListener)
            {
                plugin.addEventListener(event, handler, false);
            }
            else
            {
                plugin.attachEvent('on' + event, handler); // IE
            }
        }

        public setInOut(inTimeSecs: number, outTimeSecs: number)
        {
            this.startTime = inTimeSecs;
            this.endTime = outTimeSecs;
        }

        public play()
        {
            Console.debug("QuickTimeVideoPlayer.play()");
            if (this.isMoviePlayable())
            {
                this.setPlayerInOut();
                this.quicktimePlayer.Play();
            }
            else
            {
                Console.debug("Ignore play() - player not ready");
            }
        }

        public stop()
        {
            Console.debug("QuickTimeVideoPlayer.stop()");
            if (this.isMoviePlayable())
            {
                this.quicktimePlayer.Stop();
            }
        }

        public stepForward(numFrames: number)
        {
            if (this.isMoviePlayable())
            {
                this.quicktimePlayer.Step(numFrames);
            }
            super.firePlayerEvent();
        }

        public stepBack(numFrames: number)
        {
            if (this.isMoviePlayable())
            {
                this.quicktimePlayer.Step(-numFrames);
            }
            super.firePlayerEvent();
        }

        public supportsFullscreen(): boolean
        {
            return false;
        }
        public fullscreen()
        {
            //TODO:....
        }

        public supportsOverlays(): boolean
        {
            return false;
        }
 
        public getCurrentTime(): number
        {
            return this.isMoviePlayable() ? this.toSeconds(this.quicktimePlayer.GetTime()) : 0.0;
        }
        public setCurrentTime(newTime: number, stateAfterSeek: PlayingState = PlayingState.Stopped)
        {
            //            Console.debug("QuickTimeVideoPlayer.setCurrentTime()");
            if (this.isMoviePlayable())
            {
                this.quicktimePlayer.SetTime(this.toPlayerTime(newTime));
                if (stateAfterSeek == PlayingState.Stopped)
                    this.stop();
                else
                    this.play();
            }
        }

        private toPlayerTime(time: number): number
        {
            var timescale = this.quicktimePlayer.GetTimeScale();
            return timescale > 0 ? Math.floor(time * timescale) : 0;
        }

        private toSeconds(playerTime: number): number
        {
            var timescale = this.quicktimePlayer.GetTimeScale();
            return timescale > 0 ? playerTime / timescale : 0.0;
        }

        public isPlaying(): boolean
        {
            return this.isMoviePlayable() && (this.quicktimePlayer.GetRate() != 0.0);
        }

        public isMoviePlayable(): boolean
        {
            try
            {
                var status = this.quicktimePlayer.GetPluginStatus();
                if (status == 'Complete' || status == 'Playable')
                {
                    return true;
                }
                else
                {
                    return false;
                }
            }
            catch (x)
            {
                return false;
            }
        }

        private onQuickTimeEvent(qtEvent: string, evt: JQueryEventObject)
        {
            Console.debug("onQuickTimeEvent(" + qtEvent + ")");
            if (qtEvent == "qt_error")
            {
                alert(this.quicktimePlayer.GetPluginStatus());
            }
            else
            {
                if (qtEvent == "qt_canplay")
                {
                    super.fireReadyEvent();
                }
                else
                {
                    super.firePlayerEvent();
                }
            }
        }

        private setPlayerInOut()
        {
            if (this.isMoviePlayable())
            {
                if (this.startTime != 0 || this.endTime != 0)
                {
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
        }

        // Depending on browser player maybe on OBJECT (ActiveX) or an EMDEB (Netscape plug-in)
        private getQuickTimePlayerElement(): QuickTimePlugin
        {
            var movie = $("#" + this.playerId);
            if (movie.length > 0)
            {
                var movieElement: QuickTimePlugin = <any>movie.get(0);
                if (typeof movieElement.Play != 'undefined')
                {
                    return movieElement;
                }
            }
            movie = $("#" + this.playerId + "Embed");
            if (movie.length > 0)
            {
                var movieElement: QuickTimePlugin = <any> movie.get(0);
                if (typeof movieElement.Play != 'undefined')
                {
                    return movieElement;
                }
            }
            return null;
        }

        private resizePlayer()
        {
            var width = this.$element.width();
            var height = this.getPlayerHeight();
            this.setHeight(height);

            //            this.quicktimePlayer.style.width = "" + width + "px";
            //            this.quicktimePlayer.style.heightght + "px";

            $("#" + this.playerId).css({ "width": "" + width + "px", "height": "" + height + "px" });
            $("#" + this.playerId + "Embed").css({ "width": "" + width + "px", "height": "" + height + "px" });

        }

        private getPlayerHeight(): number
        {
            var aspectRatio = this.aspectRatio || (16 / 9);
            var width = this.$element.width();
            return width / aspectRatio;
        }
    }
}
