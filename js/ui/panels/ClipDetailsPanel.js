var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ui;
(function (ui) {
    var panels;
    (function (panels) {
        var Panel = controls.Panel;
        var TabPanel = controls.TabPanel;
        var CheckBox = controls.CheckBox;
        var PanelManager = logic.DetailsPanelManager;
        var DetailFieldFactory = logic.DetailFieldFactory;
        var AccessorFactory = logic.AccessorFactory;
        var FieldBinding = (function () {
            function FieldBinding(detailField, fieldAccessor) {
                this.detailField = detailField;
                this.fieldAccessor = fieldAccessor;
                this.edited = false;
            }
            return FieldBinding;
        })();
        var ClipDetailsPanel = (function (_super) {
            __extends(ClipDetailsPanel, _super);
            function ClipDetailsPanel(element) {
                _super.call(this, element);
                this.panels = null;
                this.fieldBindings = null;
            }
            ClipDetailsPanel.prototype.initialisePanels = function (clip) {
                var _this = this;
                PanelManager.getPanelDefinitions(clip, function (panelDefs) {
                    _this.createPanels(panelDefs);
                    _this.updateUI();
                });
            };
            ClipDetailsPanel.prototype.createPanels = function (panelDefs) {
                var _this = this;
                if (this.panels == null) {
                    this.panels = TabPanel.create(this);
                }
                this.panels.clear();
                this.fieldBindings = [];
                panelDefs.forEach(function (panel, p) {
                    var $detailsTab = _this.panels.addTab(panel.name, p == 0);
                    var $table = $("<table class='details'></table>").appendTo($detailsTab);
                    panelDefs[p].fields.forEach(function (panelField, f) {
                        if (panelField.fieldDefinition) {
                            var fieldID = "f_" + p + "_" + f;
                            _this.fieldBindings.push(_this.createDetailField(panelField, fieldID, $table));
                        }
                    });
                });
            };
            ClipDetailsPanel.prototype.createDetailField = function (panelField, fieldID, $table) {
                return null;
            };
            ClipDetailsPanel.prototype.updateUI = function () {
            };
            ClipDetailsPanel.prototype.updateModel = function () {
            };
            return ClipDetailsPanel;
        })(Panel);
        panels.ClipDetailsPanel = ClipDetailsPanel;
        var SingleClipDetailsPanel = (function (_super) {
            __extends(SingleClipDetailsPanel, _super);
            function SingleClipDetailsPanel(element) {
                _super.call(this, element);
                this.clip = null;
            }
            SingleClipDetailsPanel.prototype.setClip = function (clip) {
                this.clip = clip;
                _super.prototype.initialisePanels.call(this, clip);
            };
            SingleClipDetailsPanel.prototype.createDetailField = function (panelField, fieldID, $table) {
                var $tr = $("<tr><th>" + panelField.fieldDefinition.name + "</th></tr>").appendTo($table);
                var $td = $("<td></td>").appendTo($tr);
                var detailField = DetailFieldFactory.createField(fieldID, panelField, panelField.fieldDefinition, $td);
                detailField.setEditable(true);
                return new FieldBinding(detailField, AccessorFactory.createAccessor(panelField.fieldDefinition));
            };
            SingleClipDetailsPanel.prototype.updateUI = function () {
                var _this = this;
                this.fieldBindings.forEach(function (fieldBinding) {
                    fieldBinding.originalValue = fieldBinding.fieldAccessor.getValue(_this.clip);
                    fieldBinding.detailField.setValue(fieldBinding.originalValue);
                });
            };
            SingleClipDetailsPanel.prototype.updateModel = function () {
                var _this = this;
                this.fieldBindings.forEach(function (fieldBinding) {
                    var fieldValue = fieldBinding.detailField.getValue();
                    var newValue = fieldValue ? String(fieldValue) : "";
                    var originalValue = fieldBinding.originalValue ? String(fieldBinding.originalValue) : "";
                    if (newValue != originalValue) {
                        fieldBinding.fieldAccessor.setValue(_this.clip, fieldValue);
                    }
                    fieldBinding.detailField.setEditable(false);
                });
            };
            return SingleClipDetailsPanel;
        })(ClipDetailsPanel);
        panels.SingleClipDetailsPanel = SingleClipDetailsPanel;
        var MultiClipDetailsPanel = (function (_super) {
            __extends(MultiClipDetailsPanel, _super);
            function MultiClipDetailsPanel(element) {
                _super.call(this, element);
                this.clips = null;
            }
            MultiClipDetailsPanel.prototype.setClips = function (clips) {
                this.clips = clips;
                _super.prototype.initialisePanels.call(this, clips[0]);
            };
            MultiClipDetailsPanel.prototype.createDetailField = function (panelField, fieldID, $table) {
                var _this = this;
                var $tr = $("<tr class='readonly'><th>" + panelField.fieldDefinition.name + "</th></tr>").appendTo($table);
                var $td = $("<td></td>").appendTo($tr);
                var detailField = DetailFieldFactory.createField(fieldID, panelField, panelField.fieldDefinition, $td);
                detailField.setEditable(false);
                var fieldBinding = new FieldBinding(detailField, AccessorFactory.createAccessor(panelField.fieldDefinition));
                $td = $("<td></td>").appendTo($tr);
                if (panelField.fieldDefinition.isEditable && !panelField.readOnly) {
                    var chkEdit = CheckBox.create({}, $td);
                    chkEdit.onChanged(function (evt) {
                        if (chkEdit.isChecked()) {
                            fieldBinding.edited = true;
                            $tr.removeClass("readonly");
                            detailField.setEditable(true);
                        }
                        else {
                            fieldBinding.edited = false;
                            $tr.addClass("readonly");
                            _this.updateDetailField(fieldBinding);
                            detailField.setEditable(false);
                        }
                    });
                }
                return fieldBinding;
            };
            MultiClipDetailsPanel.prototype.updateUI = function () {
                var _this = this;
                this.fieldBindings.forEach(function (fieldBinding) { return _this.updateDetailField(fieldBinding); });
            };
            MultiClipDetailsPanel.prototype.updateModel = function () {
                var _this = this;
                this.fieldBindings.forEach(function (fieldBinding) {
                    if (fieldBinding.edited) {
                        // apply new value to all clips
                        var value = fieldBinding.detailField.getValue();
                        _this.clips.forEach(function (clip) {
                            fieldBinding.fieldAccessor.setValue(clip, value);
                        });
                        fieldBinding.detailField.setEditable(false);
                    }
                });
            };
            MultiClipDetailsPanel.prototype.updateDetailField = function (fieldBinding) {
                var commonValue = null;
                var valuesVary = false;
                for (var i = 0; i < this.clips.length; i++) {
                    var clip = this.clips[i];
                    var clipValue = fieldBinding.fieldAccessor.getValue(clip);
                    if (i == 0) {
                        commonValue = clipValue;
                    }
                    else {
                        if (clipValue !== commonValue) {
                            valuesVary = true;
                            break;
                        }
                    }
                }
                if (valuesVary) {
                    fieldBinding.detailField.setValue(null);
                }
                else {
                    fieldBinding.detailField.setValue(commonValue);
                }
            };
            return MultiClipDetailsPanel;
        })(ClipDetailsPanel);
        panels.MultiClipDetailsPanel = MultiClipDetailsPanel;
    })(panels = ui.panels || (ui.panels = {}));
})(ui || (ui = {}));
