module logic
{
    import Control = controls.Control;
    import Button = controls.Button;
    import TextBox = controls.TextBox;
    import TextArea = controls.TextArea;
    import DropDownList = controls.DropDownList;
    import ListBox = controls.ListBox;
    import CheckBox = controls.CheckBox;
    import RadioButtonSet = controls.RadioButtonSet;
    import MultiCheckBoxes = controls.MultiCheckBoxes;
    import Timer = controls.Timer;
    import MessageBox = controls.MessageBox;

    import $catdv = catdv.RestApi;
    import Clip = catdv.Clip;
    import ServerCommand = catdv.ServerCommand;
    import CommandParams = catdv.CommandParams;
    import CommandResults = catdv.CommandResults;
    import QueryDefinition = catdv.QueryDefinition;

    import ServerCommandDialog = ui.ServerCommandDialog;

    interface ArgumentControl
    {
        controlType: string;
        inputControl: any;
    }

    // TODO: not really the right place for this
    export class ServerCommandMenu extends Control
    {
        private $menu: JQuery;

        constructor(element: any)
        {
            super(element);

            this.$menu = this.$element.find("ul");
        }

        public onClick(clickHandler: (command: ServerCommand) => void)
        {
            ServerPluginManager.getCommands((commands) =>
            {
                if (commands && commands.length > 0) this.show(true);
                commands.forEach((command) =>
                {
                    var $menuItem = $("<li><a href='#'>" + command.name + "</a></li>").appendTo(this.$menu);
                    $menuItem.on("click", (evt) =>
                    {
                        clickHandler(command);
                    });
                });

            });
        }
    }

    /**
     * This class runs in the web client to interpret and execute the commands that are returned from a server plugin
     */
    export class ServerPluginManager
    {
        // Values taken from squarebox.catdv.plugin.CommandResponse
        public static RESULT_MESSAGE = 0;        // don't return clips, display information message
        public static RESULT_WARNING = 1;        // display a warning message
        public static RESULT_ERROR = 2;          // display an error message
        public static RESULT_QUERY_RESULTS = 3;  // return existing server clips (as if it's a query result set)
        public static RESULT_CHAIN_COMMAND = 4;  // execute another command
        // Passing clips by value isn't supported so the following all just refresh the web client
        public static RESULT_UPDATE_CLIPS = 5;   // update the specified clips (passed by value)
        public static RESULT_REPLACE_CLIPS = 6;  // replace the old client selection with the new ones (passed by value)
        public static RESULT_ADD_CLIPS = 7;      // add new clips to the client window (passed by value)
        public static RESULT_SAVE_CHANGES = 8;   // clips were passed by reference so save changes on the server and get client to refresh window
        // Checkin/checkout isn't currently supported in web client
        public static RESULT_UPLOAD_FILES = 9;     // client should copy file for each clip to fileRoot then call chained command
        public static RESULT_DOWNLOAD_FILES = 10;  // client should copy files[] from fileRoot to local disk (optional chained command called on completion)
        public static RESULT_DELETE_UPLOADED = 11; // after successful file upload the client can now delete the original files (if clips is non-null then
        // also implies RESULT_UPDATE_CLIPS, if chainCommand is not null implies RESULT_CHAIN_COMMAND).
        // This is implemented though...
        public static RESULT_POLL_PROGRESS = 12;   // automatically call the chained action after 5s (eg. display progress for long running operation) (V2 ONLY)  

        private static serverCommands: ServerCommand[] = null;

        private static serverCommandArgsDialog : ServerCommandDialog = null;

        /**
       * Get a list of server plugin commands to display in a drop down menu on the web client
       */
        public static getCommands(callback: (commands: ServerCommand[]) => void)
        {
            if (ServerPluginManager.serverCommands == null)
            {
                $catdv.getServerCommands((commands) =>
                {
                    ServerPluginManager.serverCommands = commands;
                    callback(commands);
                });
            }
            else
            {
                callback(ServerPluginManager.serverCommands);
            }
        }

        // User has selected a command from the drop down so perform it
        public static getCommand(commandId: number)
        {
            return ServerPluginManager.serverCommands.find((command) => command.id == commandId);
        }


        // Performing a command either involves displaying a input dialog that prompts the user to enter some data
        // to be submitted to the server or immediately executing the command on the server if it has no args.
        public static performCommand(cmd: ServerCommand, selectedClips: Clip[], callback: (result: CommandResults) => void)
        {
            if (cmd == null)
            {
                alert("null command");
            }
            else if (cmd.arguments != null && cmd.arguments.length > 0)
            {
                if (ServerPluginManager.serverCommandArgsDialog == null)
                {
                    ServerPluginManager.serverCommandArgsDialog = new ServerCommandDialog("serverCommandArgsDialog");
                    ServerPluginManager.serverCommandArgsDialog.onOK((cmd, args: string[]) =>
                    {
                        ServerPluginManager.executeCommand(cmd, selectedClips, args, callback);
                    });
                }
                ServerPluginManager.serverCommandArgsDialog.setCommand(cmd);
                ServerPluginManager.serverCommandArgsDialog.show();
            }
            else
            {
                ServerPluginManager.executeCommand(cmd, selectedClips, null, callback);
            }
        }


        // User has entered arguments (if appropriate) so now we're ready to submit the command to execute
        // on the server, and then interpret whatever response the server sends us.
        private static executeCommand(cmd: ServerCommand, selectedClips: Clip[], args: string[], callback: (result: CommandResults) => void)
        {
            var selectedClipIDs = (selectedClips || []).map((clip) => clip.ID);

            var params: CommandParams = {
                commandName: cmd.name,
                clipIDs: selectedClipIDs,
                arguments: args
            };

            $catdv.execServerCommand(cmd.id, params, (result: CommandResults) =>
            {
                ServerPluginManager.processResults(cmd, selectedClips, result, callback);
            });
        }

        private static processResults(cmd: ServerCommand, selectedClips: Clip[], result: CommandResults, callback: (result: CommandResults) => void)
        {
            if (result.message != null)
            {
                // if we have a message, we need to show that before continuing, remembering that we have to use a callback
                var autoRefresh = result.resultMode == ServerPluginManager.RESULT_POLL_PROGRESS;
                var allowCancel = result.resultMode == ServerPluginManager.RESULT_CHAIN_COMMAND;

                //                var mode = autoRefresh ? MessageBox.BUTTONS_CLOSE : allowCancel ? MessageBox.BUTTONS_OK_CANCEL : MessageBox.BUTTONS_OK;
                //
                var dlg = new MessageBox(result.message, cmd.name);
                dlg.onOK(() =>
                {
                    // we've dealt with the message now, so carry on and process the rest of the results
                    result.message = null;
                    ServerPluginManager.processResults(cmd, selectedClips, result, callback);
                });
                dlg.show();

                //                if (autoRefresh)
                //                {
                //                    var timer = new Timer(5000, () => 
                //                    {
                //                        if (dlg.isShowing())
                //                        {
                //                            dlg.hide();
                //                        }
                //                        ServerPluginManager.performCommand(result.chainedCommand);
                //                    });
                //                    timer.start();
                //                    return;
                //  
            }

            else if (result.resultMode == ServerPluginManager.RESULT_CHAIN_COMMAND)
            {
                ServerPluginManager.performCommand(result.chainedCommand, selectedClips, callback);
            }
            else if (result.resultMode == ServerPluginManager.RESULT_QUERY_RESULTS && result.clipIDs != null)
            {
                callback(result);
            }
        }
    }
}