var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var logic;
(function (logic) {
    var Control = controls.Control;
    var MessageBox = controls.MessageBox;
    var $catdv = catdv.RestApi;
    var ServerCommandDialog = ui.ServerCommandDialog;
    // TODO: not really the right place for this
    var ServerCommandMenu = (function (_super) {
        __extends(ServerCommandMenu, _super);
        function ServerCommandMenu(element) {
            _super.call(this, element);
            this.$menu = this.$element.find("ul");
        }
        ServerCommandMenu.prototype.onClick = function (clickHandler) {
            var _this = this;
            ServerPluginManager.getCommands(function (commands) {
                if (commands && commands.length > 0)
                    _this.show(true);
                commands.forEach(function (command) {
                    var $menuItem = $("<li><a href='#'>" + command.name + "</a></li>").appendTo(_this.$menu);
                    $menuItem.on("click", function (evt) {
                        clickHandler(command);
                    });
                });
            });
        };
        return ServerCommandMenu;
    })(Control);
    logic.ServerCommandMenu = ServerCommandMenu;
    /**
     * This class runs in the web client to interpret and execute the commands that are returned from a server plugin
     */
    var ServerPluginManager = (function () {
        function ServerPluginManager() {
        }
        /**
       * Get a list of server plugin commands to display in a drop down menu on the web client
       */
        ServerPluginManager.getCommands = function (callback) {
            if (ServerPluginManager.serverCommands == null) {
                $catdv.getServerCommands(function (commands) {
                    ServerPluginManager.serverCommands = commands;
                    callback(commands);
                });
            }
            else {
                callback(ServerPluginManager.serverCommands);
            }
        };
        // User has selected a command from the drop down so perform it
        ServerPluginManager.getCommand = function (commandId) {
            return ServerPluginManager.serverCommands.find(function (command) { return command.id == commandId; });
        };
        // Performing a command either involves displaying a input dialog that prompts the user to enter some data
        // to be submitted to the server or immediately executing the command on the server if it has no args.
        ServerPluginManager.performCommand = function (cmd, selectedClips, callback) {
            if (cmd == null) {
                alert("null command");
            }
            else if (cmd.arguments != null && cmd.arguments.length > 0) {
                if (ServerPluginManager.serverCommandArgsDialog == null) {
                    ServerPluginManager.serverCommandArgsDialog = new ServerCommandDialog("serverCommandArgsDialog");
                    ServerPluginManager.serverCommandArgsDialog.onOK(function (cmd, args) {
                        ServerPluginManager.executeCommand(cmd, selectedClips, args, callback);
                    });
                }
                ServerPluginManager.serverCommandArgsDialog.setCommand(cmd);
                ServerPluginManager.serverCommandArgsDialog.show();
            }
            else {
                ServerPluginManager.executeCommand(cmd, selectedClips, null, callback);
            }
        };
        // User has entered arguments (if appropriate) so now we're ready to submit the command to execute
        // on the server, and then interpret whatever response the server sends us.
        ServerPluginManager.executeCommand = function (cmd, selectedClips, args, callback) {
            var selectedClipIDs = (selectedClips || []).map(function (clip) { return clip.ID; });
            var params = {
                commandName: cmd.name,
                clipIDs: selectedClipIDs,
                arguments: args
            };
            $catdv.execServerCommand(cmd.id, params, function (result) {
                ServerPluginManager.processResults(cmd, selectedClips, result, callback);
            });
        };
        ServerPluginManager.processResults = function (cmd, selectedClips, result, callback) {
            if (result.message != null) {
                // if we have a message, we need to show that before continuing, remembering that we have to use a callback
                var autoRefresh = result.resultMode == ServerPluginManager.RESULT_POLL_PROGRESS;
                var allowCancel = result.resultMode == ServerPluginManager.RESULT_CHAIN_COMMAND;
                //                var mode = autoRefresh ? MessageBox.BUTTONS_CLOSE : allowCancel ? MessageBox.BUTTONS_OK_CANCEL : MessageBox.BUTTONS_OK;
                //
                var dlg = new MessageBox(result.message, cmd.name);
                dlg.onOK(function () {
                    // we've dealt with the message now, so carry on and process the rest of the results
                    result.message = null;
                    ServerPluginManager.processResults(cmd, selectedClips, result, callback);
                });
                dlg.show();
            }
            else if (result.resultMode == ServerPluginManager.RESULT_CHAIN_COMMAND) {
                ServerPluginManager.performCommand(result.chainedCommand, selectedClips, callback);
            }
            else if (result.resultMode == ServerPluginManager.RESULT_QUERY_RESULTS && result.clipIDs != null) {
                callback(result);
            }
        };
        // Values taken from squarebox.catdv.plugin.CommandResponse
        ServerPluginManager.RESULT_MESSAGE = 0; // don't return clips, display information message
        ServerPluginManager.RESULT_WARNING = 1; // display a warning message
        ServerPluginManager.RESULT_ERROR = 2; // display an error message
        ServerPluginManager.RESULT_QUERY_RESULTS = 3; // return existing server clips (as if it's a query result set)
        ServerPluginManager.RESULT_CHAIN_COMMAND = 4; // execute another command
        // Passing clips by value isn't supported so the following all just refresh the web client
        ServerPluginManager.RESULT_UPDATE_CLIPS = 5; // update the specified clips (passed by value)
        ServerPluginManager.RESULT_REPLACE_CLIPS = 6; // replace the old client selection with the new ones (passed by value)
        ServerPluginManager.RESULT_ADD_CLIPS = 7; // add new clips to the client window (passed by value)
        ServerPluginManager.RESULT_SAVE_CHANGES = 8; // clips were passed by reference so save changes on the server and get client to refresh window
        // Checkin/checkout isn't currently supported in web client
        ServerPluginManager.RESULT_UPLOAD_FILES = 9; // client should copy file for each clip to fileRoot then call chained command
        ServerPluginManager.RESULT_DOWNLOAD_FILES = 10; // client should copy files[] from fileRoot to local disk (optional chained command called on completion)
        ServerPluginManager.RESULT_DELETE_UPLOADED = 11; // after successful file upload the client can now delete the original files (if clips is non-null then
        // also implies RESULT_UPDATE_CLIPS, if chainCommand is not null implies RESULT_CHAIN_COMMAND).
        // This is implemented though...
        ServerPluginManager.RESULT_POLL_PROGRESS = 12; // automatically call the chained action after 5s (eg. display progress for long running operation) (V2 ONLY)  
        ServerPluginManager.serverCommands = null;
        ServerPluginManager.serverCommandArgsDialog = null;
        return ServerPluginManager;
    })();
    logic.ServerPluginManager = ServerPluginManager;
})(logic || (logic = {}));
