var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var controls;
(function (controls) {
    var ItemPlayer = (function () {
        function ItemPlayer(sequenceItem, timelineOffset, playerControl) {
            // Ignore player events. Used as an interlock to prevent processing of events while in the even handler 
            // and while player is being used externally (while editing the in/outs of an individual sequence item)
            this.isLocked = false;
            this.mediaUrl = sequenceItem.url;
            this.videoPlayer = playerControl;
            this.timelineOffset = timelineOffset;
            this.clipIn = sequenceItem.clipIn;
            this.clipOut = sequenceItem.clipOut;
            this.itemDuration = this.clipOut - this.clipIn;
            this.aspectRatio = sequenceItem.aspectRatio;
        }
        ItemPlayer.prototype.showPlayer = function () {
            this.videoPlayer.css({ "top": 0, "left": 0, "bottom": 0, "right": 0 });
        };
        ItemPlayer.prototype.hidePlayer = function () {
            var _this = this;
            var width = this.videoPlayer.getWidth();
            var height = this.videoPlayer.getHeight();
            // Hide player in two steps to encourage Chrome to repaint. 1st step move it nearly out of view
            // (having it slightly in view seems to be the trick) and then after the event loop returns
            // indicating that the redraw has happened -  move it completely offscreen.
            this.videoPlayer.css({ "top": height - 2, "left": width - 2, "bottom": "", "right": "" });
            controls.Dispatcher.dispatch(function () {
                _this.videoPlayer.css({ "top": -10000, "left": -10000 });
            });
        };
        return ItemPlayer;
    })();
    var SequencePlayer = (function (_super) {
        __extends(SequencePlayer, _super);
        function SequencePlayer(element) {
            var _this = this;
            _super.call(this, element);
            this.playheadMovedListeners = new controls.EventListeners();
            this.resizePlayerHandler = function () { return _this.resizePlayer(); };
            // Make this the postioning container for the players
            this.css({ "position": "relative", "width": "100%", "overflow": "hidden" });
            this.$element.addClass("videoPlayer");
            // If height not explicitly set then we should manage it
            this.handleResizeInCode = !this.$element.get(0).style.height;
        }
        SequencePlayer.prototype.getClipType = function () {
            return "sequence";
        };
        SequencePlayer.prototype.openSequence = function (sequenceItems, useQuickTime, readyCallback) {
            var _this = this;
            // Close any previously open players
            // TODO: reuse existing players
            this.dispose();
            if (this.handleResizeInCode) {
                $(window).on("resize", this.resizePlayerHandler);
            }
            this.currentItemPlayerIndex = -1;
            var timeOffset = 0.0;
            this.itemPlayers = [];
            sequenceItems.forEach(function (sequenceItem, i) {
                var playerControl;
                if (useQuickTime) {
                    playerControl = new controls.QuickTimeVideoPlayer($("<div id='" + _this.elementId + "_" + i + "'>").appendTo(_this.$element));
                }
                else {
                    playerControl = new controls.HtmlVideoPlayer($("<div id='" + _this.elementId + "_" + i + "'>").appendTo(_this.$element));
                }
                playerControl.css({ "position": "absolute", "margin": "auto", "width": "100%", "height": "100%" });
                if (i == 0) {
                    // show first player by placing at 0,0           
                    playerControl.css({ "top": "0px", "left": "0px", "bottom": "0px", "right": "0px" });
                }
                else {
                    // hide all other players by placing outside container
                    playerControl.css({ "top": "-10000px", "left": "-10000px" });
                }
                var itemPlayer = new ItemPlayer(sequenceItem, timeOffset, playerControl);
                _this.itemPlayers.push(itemPlayer);
                timeOffset += itemPlayer.itemDuration;
                itemPlayer.videoPlayer.addPlayheadMovedListener(function (evt) {
                    _this.itemPlayer_PlayheadMoved(i, evt.playerTimeSeconds, evt.isPlaying);
                });
                controls.Dispatcher.dispatch(function () {
                    playerControl.openMovie(itemPlayer.mediaUrl, sequenceItem.aspectRatio, i == 0 ? readyCallback : $.noop);
                });
            });
            if (this.handleResizeInCode) {
                this.resizePlayer();
            }
            this.currentItemPlayerIndex = 0;
        };
        SequencePlayer.prototype.updateSequenceItems = function (sequenceItems) {
            var _this = this;
            if (sequenceItems.length !== this.itemPlayers.length)
                throw "sequenceItems.length !== this.itemPlayers.length";
            var timelineOffset = 0.0;
            sequenceItems.forEach(function (sequenceItem, i) {
                var itemPlayer = _this.itemPlayers[i];
                itemPlayer.timelineOffset = timelineOffset;
                itemPlayer.clipIn = sequenceItem.clipIn;
                itemPlayer.clipOut = sequenceItem.clipOut;
                itemPlayer.itemDuration = sequenceItem.clipOut - sequenceItem.clipIn;
                timelineOffset += itemPlayer.itemDuration;
            });
        };
        // Lock (and return) the specified item player so that it can be used by another
        // component. This feature is used by the sequence editor to allow an individual sequence
        // item to be editing 
        SequencePlayer.prototype.lockItemPlayer = function (itemIndex) {
            this.stop();
            if (this.currentItemPlayerIndex != itemIndex) {
                this.itemPlayers[this.currentItemPlayerIndex].hidePlayer();
                this.currentItemPlayerIndex = itemIndex;
                this.itemPlayers[this.currentItemPlayerIndex].showPlayer();
            }
            this.itemPlayers[this.currentItemPlayerIndex].isLocked = true;
            return this.itemPlayers[this.currentItemPlayerIndex].videoPlayer;
        };
        SequencePlayer.prototype.unlockItemPlayer = function () {
            this.itemPlayers[this.currentItemPlayerIndex].isLocked = false;
        };
        SequencePlayer.prototype.resizePlayer = function () {
            var width = this.$element.width();
            var height = 0;
            if (this.itemPlayers && this.itemPlayers.length > 0) {
                this.itemPlayers.forEach(function (itemPlayer) {
                    var aspectRatio = itemPlayer.aspectRatio || (16 / 9);
                    height = Math.max(height, width / aspectRatio);
                });
            }
            else {
                height = width / (16 / 9);
            }
            this.setHeight(height);
        };
        SequencePlayer.prototype.itemPlayer_PlayheadMoved = function (itemPlayerIndex, time, isPlaying) {
            var itemPlayer = this.itemPlayers[itemPlayerIndex];
            if (itemPlayerIndex == this.currentItemPlayerIndex) {
                //                Console.debug("seq.onPlayheadMoved() itemPlayer[" + itemPlayerIndex + "].isLocked:" + itemPlayer.isLocked +
                //                    ", isPlaying:" + isPlaying + ", currentIsPlaying=" + this.currentIsPlaying);
                if (!itemPlayer.isLocked) {
                    itemPlayer.isLocked = true;
                    if (isPlaying && ((itemPlayer.clipIn - time) > 0.05)) {
                        itemPlayer.videoPlayer.setCurrentTime(itemPlayer.clipIn, 1 /* Playing */);
                    }
                    else if ((itemPlayer.clipOut - time) < 0.05) {
                        //                        Console.debug("Stop player " + itemPlayerIndex + " because " + time + " is past end (" + itemPlayer.clipOut + ")");
                        itemPlayer.videoPlayer.stop();
                        if (itemPlayerIndex < (this.itemPlayers.length - 1)) {
                            var nextItemPlayer = this.itemPlayers[++this.currentItemPlayerIndex];
                            nextItemPlayer.isLocked = true;
                            //                            Console.debug("Select player " + this.currentItemPlayerIndex + " because it's next");
                            nextItemPlayer.showPlayer();
                            nextItemPlayer.videoPlayer.setCurrentTime(nextItemPlayer.clipIn, isPlaying ? 1 /* Playing */ : 2 /* Stopped */);
                            nextItemPlayer.isLocked = false;
                            itemPlayer.hidePlayer();
                        }
                    }
                    this.currentIsPlaying = isPlaying;
                    this.currentTime = Math.max(itemPlayer.timelineOffset + (time - itemPlayer.clipIn), 0);
                    this.playheadMovedListeners.notifyListeners({ playerTimeSeconds: this.currentTime, isPlaying: this.currentIsPlaying });
                    itemPlayer.isLocked = false;
                }
            }
            else if (isPlaying) {
                itemPlayer.videoPlayer.stop();
            }
        };
        SequencePlayer.prototype.addPlayheadMovedListener = function (listener) {
            this.playheadMovedListeners.addListener(listener);
        };
        SequencePlayer.prototype.removePlayheadMovedListener = function (listener) {
            this.playheadMovedListeners.removeListener(listener);
        };
        // Override VideoPlayer.openMovie()
        SequencePlayer.prototype.openMovie = function (url, aspectRatio, Callback) {
            throw "Not implemented";
        };
        // Override VideoPlayer.dispose()
        SequencePlayer.prototype.dispose = function () {
            if (this.handleResizeInCode) {
                $(window).off("resize", this.resizePlayerHandler);
            }
            if (this.itemPlayers != null) {
                for (var i = 0; i < this.itemPlayers.length; i++) {
                    this.itemPlayers[i].videoPlayer.dispose();
                }
                this.itemPlayers = null;
            }
            this.$element.empty();
            this.currentItemPlayerIndex = -1;
        };
        // Override VideoPlayer.isMoviePlayable()
        SequencePlayer.prototype.isMoviePlayable = function () {
            if (this.itemPlayers == null)
                return false;
            for (var i = 0; i < this.itemPlayers.length; i++) {
                if (!this.itemPlayers[i].videoPlayer.isMoviePlayable())
                    return false;
            }
            return true;
        };
        // Override VideoPlayer.play()
        SequencePlayer.prototype.play = function () {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length)) {
                this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.play();
            }
        };
        // Override VideoPlayer.togglePlay()
        SequencePlayer.prototype.togglePlay = function () {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length)) {
                this.currentIsPlaying = this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.togglePlay();
                this.playheadMovedListeners.notifyListeners({ playerTimeSeconds: this.currentTime, isPlaying: this.currentIsPlaying });
            }
            return this.currentIsPlaying;
        };
        // Override VideoPlayer.stop()
        SequencePlayer.prototype.stop = function () {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length)) {
                this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.stop();
                this.currentIsPlaying = false;
                this.playheadMovedListeners.notifyListeners({ playerTimeSeconds: this.currentTime, isPlaying: this.currentIsPlaying });
            }
        };
        // Override VideoPlayer.stepForward()
        SequencePlayer.prototype.stepForward = function (numFrames) {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length)) {
                this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.stepForward(numFrames);
            }
        };
        // Override VideoPlayer.stepBack()
        SequencePlayer.prototype.stepBack = function (numFrames) {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length)) {
                this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.stepBack(numFrames);
                // HACK to handle stepping back off the end of the item
                if (this.currentItemPlayerIndex > 0) {
                    var itemPlayer = this.itemPlayers[this.currentItemPlayerIndex];
                    var newTime = itemPlayer.videoPlayer.getCurrentTime();
                    if (newTime < itemPlayer.clipIn) {
                        var prevItemPlayer = this.itemPlayers[--this.currentItemPlayerIndex];
                        itemPlayer.videoPlayer.stop();
                        prevItemPlayer.showPlayer();
                        prevItemPlayer.videoPlayer.setCurrentTime(prevItemPlayer.clipOut);
                        prevItemPlayer.videoPlayer.stop();
                        itemPlayer.hidePlayer();
                    }
                }
            }
        };
        // Override VideoPlayer.getCurrentTime()
        // Reports time in seconds from start of sequence
        SequencePlayer.prototype.getCurrentTime = function () {
            return this.currentTime;
        };
        // Override VideoPlayer.setCurrentTime()
        // Takes time in seconds from start of sequence
        SequencePlayer.prototype.setCurrentTime = function (time, stateAfterSeek) {
            if (stateAfterSeek === void 0) { stateAfterSeek = 2 /* Stopped */; }
            this.currentTime = time;
            var targetItemPlayerIndex = 0;
            while ((targetItemPlayerIndex < (this.itemPlayers.length - 1)) && (time > (this.itemPlayers[targetItemPlayerIndex].timelineOffset + this.itemPlayers[targetItemPlayerIndex].itemDuration))) {
                targetItemPlayerIndex++;
            }
            //            Console.debug("SequencePlayer.setCurrentTime(" + time + ") - targetItemPlayerIndex:" + targetItemPlayerIndex + " (currentItemPlayerIndex: " + this.currentItemPlayerIndex + ")");
            var currentItemPlayer = this.itemPlayers[this.currentItemPlayerIndex];
            if (targetItemPlayerIndex != this.currentItemPlayerIndex) {
                this.currentItemPlayerIndex = targetItemPlayerIndex;
                var targetItemPlayer = this.itemPlayers[targetItemPlayerIndex];
                currentItemPlayer.videoPlayer.stop();
                targetItemPlayer.showPlayer();
                targetItemPlayer.videoPlayer.setCurrentTime(targetItemPlayer.clipIn + (time - targetItemPlayer.timelineOffset), 2 /* Stopped */);
                currentItemPlayer.hidePlayer();
            }
            else {
                currentItemPlayer.videoPlayer.setCurrentTime(currentItemPlayer.clipIn + (time - currentItemPlayer.timelineOffset));
            }
        };
        // Override VideoPlayer.setInOut()
        SequencePlayer.prototype.setInOut = function (mediaStart, mediaEnd) {
            // N/A
        };
        // Override VideoPlayer.setSelection()
        SequencePlayer.prototype.setSelection = function (selectionStart, selectionEnd) {
            // N/A. Playback of selections is enforced in MediaPanel.playheadMoved()
        };
        // Override VideoPlayer.isPlaying()
        SequencePlayer.prototype.isPlaying = function () {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length)) {
                return this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.isPlaying();
            }
            else {
                return false;
            }
        };
        SequencePlayer.prototype.getDuration = function () {
            var duration = 0.0;
            this.itemPlayers.forEach(function (itemPlayer) {
                duration += itemPlayer.itemDuration;
            });
            return duration;
        };
        SequencePlayer.prototype.supportsFullscreen = function () {
            return false;
        };
        SequencePlayer.prototype.fullscreen = function () {
            //N/A
        };
        SequencePlayer.prototype.supportsOverlays = function () {
            return (this.itemPlayers != null) && (this.itemPlayers.length > 0) && this.itemPlayers[0].videoPlayer.supportsOverlays();
        };
        return SequencePlayer;
    })(controls.Control);
    controls.SequencePlayer = SequencePlayer;
})(controls || (controls = {}));
