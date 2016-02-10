module ui.panels
{
    import Panel = controls.Panel;
    import TabPanel = controls.TabPanel;
    import CheckBox = controls.CheckBox;

    import $catdv = catdv.RestApi;
    import Clip = catdv.Clip;
    import PanelDefinition = catdv.PanelDefinition;
    import PanelField = catdv.PanelField;
    import FieldDefinition = catdv.FieldDefinition;
    import PartialResultSet = catdv.PartialResultSet;

    import PanelManager = logic.DetailsPanelManager;
    import DetailField = logic.DetailField;
    import DetailFieldFactory = logic.DetailFieldFactory;
    import FieldAccessor = logic.FieldAccessor;
    import AccessorFactory = logic.AccessorFactory;
    import ClipManager = logic.ClipManager;

    class FieldBinding
    {
        public detailField: DetailField;
        public fieldAccessor: FieldAccessor;
        public originalValue : any;

        // When editing multiple clips - keeps track of which fields have actually been edited
        // and will need to be written back to the clips
        public edited: boolean;

        constructor(detailField: DetailField, fieldAccessor: FieldAccessor)
        {
            this.detailField = detailField;
            this.fieldAccessor = fieldAccessor;
            this.edited = false;
        }
    }

    export class ClipDetailsPanel extends Panel
    {
        public panels: TabPanel = null;
        public fieldBindings: FieldBinding[] = null;

        constructor(element: any)
        {
            super(element);
        }

        public initialisePanels(clip: Clip)
        {
            PanelManager.getPanelDefinitions(clip, (panelDefs) =>
            {
                this.createPanels(panelDefs);
                this.updateUI();
            });
        }

        public createPanels(panelDefs: PanelDefinition[])
        {
            if (this.panels == null)
            {
                this.panels = TabPanel.create(this);
            }
            this.panels.clear();
            this.fieldBindings = [];
            panelDefs.forEach((panel, p) =>
            {
                var $detailsTab = this.panels.addTab(panel.name, p == 0);
                var $table = $("<table class='details'></table>").appendTo($detailsTab);

                panelDefs[p].fields.forEach((panelField, f) =>
                {
                    if (panelField.fieldDefinition)
                    {
                        var fieldID = "f_" + p + "_" + f;
                        this.fieldBindings.push(this.createDetailField(panelField, fieldID, $table));
                    }
                });
            });
        }

        public createDetailField(panelField: PanelField, fieldID: string, $table: JQuery): FieldBinding
        { /* abstract */ return null; }

        public updateUI()
        { /* abstract */ }

        public updateModel()
        { /* abstract */ }
    }

    export class SingleClipDetailsPanel extends ClipDetailsPanel
    {
        private clip: Clip = null;

        constructor(element: any)
        {
            super(element);
        }

        public setClip(clip: Clip)
        {
            this.clip = clip;
            super.initialisePanels(clip);
        }

        public createDetailField(panelField: PanelField, fieldID: string, $table: JQuery): FieldBinding
        {
            var $tr = $("<tr><th>" + panelField.fieldDefinition.name + "</th></tr>").appendTo($table);
            var $td = $("<td></td>").appendTo($tr);
            var detailField = DetailFieldFactory.createField(fieldID, panelField, panelField.fieldDefinition, $td);
            detailField.setEditable(true);

            return new FieldBinding(detailField, AccessorFactory.createAccessor(panelField.fieldDefinition));
        }

        public updateUI()
        {
            this.fieldBindings.forEach((fieldBinding) =>
            {
                fieldBinding.originalValue = fieldBinding.fieldAccessor.getValue(this.clip);
                fieldBinding.detailField.setValue(fieldBinding.originalValue);
            });
        }

        public updateModel()
        {
            this.fieldBindings.forEach((fieldBinding) =>
            {
                var fieldValue = fieldBinding.detailField.getValue();
                var newValue = fieldValue ? String(fieldValue) : "";
                var originalValue = fieldBinding.originalValue ? String(fieldBinding.originalValue) : "";
                if(newValue != originalValue)
                { 
                    fieldBinding.fieldAccessor.setValue(this.clip, fieldValue);
                }
                fieldBinding.detailField.setEditable(false);
            });
        }
    }

    export class MultiClipDetailsPanel extends ClipDetailsPanel
    {
        private clips: Clip[] = null;

        constructor(element: any)
        {
            super(element);
        }

        public setClips(clips: Clip[])
        {
            this.clips = clips;
            super.initialisePanels(clips[0]);
        }

        public createDetailField(panelField: PanelField, fieldID: string, $table: JQuery): FieldBinding
        {
            var $tr = $("<tr class='readonly'><th>" + panelField.fieldDefinition.name + "</th></tr>").appendTo($table);
            var $td = $("<td></td>").appendTo($tr);

            var detailField = DetailFieldFactory.createField(fieldID, panelField, panelField.fieldDefinition, $td);
            detailField.setEditable(false);

            var fieldBinding = new FieldBinding(detailField, AccessorFactory.createAccessor(panelField.fieldDefinition));

            $td = $("<td></td>").appendTo($tr);
            if (panelField.fieldDefinition.isEditable && !panelField.readOnly)
            {
                var chkEdit = CheckBox.create({}, $td);

                chkEdit.onChanged((evt) =>
                {
                    if (chkEdit.isChecked())
                    {
                        fieldBinding.edited = true;
                        $tr.removeClass("readonly");
                        detailField.setEditable(true);
                    }
                    else
                    {
                        fieldBinding.edited = false;
                        $tr.addClass("readonly");
                        this.updateDetailField(fieldBinding);
                        detailField.setEditable(false);
                    }
                });
            }

            return fieldBinding;
        }

        public updateUI()
        {
            this.fieldBindings.forEach((fieldBinding) => this.updateDetailField(fieldBinding));
        }

        public updateModel()
        {
            this.fieldBindings.forEach((fieldBinding) =>
            {
                if (fieldBinding.edited)
                {
                    // apply new value to all clips
                    var value = fieldBinding.detailField.getValue();
                    this.clips.forEach((clip) =>
                    {
                        fieldBinding.fieldAccessor.setValue(clip, value);
                    });
                    fieldBinding.detailField.setEditable(false);
                }
            });
        }

        private updateDetailField(fieldBinding: FieldBinding)
        {
            var commonValue = null;
            var valuesVary: boolean = false;

            for (var i = 0; i < this.clips.length; i++)
            {
                var clip = this.clips[i];
                var clipValue = fieldBinding.fieldAccessor.getValue(clip);
                if (i == 0)
                {
                    commonValue = clipValue;
                }
                else
                {
                    if (clipValue !== commonValue)
                    {
                        valuesVary = true;
                        break;
                    }
                }
            }

            if (valuesVary)
            {
                fieldBinding.detailField.setValue(null);
            }
            else
            {
                fieldBinding.detailField.setValue(commonValue);
            }
        }

    }
}