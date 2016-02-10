module ui
{
    import Control = controls.Control;
    import Label = controls.Label;
    import Image = controls.Image;
    import Button = controls.Button;
    import Modal = controls.Modal
    import TextBox = controls.TextBox;

    import ClipMediaPanel = ui.panels.ClipMediaPanel;
    import EventMarkersPanel = ui.panels.EventMarkersPanel;
    import ClipDetailsPanel = ui.panels.ClipDetailsPanel;
    import SingleClipDetailsPanel = ui.panels.SingleClipDetailsPanel;
    import MultiClipDetailsPanel = ui.panels.MultiClipDetailsPanel;
    import PlayerControls = ui.panels.PlayerControls;
    import NavbarLoginMenu = ui.panels.NavbarLoginMenu;
    import MultiClipPreviewPanel = ui.panels.MultiClipPreviewPanel;

    import $catdv = catdv.RestApi;
    import Clip = catdv.Clip;
    import Timecode = catdv.Timecode;

    import ServerSettings = logic.ServerSettings;
    import ClipManager = logic.ClipManager;
    import SaveContext = logic.SaveContext;

    export class ClipDetailsPage
    {
        private clipHeading = new Label("clipHeading");
        private navbarLoginMenu = new NavbarLoginMenu("navbarLoginMenu");

        private clipMediaPanel: ClipMediaPanel = null;
        private playerControls: PlayerControls = null;
        private eventMarkersPanel: EventMarkersPanel = null;
        private clipDetailsPanel: ClipDetailsPanel = null;
        private previewPanel: MultiClipPreviewPanel = null;

        private editSeqBtn = new Button("editSeqBtn");
        private clipSaveBtn = new Button("clipSaveBtn");
        private clipCancelBtn = new Button("clipCancelBtn");

        private createSubclipDialog = new CreateSubclipDialog("createSubclipDialog");

        private clip: Clip = null;
        private clips: Clip[] = null;

        constructor()
        {
            var clipIdParam = $.urlParam("id");
            var clipIdsParam = $.urlParam("ids");

            // Editing one clip
            if (clipIdParam != null)
            {
                var clipId = Number(clipIdParam);
                this.playerControls = new PlayerControls("playerControls", { MarkInOut: true,  CreateMarkers: true,  CreateSubClip: true, FullScreen:true });
                this.clipMediaPanel = new ClipMediaPanel("clipMediaPanel", this.playerControls);
                this.eventMarkersPanel = new EventMarkersPanel("eventMarkersPanel");
                this.clipDetailsPanel = new SingleClipDetailsPanel("clipDetailsPanel");

                ServerSettings.load(() =>
                {
                    $catdv.getClip(clipId, (clip) =>
                    {
                        this.clip = clip;
                        this.clipHeading.setText(clip.name);
                        this.clipMediaPanel.setClip(clip);
                        this.eventMarkersPanel.setClip(clip);
                        (<SingleClipDetailsPanel>this.clipDetailsPanel).setClip(clip);
                        this.editSeqBtn.show(this.clip.type == "seq");
                        this.setDirty(false);

                        // TODO: probably no need to read-only mode any more - so this could become unnecessary
                        this.eventMarkersPanel.setEditable(true);
                    });
                });

                this.editSeqBtn.onClick((evt) => { 
                    this.setDirty(true);
                    document.location.href = "seq-edit.jsp?id=" + clipId;
                });

                this.playerControls.onAddMarker((evt) =>
                {
                    this.eventMarkersPanel.addMarker(this.clipMediaPanel.getCurrentTime(), evt.markerType);
                });

                this.playerControls.onSetMarkIn((evt) =>
                {
                    this.clipDetailsPanel.updateUI();
                });
                this.playerControls.onSetMarkOut((evt) =>
                {
                    this.clipDetailsPanel.updateUI();
                });

                this.playerControls.onCreateSubclip((evt) =>
                {
                    this.createSubclipDialog.onOK((name: string, notes: string) =>
                    {
                        this.setDirty(true);
                        ClipManager.createSubclip(name, notes, this.clip, (savedSubclip: Clip) =>
                        {
                            document.location.href = "clip-details.jsp?id=" + savedSubclip.ID;
                        });
                    });
                    this.createSubclipDialog.show();
                });

                this.eventMarkersPanel.onMovetimeChanged((movieTime) =>
                {
                    this.clipMediaPanel.setCurrentTime(movieTime);
                });
                this.eventMarkersPanel.onTimelineSelectionChanged((markIn: Timecode, markOut: Timecode) =>
                {
                    this.clipMediaPanel.setSelection(markIn, markOut);
                });
            }
            // Editing multiple clips
            else if (clipIdsParam != null)
            {
                var clipIds: number[] = JSON.parse(clipIdsParam);
                this.clipDetailsPanel = new MultiClipDetailsPanel("clipDetailsPanel");

                this.clipHeading.setText("Editing " + clipIds.length + " clips");

                $catdv.getClips({ filter: "and((clip.id)isOneOf(" + clipIds.join(",") + "))", include: "userFields" }, (resultSet) =>
                {
                    this.clips = resultSet.items;
                    (<MultiClipDetailsPanel>this.clipDetailsPanel).setClips(this.clips);

                    this.previewPanel = new MultiClipPreviewPanel("clipMediaPanel", this.clips);
                });
            }

            this.clipSaveBtn.onClick((evt) => this.clipSaveBtn_onclick(evt));
            this.clipCancelBtn.onClick((evt) => this.clipCancelBtn_onclick(evt));
        }

        private clipSaveBtn_onclick(evt)
        {
            this.clipDetailsPanel.updateModel();
            this.setDirty(true);
 
            if (this.clip)
            {
                ClipManager.prepareForSaving(this.clip, SaveContext.SingleClip);
                $catdv.saveClip(this.clip, (clip) =>
                {
                    document.location.href = "default.jsp";
                });
            }
            else if (this.clips)
            {
                this.clips.forEach((clip) => ClipManager.prepareForSaving(clip, SaveContext.MultiClip));
                $catdv.saveClips(this.clips, (n) =>
                {
                    document.location.href = "default.jsp";
                });
            }
        }

        private setDirty(dirty : boolean)
        {
            // useCache cookie is used by ClipList page to determine if it is ok to use cached results
            // Initially we assume it is ok, but if anything on this page changes the clip, or calls
            // another pag that might change the clip then assume the clip is dirty and turn off cache cookie
            // forcing the clip list page to reload the data.
            $.cookie("catdv_useCache", String(!dirty));
        }
        
        private clipCancelBtn_onclick(evt)
        {                     
           document.location.href = "default.jsp";
        }
    }

    class CreateSubclipDialog extends Modal 
    {
        private txtSubclipName = new TextBox("txtSubclipName");
        private txtSubclipNotes = new TextBox("txtSubclipNotes");

        private btnCreateSubclipDialogOK = new Button("btnCreateSubclipDialogOK");

        constructor(element: any)
        {
            super(element);

            this.btnCreateSubclipDialogOK.onClick((evt) =>
            {
                if (!this.txtSubclipName.getText()) 
                {
                    alert("Name required");
                }
                else
                {
                    this.close(true, this.txtSubclipName.getText());
                }
            });
        }
    }

}