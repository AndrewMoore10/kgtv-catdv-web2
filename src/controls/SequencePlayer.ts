module controls
{
    import Timecode = catdv.Timecode;

    export interface ItemDescriptor
    {
        url?: string;
        clipIn: number;
        clipOut: number;
        aspectRatio: number;
    }

    class ItemPlayer
    {
        public mediaUrl: string;
        public videoPlayer: VideoPlayer;

        // All times are stored as floating point seconds 
        public timelineOffset: number; // seconds from start of timeline where this item begins
        public clipIn: number; // seconds from start of the clip where this item starts
        public clipOut: number; // seconds from start of the clip where this item end
        public itemDuration: number; // duration of item in seconds
        public aspectRatio: number;

        // Ignore player events. Used as an interlock to prevent processing of events while in the even handler 
        // and while player is being used externally (while editing the in/outs of an individual sequence item)
        public isLocked = false;

        constructor(sequenceItem: ItemDescriptor, timelineOffset: number, playerControl: VideoPlayer)
        {
            this.mediaUrl = sequenceItem.url;
            this.videoPlayer = playerControl;

            this.timelineOffset = timelineOffset;
            this.clipIn = sequenceItem.clipIn;
            this.clipOut = sequenceItem.clipOut;
            this.itemDuration = this.clipOut - this.clipIn;
            this.aspectRatio = sequenceItem.aspectRatio;
        }

        public showPlayer()
        {
            this.videoPlayer.css({ "top": 0, "left": 0, "bottom": 0, "right": 0 });
        }

        public hidePlayer()
        {
            var width = this.videoPlayer.getWidth();
            var height = this.videoPlayer.getHeight();

            // Hide player in two steps to encourage Chrome to repaint. 1st step move it nearly out of view
            // (having it slightly in view seems to be the trick) and then after the event loop returns
            // indicating that the redraw has happened -  move it completely offscreen.
            this.videoPlayer.css({ "top": height - 2, "left": width - 2, "bottom": "", "right": "" });
            Dispatcher.dispatch(() =>
            {
                this.videoPlayer.css({ "top": -10000, "left": -10000 });
            });
        }
    }


    export class SequencePlayer extends Control implements VideoPlayer
    {
        private itemPlayers: ItemPlayer[];
        private currentItemPlayerIndex: number;
        // Current playhead position is seconds from start of the sequence
        private currentTime: number;
        private currentIsPlaying: boolean;
        private sizeIsDefined: boolean;
        private playheadMovedListeners: EventListeners<PlayerEvent> = new EventListeners<PlayerEvent>();
        private handleResizeInCode: boolean;
        private resizePlayerHandler = () => this.resizePlayer();

        constructor(element: any)
        {
            super(element);

             // Make this the postioning container for the players
            this.css({ "position": "relative", "width": "100%", "overflow": "hidden" });
            this.$element.addClass("videoPlayer");
            // If height not explicitly set then we should manage it
            this.handleResizeInCode = !this.$element.get(0).style.height;
        }

        public getClipType()
        {
            return "sequence";
        }

        public openSequence(sequenceItems: ItemDescriptor[], useQuickTime: boolean, readyCallback: () => void)
        {
            // Close any previously open players
            // TODO: reuse existing players
            this.dispose();

            if (this.handleResizeInCode)
            {
                $(window).on("resize", this.resizePlayerHandler);
            }

            this.currentItemPlayerIndex = -1;

            var timeOffset = 0.0;
            this.itemPlayers = [];
            sequenceItems.forEach((sequenceItem, i) =>
            {
                var playerControl;
                if (useQuickTime)
                {
                    playerControl = new QuickTimeVideoPlayer($("<div id='" + this.elementId + "_" + i + "'>").appendTo(this.$element));
                }
                else
                {
                    playerControl = new HtmlVideoPlayer($("<div id='" + this.elementId + "_" + i + "'>").appendTo(this.$element));
                }
                playerControl.css({ "position": "absolute", "margin": "auto", "width": "100%", "height": "100%" });
                if (i == 0)
                {
                    // show first player by placing at 0,0           
                    playerControl.css({ "top": "0px", "left": "0px", "bottom": "0px", "right": "0px" });
                }
                else
                {
                    // hide all other players by placing outside container
                    playerControl.css({ "top": "-10000px", "left": "-10000px" });
                }

                var itemPlayer = new ItemPlayer(sequenceItem, timeOffset, playerControl);
                this.itemPlayers.push(itemPlayer);
                timeOffset += itemPlayer.itemDuration;

                itemPlayer.videoPlayer.addPlayheadMovedListener((evt) =>
                {
                    this.itemPlayer_PlayheadMoved(i, evt.playerTimeSeconds, evt.isPlaying);
                });

                Dispatcher.dispatch(() =>
                {
                    playerControl.openMovie(itemPlayer.mediaUrl, sequenceItem.aspectRatio, i == 0 ? readyCallback : $.noop);
                });
            });

            if (this.handleResizeInCode)
            {
                this.resizePlayer();
            }

            this.currentItemPlayerIndex = 0;
        }

        public updateSequenceItems(sequenceItems: ItemDescriptor[])
        {
            if (sequenceItems.length !== this.itemPlayers.length) throw "sequenceItems.length !== this.itemPlayers.length";

            var timelineOffset = 0.0;
            sequenceItems.forEach((sequenceItem, i) => 
            {
                var itemPlayer = this.itemPlayers[i];
                itemPlayer.timelineOffset = timelineOffset;
                itemPlayer.clipIn = sequenceItem.clipIn;
                itemPlayer.clipOut = sequenceItem.clipOut;
                itemPlayer.itemDuration = sequenceItem.clipOut - sequenceItem.clipIn;
                timelineOffset += itemPlayer.itemDuration;
            });
        }

        // Lock (and return) the specified item player so that it can be used by another
        // component. This feature is used by the sequence editor to allow an individual sequence
        // item to be editing 
        public lockItemPlayer(itemIndex: number): VideoPlayer
        {
            this.stop();
            if (this.currentItemPlayerIndex != itemIndex)
            {
                this.itemPlayers[this.currentItemPlayerIndex].hidePlayer();
                this.currentItemPlayerIndex = itemIndex;
                this.itemPlayers[this.currentItemPlayerIndex].showPlayer();
            }
            this.itemPlayers[this.currentItemPlayerIndex].isLocked = true;
            return this.itemPlayers[this.currentItemPlayerIndex].videoPlayer;
        }
        public unlockItemPlayer()
        {
            this.itemPlayers[this.currentItemPlayerIndex].isLocked = false;
        }

        private resizePlayer()
        {
            var width = this.$element.width();
            var height = 0;
            if (this.itemPlayers && this.itemPlayers.length > 0)
            {
                this.itemPlayers.forEach((itemPlayer) => 
                {
                    var aspectRatio = itemPlayer.aspectRatio || (16 / 9);
                    height = Math.max(height, width / aspectRatio);
                });
            }
            else
            {
                height = width / (16 / 9);
            }

            this.setHeight(height);
        }

        private itemPlayer_PlayheadMoved(itemPlayerIndex: number, time: number, isPlaying: boolean)
        {
            var itemPlayer = this.itemPlayers[itemPlayerIndex];

            if (itemPlayerIndex == this.currentItemPlayerIndex)
            {
                //                Console.debug("seq.onPlayheadMoved() itemPlayer[" + itemPlayerIndex + "].isLocked:" + itemPlayer.isLocked +
                //                    ", isPlaying:" + isPlaying + ", currentIsPlaying=" + this.currentIsPlaying);

                if (!itemPlayer.isLocked)
                {
                    itemPlayer.isLocked = true;

                    if (isPlaying && ((itemPlayer.clipIn - time) > 0.05))
                    {
                        itemPlayer.videoPlayer.setCurrentTime(itemPlayer.clipIn, PlayingState.Playing);
                    }
                    else if ((itemPlayer.clipOut - time) < 0.05)
                    {
                        //                        Console.debug("Stop player " + itemPlayerIndex + " because " + time + " is past end (" + itemPlayer.clipOut + ")");
                        itemPlayer.videoPlayer.stop();
                        if (itemPlayerIndex < (this.itemPlayers.length - 1))
                        {
                            var nextItemPlayer = this.itemPlayers[++this.currentItemPlayerIndex];
                            nextItemPlayer.isLocked = true;
                            //                            Console.debug("Select player " + this.currentItemPlayerIndex + " because it's next");
                            nextItemPlayer.showPlayer();
                            nextItemPlayer.videoPlayer.setCurrentTime(nextItemPlayer.clipIn, isPlaying ? PlayingState.Playing : PlayingState.Stopped);
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
            else if (isPlaying)
            {
                itemPlayer.videoPlayer.stop();
                //                Console.debug("Stop player " + itemPlayerIndex + " because it isn't the current player (which is " + this.currentItemPlayerIndex + ")");
            }
        }

        public addPlayheadMovedListener(listener: (evt: PlayerEvent) => void)
        {
            this.playheadMovedListeners.addListener(listener);
        }

        public removePlayheadMovedListener(listener: (evt: PlayerEvent) => void)
        {
            this.playheadMovedListeners.removeListener(listener);
        }

        // Override VideoPlayer.openMovie()
        public openMovie(url: string, aspectRatio: number, Callback: () => void)
        {
            throw "Not implemented";
        }

        // Override VideoPlayer.dispose()
        public dispose()
        {
            if (this.handleResizeInCode)
            {
                $(window).off("resize", this.resizePlayerHandler);
            }

            if (this.itemPlayers != null)
            {
                for (var i = 0; i < this.itemPlayers.length; i++)
                {
                    this.itemPlayers[i].videoPlayer.dispose();
                }
                this.itemPlayers = null;
            }
            this.$element.empty();
            this.currentItemPlayerIndex = -1;
        }


        // Override VideoPlayer.isMoviePlayable()
        public isMoviePlayable(): boolean
        {
            if (this.itemPlayers == null) return false;

            for (var i = 0; i < this.itemPlayers.length; i++)
            {
                if (!this.itemPlayers[i].videoPlayer.isMoviePlayable()) return false;
            }
            return true;
        }


        // Override VideoPlayer.play()
        public play()
        {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length))
            {
                this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.play();
            }
        }


        // Override VideoPlayer.togglePlay()
        public togglePlay(): boolean
        {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length))
            {
                this.currentIsPlaying = this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.togglePlay();
                this.playheadMovedListeners.notifyListeners({ playerTimeSeconds: this.currentTime, isPlaying: this.currentIsPlaying });
            }
            return this.currentIsPlaying;
        }


        // Override VideoPlayer.stop()
        public stop()
        {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length))
            {
                this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.stop();
                this.currentIsPlaying = false;
                this.playheadMovedListeners.notifyListeners({ playerTimeSeconds: this.currentTime, isPlaying: this.currentIsPlaying });
            }
        }

        // Override VideoPlayer.stepForward()
        public stepForward(numFrames: number)
        {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length))
            {
                this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.stepForward(numFrames);
            }
        }

        // Override VideoPlayer.stepBack()
        public stepBack(numFrames: number)
        {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length))
            {
                this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.stepBack(numFrames);

                // HACK to handle stepping back off the end of the item
                if (this.currentItemPlayerIndex > 0) 
                {
                    var itemPlayer = this.itemPlayers[this.currentItemPlayerIndex];
                    var newTime = itemPlayer.videoPlayer.getCurrentTime();
                    if (newTime < itemPlayer.clipIn)
                    {
                        var prevItemPlayer = this.itemPlayers[--this.currentItemPlayerIndex];
                        itemPlayer.videoPlayer.stop();
                        prevItemPlayer.showPlayer();
                        prevItemPlayer.videoPlayer.setCurrentTime(prevItemPlayer.clipOut);
                        prevItemPlayer.videoPlayer.stop();
                        itemPlayer.hidePlayer();
                    }
                }
            }
        }


        // Override VideoPlayer.getCurrentTime()
        // Reports time in seconds from start of sequence
        public getCurrentTime()
        {
            return this.currentTime;
        }


        // Override VideoPlayer.setCurrentTime()
        // Takes time in seconds from start of sequence
        public setCurrentTime(time: number, stateAfterSeek: PlayingState = PlayingState.Stopped)
        {
            this.currentTime = time;

            var targetItemPlayerIndex = 0;
            while ((targetItemPlayerIndex < (this.itemPlayers.length - 1)) && (time > (this.itemPlayers[targetItemPlayerIndex].timelineOffset + this.itemPlayers[targetItemPlayerIndex].itemDuration)))
            {
                targetItemPlayerIndex++;
            }

            //            Console.debug("SequencePlayer.setCurrentTime(" + time + ") - targetItemPlayerIndex:" + targetItemPlayerIndex + " (currentItemPlayerIndex: " + this.currentItemPlayerIndex + ")");
            var currentItemPlayer = this.itemPlayers[this.currentItemPlayerIndex];
            if (targetItemPlayerIndex != this.currentItemPlayerIndex)
            {
                this.currentItemPlayerIndex = targetItemPlayerIndex;
                var targetItemPlayer = this.itemPlayers[targetItemPlayerIndex];
                currentItemPlayer.videoPlayer.stop();
                targetItemPlayer.showPlayer();
                targetItemPlayer.videoPlayer.setCurrentTime(targetItemPlayer.clipIn + (time - targetItemPlayer.timelineOffset), PlayingState.Stopped);
                currentItemPlayer.hidePlayer();
            }
            else
            {
                currentItemPlayer.videoPlayer.setCurrentTime(currentItemPlayer.clipIn + (time - currentItemPlayer.timelineOffset));
            }
        }


        // Override VideoPlayer.setInOut()
        public setInOut(mediaStart: number, mediaEnd: number)
        {
            // N/A
        }


        // Override VideoPlayer.setSelection()
        public setSelection(selectionStart: number, selectionEnd: number)
        {
            // N/A. Playback of selections is enforced in MediaPanel.playheadMoved()
        }


        // Override VideoPlayer.isPlaying()
        public isPlaying(): boolean
        {
            if ((this.currentItemPlayerIndex >= 0) && (this.currentItemPlayerIndex < this.itemPlayers.length))
            {
                return this.itemPlayers[this.currentItemPlayerIndex].videoPlayer.isPlaying();
            }
            else
            {
                return false;
            }
        }


        public getDuration(): number
        {
            var duration = 0.0;
            this.itemPlayers.forEach((itemPlayer) =>
            {
                duration += itemPlayer.itemDuration;
            });
            return duration;
        }

        public supportsFullscreen()
        {
            return false;
        }
        public fullscreen()
        {
            //N/A
        }

        public supportsOverlays(): boolean
        {
            return (this.itemPlayers != null) && (this.itemPlayers.length > 0) && this.itemPlayers[0].videoPlayer.supportsOverlays();
        }
    }
}
