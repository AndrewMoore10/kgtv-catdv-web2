var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ui;
(function (ui) {
    var Label = controls.Label;
    var Button = controls.Button;
    var Modal = controls.Modal;
    var TextBox = controls.TextBox;
    var ClipMediaPanel = ui.panels.ClipMediaPanel;
    var EventMarkersPanel = ui.panels.EventMarkersPanel;
    var SingleClipDetailsPanel = ui.panels.SingleClipDetailsPanel;
    var MultiClipDetailsPanel = ui.panels.MultiClipDetailsPanel;
    var PlayerControls = ui.panels.PlayerControls;
    var NavbarLoginMenu = ui.panels.NavbarLoginMenu;
    var MultiClipPreviewPanel = ui.panels.MultiClipPreviewPanel;
    var $catdv = catdv.RestApi;
    var ServerSettings = logic.ServerSettings;
    var ClipManager = logic.ClipManager;
    var SaveContext = logic.SaveContext;
    var ClipDetailsPage = (function () {
        function ClipDetailsPage() {
            var _this = this;
            this.clipHeading = new Label("clipHeading");
            this.navbarLoginMenu = new NavbarLoginMenu("navbarLoginMenu");
            this.clipMediaPanel = null;
            this.playerControls = null;
            this.eventMarkersPanel = null;
            this.clipDetailsPanel = null;
            this.previewPanel = null;
            this.editSeqBtn = new Button("editSeqBtn");
            this.clipSaveBtn = new Button("clipSaveBtn");
            this.clipCancelBtn = new Button("clipCancelBtn");
            this.createSubclipDialog = new CreateSubclipDialog("createSubclipDialog");
            this.clip = null;
            this.clips = null;
            var clipIdParam = $.urlParam("id");
            var clipIdsParam = $.urlParam("ids");
            // Editing one clip
            if (clipIdParam != null) {
                var clipId = Number(clipIdParam);
                this.playerControls = new PlayerControls("playerControls", { MarkInOut: true, CreateMarkers: true, CreateSubClip: true, FullScreen: true });
                this.clipMediaPanel = new ClipMediaPanel("clipMediaPanel", this.playerControls);
                this.eventMarkersPanel = new EventMarkersPanel("eventMarkersPanel");
                this.clipDetailsPanel = new SingleClipDetailsPanel("clipDetailsPanel");
                ServerSettings.load(function () {
                    $catdv.getClip(clipId, function (clip) {
                        _this.clip = clip;
                        _this.clipHeading.setText(clip.name);
                        _this.clipMediaPanel.setClip(clip);
                        _this.eventMarkersPanel.setClip(clip);
                        _this.clipDetailsPanel.setClip(clip);
                        _this.editSeqBtn.show(_this.clip.type == "seq");
                        _this.setDirty(false);
                        // TODO: probably no need to read-only mode any more - so this could become unnecessary
                        _this.eventMarkersPanel.setEditable(true);
                    });
                });
                this.editSeqBtn.onClick(function (evt) {
                    _this.setDirty(true);
                    document.location.href = "seq-edit.jsp?id=" + clipId;
                });
                this.playerControls.onAddMarker(function (evt) {
                    _this.eventMarkersPanel.addMarker(_this.clipMediaPanel.getCurrentTime(), evt.markerType);
                });
                this.playerControls.onSetMarkIn(function (evt) {
                    _this.clipDetailsPanel.updateUI();
                });
                this.playerControls.onSetMarkOut(function (evt) {
                    _this.clipDetailsPanel.updateUI();
                });
                this.playerControls.onCreateSubclip(function (evt) {
                    _this.createSubclipDialog.onOK(function (name, notes) {
                        _this.setDirty(true);
                        ClipManager.createSubclip(name, notes, _this.clip, function (savedSubclip) {
                            document.location.href = "clip-details.jsp?id=" + savedSubclip.ID;
                        });
                    });
                    _this.createSubclipDialog.show();
                });
                this.eventMarkersPanel.onMovetimeChanged(function (movieTime) {
                    _this.clipMediaPanel.setCurrentTime(movieTime);
                });
                this.eventMarkersPanel.onTimelineSelectionChanged(function (markIn, markOut) {
                    _this.clipMediaPanel.setSelection(markIn, markOut);
                });
            }
            else if (clipIdsParam != null) {
                var clipIds = JSON.parse(clipIdsParam);
                this.clipDetailsPanel = new MultiClipDetailsPanel("clipDetailsPanel");
                this.clipHeading.setText("Editing " + clipIds.length + " clips");
                $catdv.getClips({ filter: "and((clip.id)isOneOf(" + clipIds.join(",") + "))", include: "userFields" }, function (resultSet) {
                    _this.clips = resultSet.items;
                    _this.clipDetailsPanel.setClips(_this.clips);
                    _this.previewPanel = new MultiClipPreviewPanel("clipMediaPanel", _this.clips);
                });
            }
            this.clipSaveBtn.onClick(function (evt) { return _this.clipSaveBtn_onclick(evt); });
            this.clipCancelBtn.onClick(function (evt) { return _this.clipCancelBtn_onclick(evt); });
        }
        ClipDetailsPage.prototype.clipSaveBtn_onclick = function (evt) {
            this.clipDetailsPanel.updateModel();
            this.setDirty(true);
            if (this.clip) {
                ClipManager.prepareForSaving(this.clip, 1 /* SingleClip */);
                $catdv.saveClip(this.clip, function (clip) {
                    document.location.href = "default.jsp";
                });
            }
            else if (this.clips) {
                this.clips.forEach(function (clip) { return ClipManager.prepareForSaving(clip, 2 /* MultiClip */); });
                $catdv.saveClips(this.clips, function (n) {
                    document.location.href = "default.jsp";
                });
            }
        };
        ClipDetailsPage.prototype.setDirty = function (dirty) {
            // useCache cookie is used by ClipList page to determine if it is ok to use cached results
            // Initially we assume it is ok, but if anything on this page changes the clip, or calls
            // another pag that might change the clip then assume the clip is dirty and turn off cache cookie
            // forcing the clip list page to reload the data.
            $.cookie("catdv_useCache", String(!dirty));
        };
        ClipDetailsPage.prototype.clipCancelBtn_onclick = function (evt) {
            document.location.href = "default.jsp";
        };
        return ClipDetailsPage;
    })();
    ui.ClipDetailsPage = ClipDetailsPage;
    var CreateSubclipDialog = (function (_super) {
        __extends(CreateSubclipDialog, _super);
        function CreateSubclipDialog(element) {
            var _this = this;
            _super.call(this, element);
            this.txtSubclipName = new TextBox("txtSubclipName");
            this.txtSubclipNotes = new TextBox("txtSubclipNotes");
            this.btnCreateSubclipDialogOK = new Button("btnCreateSubclipDialogOK");
            this.btnCreateSubclipDialogOK.onClick(function (evt) {
                if (!_this.txtSubclipName.getText()) {
                    alert("Name required");
                }
                else {
                    _this.close(true, _this.txtSubclipName.getText());
                }
            });
        }
        return CreateSubclipDialog;
    })(Modal);
})(ui || (ui = {}));
