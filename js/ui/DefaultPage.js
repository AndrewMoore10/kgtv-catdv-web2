var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ui;
(function (ui) {
    var $catdv = catdv.RestApi;
    var TextBox = controls.TextBox;
    var Button = controls.Button;
    var RadioButton = controls.RadioButton;
    var Modal = controls.Modal;
    var Platform = util.Platform;
    var ClipManager = logic.ClipManager;
    var ServerPluginManager = logic.ServerPluginManager;
    var ServerCommandMenu = logic.ServerCommandMenu;
    var ServerSettings = logic.ServerSettings;
    var NavigatorPanel = ui.panels.NavigatorPanel;
    var ClipListPanel = ui.panels.ClipListPanel;
    var NavbarLoginMenu = ui.panels.NavbarLoginMenu;
    var SearchPage = (function () {
        function SearchPage() {
            var _this = this;
            this.btnFileUpload = new Button("btnFileUpload");
            this.btnEditClips = new Button("btnEditClips");
            this.btnCreateSequence = new Button("btnCreateSequence");
            this.btnDeleteClip = new Button("btnDeleteClip");
            this.btnFCPExport = new Button("btnFCPExport");
            this.serverCommandMenu = new ServerCommandMenu("menuServerCommands");
            this.navbarLoginMenu = new NavbarLoginMenu("navbarLoginMenu");
            this.clipList = null;
            this.navigator = null;
            this.currentCatalogID = null;
            this.currentSmartFolderID = null;
            this.createSequenceDialog = new CreateSequenceDialog("createSequenceDialog");
            ServerSettings.load(function () {
                _this.clipList = new ClipListPanel("clipListPanel", "clip-details.jsp");
                _this.navigator = new NavigatorPanel("navigatorPanel", _this.clipList);
                _this.btnFileUpload.onClick(function (evt) {
                    if (Platform.isOldIE()) {
                        window.open("simpleUpload.jsp", "Upload", "width=400,height=350");
                    }
                    else {
                        window.open("uploadFiles.jsp", "Upload", "width=500,height=450");
                    }
                });
                _this.btnEditClips.onClick(function (evt) {
                    var selectedClips = _this.clipList.getSelectedClips();
                    if (selectedClips.length > 1) {
                        document.location.href = "clip-details.jsp?ids=[" + selectedClips.map(function (clip) { return clip.ID; }).join(",") + "]";
                    }
                    else {
                        document.location.href = "clip-details.jsp?id=" + selectedClips[0].ID;
                    }
                });
                _this.btnCreateSequence.onClick(function (evt) {
                    _this.createSequenceDialog.show();
                });
                _this.btnDeleteClip.onClick(function (evt) {
                    var clip = (_this.clipList.getSelectedClips())[0];
                    if (confirm("Are you sure you want to delete '" + clip.name + "'?\nThis action cannot be undone.")) {
                        $catdv.deleteClip(clip.ID, function () {
                            _this.clipList.reload();
                        });
                    }
                });
                _this.createSequenceDialog.onOK(function (name, useSelection) {
                    var selectedClips = _this.clipList.getSelectedClips();
                    ClipManager.createSequence(name, useSelection, selectedClips, function (savedSequence) {
                        document.location.href = "seq-edit.jsp?id=" + savedSequence.ID;
                    });
                });
                _this.btnFCPExport.onClick(function (evt) {
                    ClipManager.exportFCPXML(_this.clipList.getSelectedClips());
                });
                _this.serverCommandMenu.onClick(function (serverCommand) {
                    ServerPluginManager.performCommand(serverCommand, _this.clipList.getSelectedClips(), function (result) {
                        if ((result.clipIDs != null) && (result.clipIDs.length > 0)) {
                            var clipIDs = result.clipIDs.map(function (a) { return String(a); }).reduce(function (a, b) { return a + "," + b; });
                            _this.clipList.setQuery({ terms: [{ field: "clip.id", op: "isOneOf", params: clipIDs }] }, "Results:" + serverCommand.name);
                        }
                        else {
                            _this.clipList.reload();
                        }
                    });
                });
            });
        }
        return SearchPage;
    })();
    ui.SearchPage = SearchPage;
    var CreateSequenceDialog = (function (_super) {
        __extends(CreateSequenceDialog, _super);
        function CreateSequenceDialog(element) {
            var _this = this;
            _super.call(this, element);
            this.txtSequenceName = new TextBox("txtSequenceName");
            this.rdoUseWholeClip = new RadioButton("rdoUseWholeClip");
            this.rdoUseSelection = new RadioButton("rdoUseSelection");
            this.btnCreateSequenceDialogOK = new Button("btnCreateSequenceDialogOK");
            this.btnCreateSequenceDialogOK.onClick(function (evt) {
                if (!_this.txtSequenceName.getText()) {
                    alert("Name required");
                }
                else {
                    _this.close(true, _this.txtSequenceName.getText(), _this.rdoUseSelection.isSelected());
                }
            });
        }
        return CreateSequenceDialog;
    })(Modal);
})(ui || (ui = {}));
