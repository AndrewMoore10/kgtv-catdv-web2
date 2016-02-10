module ui
{
    import $catdv = catdv.RestApi;
    import TextBox = controls.TextBox;
    import Button = controls.Button;
    import RadioButton = controls.RadioButton;
    import TreeView = controls.TreeView;
    import Label = controls.Label;
    import Modal = controls.Modal;

    import Clip = catdv.Clip;
    import PartialResultSet = catdv.PartialResultSet;
    import QueryDefinition = catdv.QueryDefinition;
    import ServerCommand = catdv.ServerCommand;
    import CommandResults = catdv.CommandResults;
    import Platform = util.Platform;

    import ClipManager = logic.ClipManager;
    import ServerPluginManager = logic.ServerPluginManager;
    import ServerCommandMenu = logic.ServerCommandMenu;
    import ServerSettings = logic.ServerSettings;

    import NavigatorPanel = ui.panels.NavigatorPanel;
    import ClipListPanel = ui.panels.ClipListPanel;
    import ClipViewType = ui.panels.ClipViewType;
    import QueryBuilder = ui.panels.QueryBuilder;
    import NavbarLoginMenu = ui.panels.NavbarLoginMenu;

    export class SearchPage
    {
        private btnFileUpload = new Button("btnFileUpload");

        private btnEditClips = new Button("btnEditClips");
        private btnCreateSequence = new Button("btnCreateSequence");
        private btnDeleteClip = new Button("btnDeleteClip");
        private btnFCPExport = new Button("btnFCPExport");

        private serverCommandMenu = new ServerCommandMenu("menuServerCommands");
        private navbarLoginMenu = new NavbarLoginMenu("navbarLoginMenu");

        private clipList: ClipListPanel = null;
        private navigator: NavigatorPanel = null;

        private currentCatalogID: number = null;
        private currentSmartFolderID: number = null;

        private createSequenceDialog = new CreateSequenceDialog("createSequenceDialog");

        constructor()
        {
            ServerSettings.load(() =>
            {
                this.clipList = new ClipListPanel("clipListPanel", "clip-details.jsp");
                this.navigator = new NavigatorPanel("navigatorPanel", this.clipList);

                this.btnFileUpload.onClick((evt) =>
                {
                    if (Platform.isOldIE())
                    {
                        window.open("simpleUpload.jsp", "Upload", "width=400,height=350");
                    }
                    else
                    {
                        window.open("uploadFiles.jsp", "Upload", "width=500,height=450");
                    }
                });

                this.btnEditClips.onClick((evt) => 
                {
                    var selectedClips = this.clipList.getSelectedClips();
                    if (selectedClips.length > 1)
                    {
                        document.location.href = "clip-details.jsp?ids=[" + selectedClips.map((clip) => clip.ID).join(",") + "]";
                    }
                    else
                    {
                        document.location.href = "clip-details.jsp?id=" + selectedClips[0].ID;
                    }
                });

                this.btnCreateSequence.onClick((evt) =>
                {
                    this.createSequenceDialog.show();
                });

                this.btnDeleteClip.onClick((evt) =>
                {
                    var clip = (this.clipList.getSelectedClips())[0];
                    if (confirm("Are you sure you want to delete '" + clip.name + "'?\nThis action cannot be undone."))
                    {
                        $catdv.deleteClip(clip.ID,() =>
                        {
                            this.clipList.reload();
                        });
                    }
                });

                this.createSequenceDialog.onOK((name: string, useSelection: boolean) =>
                {
                    var selectedClips = this.clipList.getSelectedClips();
                    ClipManager.createSequence(name, useSelection, selectedClips,(savedSequence: Clip) =>
                    {
                        document.location.href = "seq-edit.jsp?id=" + savedSequence.ID;
                    });
                });

                this.btnFCPExport.onClick((evt) =>
                {
                    ClipManager.exportFCPXML(this.clipList.getSelectedClips());
                });

                this.serverCommandMenu.onClick((serverCommand: ServerCommand) =>
                {
                    ServerPluginManager.performCommand(serverCommand, this.clipList.getSelectedClips(),(result: CommandResults) =>
                    {
                        if ((result.clipIDs != null) && (result.clipIDs.length > 0))
                        {
                            var clipIDs = result.clipIDs.map((a) => String(a)).reduce((a, b) => a + "," + b);
                            this.clipList.setQuery({ terms: [{ field: "clip.id", op: "isOneOf", params: clipIDs }] }, "Results:" + serverCommand.name);
                        }
                        else
                        {
                            this.clipList.reload();
                        }
                    });

                });
            });
        }
    }


    class CreateSequenceDialog extends Modal 
    {
        private txtSequenceName = new TextBox("txtSequenceName");
        private rdoUseWholeClip = new RadioButton("rdoUseWholeClip");
        private rdoUseSelection = new RadioButton("rdoUseSelection");

        private btnCreateSequenceDialogOK = new Button("btnCreateSequenceDialogOK");

        constructor(element: any)
        {
            super(element);

            this.btnCreateSequenceDialogOK.onClick((evt) =>
            {
                if (!this.txtSequenceName.getText()) 
                {
                    alert("Name required");
                }
                else
                {
                    this.close(true, this.txtSequenceName.getText(), this.rdoUseSelection.isSelected());
                }
            });
        }
    }
}