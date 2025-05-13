// Onamaewa © 2025 by c4205M is licensed under CC BY-NC 4.0. To view a copy of this license, visit https://creativecommons.org/licenses/by-nc/4.0/

// @ts-nocheck

import * as Ui from "LensStudio:Ui";
import CoreService from "LensStudio:CoreService";
// import * as FileSystem from "LensStudio:FileSystem";

const PREFIX_MAP = {
    Animation: "ANM_",
    Material: "M_",
    Mesh: "SM_",
    Texture: "T_",
    Tracking: "TRK_",
    Prefab: "PF_",
    Script: "S_",
    Shader: "Mf_",
    Vfx: "VFX_"
};

const KEYWORD_MAP = {
    Animation: [
        "AnimationAsset",
        "AnimationCurveTrack",
        "AnimationLayer",
        "AnimationMixerLayer",
    ],
    Material: ["Material"], 
    Mesh: [
        "FileMesh",
        "FaceMesh",
        "BodyMesh",
        "LocationMesh",
        "UpperBodyMesh",
        "WorldMesh",
    ],
    Texture: [
        "AnimatedTexture",
        "BodyDepthTexture",
        "BodyInstanceSegmentationTexture",
        "BodyNormalsTexture",
        "DepthStencilRenderTarget",
        "DeviceCameraTexture",
        "FaceImagePickerTexture",
        "FaceTexture",
        "FacelessTexture",
        "ObjectTrackingTexture",
        "ImagePickerTexture",
        "LocationTexture",
        "MediaPickerTexture",
        "ProxyTexture",
        "RenderTarget",
        "ReverseCameraTexture",
        "ScreenCropTexture",
        "ScreenTexture",
        "SegmentationTexture",
        "TextTexture",
        "FileTextureCubemap",
        "WorldDepthTexture",
        "FileTexture"
    ],
    Tracking: [
        "BodyTracking3DAsset",
        "ColocatedLandmarks2DMesh",
        "ColocatedLandmarks3DMesh",
        "ImageMarker",
        "FaceTrackingScope",
        "HandTracking3DAsset",
        "ImageMarker",
        "Location",
        "PersonTrackingScope",
        "SnapcodeMarker",
        "TextureTrackingScope",
        "UpperBodyTracking3DAsset",
    ],
    Prefab: ["ObjectPrefab"],
    Script: [
        "JavaScriptAsset",
        "ScriptGraphAsset",
        "TypeScriptAsset",
        "JsonAsset"
    ],
    Shader: ["ShaderGraphPass"],
    Vfx: ["VFXAsset"],
};

export class Onamaewa extends CoreService {
    static descriptor() {
        return {
            id: "com.c4205m.onamaewa",
            name: "Onamaewa",
            description: "Batch rename your assets",
            dependencies: [
                Editor.IContextActionRegistry,
                Editor.IEntityPicker,
                Editor.Model.IModel,
            ],
        };
    }

    constructor(pluginSystem) {
        super(pluginSystem);
    }

    createAction(context, id, caption) {
        if (!context.isOfType("AssetContext")) {
            return new Editor.ContextAction();
        }

        const menu = {
            convention: "Action.ByType",
            sequence: [
                "Action.SequenceEnd",
                "Action.SequenceStart",
            ],
            caseChange: [
                "Action.ToPascal",
                "Action.ToCamel",
                "Action.ToSnake",
                "Action.ToKebab",
            ]
        }

        const action = new Editor.ContextAction();
        action.id = id;
        action.caption = caption;
        action.description = "";

        action.group = ["Onamaewa | Batch Rename"];
        if(menu.caseChange.includes(id)) action.group = ["Onamaewa | Batch Rename", "Change Case"];
        if(menu.sequence.includes(id)) action.group = ["Onamaewa | Batch Rename", "Sequence"];

        action.apply = () => {
            const model = this.pluginSystem.findInterface(Editor.Model.IModel);
            const project = model.project;
            const assetManager = project.assetManager;
            const selection = context.selection;
            
            let assetsToRename = [];

            if (id === "Action.FindReplace") {
                this.showDialogFind(
                    this.pluginSystem,
                    this.listSelection(assetManager, selection),
                    (replacedAssets) =>
                        this.renameAssets(assetManager, replacedAssets)
                );
                return;
            }

            switch (id) {
                case menu.convention:
                    assetsToRename = this.listChangeByConvention(
                        assetManager,
                        selection
                    );
                    break;
                case menu.sequence[0]:
                    assetsToRename = this.listNumericSequence(
                        this.pluginSystem,
                        assetManager,
                        selection,
                        false
                    );
                    break;
                case menu.sequence[1]:
                    assetsToRename = this.listNumericSequence(
                        this.pluginSystem,
                        assetManager,
                        selection,
                        true
                    );
                    break;
                case menu.caseChange[0]:
                    assetsToRename = this.listChangeByCase(
                        assetManager,
                        selection,
                        0
                    );
                    break;
                case menu.caseChange[1]:
                    assetsToRename = this.listChangeByCase(
                        assetManager,
                        selection,
                        1
                    );
                    break;
                case menu.caseChange[2]:
                    assetsToRename = this.listChangeByCase(
                        assetManager,
                        selection,
                        2
                    );
                    break;
                case menu.caseChange[3]:
                    assetsToRename = this.listChangeByCase(
                        assetManager,
                        selection,
                        3
                    );
                    break;
            }

            this.showDialogEnd(this.pluginSystem, assetsToRename, () =>
                this.renameAssets(assetManager, assetsToRename)
            );
        };

        return action;
    }

    listChangeByConvention(assetManager, selection) {
        const comparison = [];

        for (const i of selection) {
            const meta = assetManager.getFileMeta(i.path);

            // assetManager contains assets only in /Assets
            // WARNING: meta is null on env map assets ??
            if (meta !== null) {
                const name = meta.primaryAsset.name;
                const type = meta.primaryAsset.type;
                let category = Object.entries(KEYWORD_MAP).find(
                    ([key, value]) => value.includes(type)
                );
                category = category ? category[0] : null;

                // if (category) {
                if (category && !name.startsWith(PREFIX_MAP[category])) {
                    comparison.push({
                        status: true,
                        original: name,
                        new: PREFIX_MAP[category] + this.changeCase(name, 4),
                        meta: meta,
                    });
                }
            }
        }

        return comparison;
    }

    listChangeByCase(assetManager, selection, type) {
        const comparison = [];

        for (const i of selection) {
            const meta = assetManager.getFileMeta(i.path);

            if (meta !== null) {
                const name = meta.primaryAsset.name;

                comparison.push({
                    status: true,
                    original: name,
                    new: this.changeCase(name, type),
                    meta: meta,
                });
            }
        }

        return comparison;
    }

    listNumericSequence(pluginSystem, assetManager, selection, isStart) {
        const comparison = [];
        const padLen =  selection.length.toString().length;

        for (const i in selection) {
            const meta = assetManager.getFileMeta(selection[i].path);

            if (meta !== null) {
                const name = meta.primaryAsset.name;

                comparison.push({
                    status: true,
                    original: name,
                    new: isStart ? i.padStart(padLen, "0") + "_" + name.replace(/^\d+[-_ ]*/, "").replace(/[-_ ]*\d+$/, "") : name.replace(/^\d+[-_ ]*/, "").replace(/[-_ ]*\d+$/, "") + "-" +i.padStart(padLen, "0"),
                    meta: meta,
                });
            }
        }

        return comparison;
    }

    listSelection(assetManager, selection) {
        const comparison = [];

        for (const i of selection) {
            const meta = assetManager.getFileMeta(i.path);

            if (meta !== null) {
                const name = meta.primaryAsset.name;

                comparison.push({
                    status: true,
                    original: name,
                    new: name,
                    meta: meta,
                });
            }
        }

        return comparison;
    }

    // [PASCAL, CAMEL, SNAKE, KEBAB, CONV]
    changeCase(str, type) {
        const cases = [
            (str) => str.replace(/[\s\._-]+(\w)/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase()),
            (str) => str.replace(/[\s\._-]+(\w)/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toLowerCase()),
            (str) => str.replace(/[\s\.\-]+/g, '_').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(),
            (str) => str.replace(/[\s\._-]+/g, "-").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
            (str) => str.replace(/[\s\._-]\w/g, (m) => { return m[0] === " " ? m[1].toUpperCase() : m[0] + m[1].toUpperCase(); }).replace(/^./, (c) => c.toUpperCase()),
        ];

        return cases[type] ? cases[type](str) : str;
    }

    renameAssets(assetManager, assetsToRename) {
        for (const i of assetsToRename) {
            if (i.status) {
                assetManager.rename(i.meta, i.new);
            }
        }
    }

    showDialogFind(pluginSystem, assetsToRename, confirmCallback = function () {}) {
        const pairNewReplaced = Array.from({ length: assetsToRename.length }, () => null);

        const gui = pluginSystem.findInterface(Ui.IGui);
        const dialog = gui.createDialog();

        const layout = Ui.BoxLayout.create();
        layout.setDirection(Ui.Direction.TopToBottom);
        layout.setContentsMargins(20, 20, 20, 20);

        // Search
        const search = Ui.LineEdit.create(dialog);
        search.placeholderText = "Find"

        const replace = Ui.LineEdit.create(dialog);
        replace.placeholderText = "Replace"

        const checkReplaceAll = Ui.CheckBox.create(dialog);
        checkReplaceAll.toolTip = "When enabled all instance will be replaced, default case is first instance only."
        checkReplaceAll.text = "Replace all"
        checkReplaceAll.checked = false

        //
        const header = Ui.GridLayout.create();
        header.setContentsMargins(30, 30, 30, 0);

        const headerStatus = Ui.Label.create(dialog);
        headerStatus.text = "Status";
        headerStatus.foregroundRole = Ui.ColorRole.BrightText;
        header.addWidgetAt(headerStatus, 0, 0, Ui.Alignment.AlignCenter);

        const headerOriginal = Ui.Label.create(dialog);
        headerOriginal.text = "Original";
        headerOriginal.foregroundRole = Ui.ColorRole.BrightText;
        header.addWidgetAt(headerOriginal, 0, 1, Ui.Alignment.AlignLeft);

        const headerNew = Ui.Label.create(dialog);
        headerNew.text = "Rename";
        headerNew.foregroundRole = Ui.ColorRole.BrightText;
        header.addWidgetAt(headerNew, 0, 2, Ui.Alignment.AlignLeft);

        //
        const grid = Ui.GridLayout.create();
        grid.setContentsMargins(30, 5, 30, 30);

        const scrollWidget = Ui.Widget.create(dialog);
        scrollWidget.layout = grid;

        const scrollArea = Ui.VerticalScrollArea.create(dialog);
        scrollArea.setWidget(scrollWidget);
        scrollArea.setMinimumWidth(400);

        assetsToRename.forEach((pair, index) => {
            const row = index;
            
            const statusCheck = Ui.CheckBox.create(scrollWidget);
            statusCheck.checked = pair.status;
            statusCheck.onToggle.connect(() => {
                pair.status = statusCheck.checked;
            });

            const originalNameLabel = Ui.Label.create(scrollWidget);
            originalNameLabel.text = pair.original;
            originalNameLabel.toolTip = pair.original;
            originalNameLabel.foregroundRole =
                Math.floor(row / 5) % 2 === 0
                    ? Ui.ColorRole.NoRole
                    : Ui.ColorRole.BrightText;

            const newNameLabel = Ui.Label.create(scrollWidget);
            newNameLabel.text = pair.new;
            newNameLabel.toolTip = pair.new;
            newNameLabel.foregroundRole =
                Math.floor(row / 5) % 2 === 0
                    ? Ui.ColorRole.NoRole
                    : Ui.ColorRole.BrightText;

            grid.addWidgetAt(statusCheck, row, 0, Ui.Alignment.AlignCenter);
            grid.addWidgetAt(originalNameLabel, row, 1, Ui.Alignment.AlignLeft);
            grid.addWidgetAt(newNameLabel, row, 2, Ui.Alignment.AlignLeft);
        });

        //
        const buttonConfirm = Ui.PushButton.create(dialog);
        buttonConfirm.primary = true;
        buttonConfirm.resize(100, 10);
        buttonConfirm.text = "Rename";
        buttonConfirm.enabled = true;
        buttonConfirm.onClick.connect(() => {
            try{
                let count = 0;
                assetsToRename.forEach((value, index) => {
                    if(pairNewReplaced[index]) {
                        value.new = pairNewReplaced[index];
                        count++;
                    }
                });
                
                confirmCallback(assetsToRename);
                
                console.info(
                    `Onamaewa: ${count} assets renamed`
                );
            } catch(e) {
                console.error(e);
            }

            dialog.close();
        });

        //
        const buttonCancel = Ui.PushButton.create(dialog);
        buttonCancel.resize(100, 10);
        buttonCancel.text = "Cancel";
        buttonCancel.enabled = true;
        buttonCancel.onClick.connect(() => {
            dialog.close();
        });

        // WARNING: Cant use setTimeout ??
        search.onTextChange.connect(refreshList);
        replace.onTextChange.connect(refreshList);
        checkReplaceAll.onToggle.connect(refreshList);

        // Initiate dialog
        layout.addWidget(search);
        layout.addWidget(replace);
        layout.addWidget(checkReplaceAll);

        layout.addLayout(header);
        layout.addWidget(scrollArea);
        layout.addWidget(buttonConfirm);
        layout.addWidget(buttonCancel);

        dialog.windowTitle = "Onamaewa | Batch Rename";
        dialog.layout = layout;

        dialog.blockSignals(true);
        dialog.raise();
        dialog.activateWindow();
        dialog.show();

        //////
        function refreshList() {
            grid.clear(Ui.ClearLayoutBehavior.DeleteClearedWidgets);

            let regex;
            try {
                regex = checkReplaceAll.checked ? new RegExp(search.text, "g") : new RegExp(search.text);
            } catch (error) {
                regex = new RegExp(""); 
            }

            assetsToRename.forEach((pair, index) => {
                if(pair.original.includes(search.text) || pair.original.match(regex)){
                    const row = index;
                    
                    const statusCheck = Ui.CheckBox.create(scrollWidget);
                    statusCheck.checked = pair.status;
                    statusCheck.onToggle.connect(() => {
                        pair.status = statusCheck.checked;
                    });
        
                    const originalNameLabel = Ui.Label.create(scrollWidget);
                    originalNameLabel.text = pair.original;
                    originalNameLabel.toolTip = pair.original;
                    originalNameLabel.foregroundRole =
                        Math.floor(row / 5) % 2 === 0
                            ? Ui.ColorRole.NoRole
                            : Ui.ColorRole.BrightText;
        
                    const newNameLabel = Ui.Label.create(scrollWidget);

                    newNameLabel.text = pair.new.replace(regex, replace.text);
                    newNameLabel.toolTip = newNameLabel.text ;
                    newNameLabel.foregroundRole =
                        Math.floor(row / 5) % 2 === 0
                            ? Ui.ColorRole.NoRole
                            : Ui.ColorRole.BrightText;
        
                    grid.addWidgetAt(statusCheck, row, 0, Ui.Alignment.AlignCenter);
                    grid.addWidgetAt(originalNameLabel, row, 1, Ui.Alignment.AlignLeft);
                    grid.addWidgetAt(newNameLabel, row, 2, Ui.Alignment.AlignLeft);

                    pairNewReplaced[index] = newNameLabel.text;
                }
            });
        }

        // function debounce(func, delay) {
        //     let timer = null;
        //     return function() {
        //         if (timer) {
        //             clearTimeout(timer);
        //             timer = null;
        //         }
        //         timer = setTimeout(func, delay);
        //     };
        // }
    }

    showDialogEnd(pluginSystem, assetsToRename, confirmCallback = function () {}) {
        if (assetsToRename.length <= 0) {
            console.warn("Onamaewa: Nothing to rename");
            return;
        }

        if (assetsToRename.length === 1) {
            console.info(
                `Onamaewa: ${assetsToRename[0].original} renamed to ${assetsToRename[0].new}`
            );
            confirmCallback();
            return;
        }

        const gui = pluginSystem.findInterface(Ui.IGui);
        const dialog = gui.createDialog();

        const layout = Ui.BoxLayout.create();
        layout.setDirection(Ui.Direction.TopToBottom);
        layout.setContentsMargins(20, 20, 20, 20);

        // User warning
        const text = Ui.Label.create(dialog);
        text.text =
            "You can't undo this operation -even if you save your project.\nDo you like a double check?";
        text.foregroundRole = Ui.ColorRole.BrightText;

        //
        const header = Ui.GridLayout.create();
        header.setContentsMargins(30, 30, 30, 0);

        const headerStatus = Ui.Label.create(dialog);
        headerStatus.text = "Status";
        headerStatus.foregroundRole = Ui.ColorRole.BrightText;
        header.addWidgetAt(headerStatus, 0, 0, Ui.Alignment.AlignCenter);

        const headerOriginal = Ui.Label.create(dialog);
        headerOriginal.text = "Original";
        headerOriginal.foregroundRole = Ui.ColorRole.BrightText;
        header.addWidgetAt(headerOriginal, 0, 1, Ui.Alignment.AlignLeft);

        const headerNew = Ui.Label.create(dialog);
        headerNew.text = "Rename";
        headerNew.foregroundRole = Ui.ColorRole.BrightText;
        header.addWidgetAt(headerNew, 0, 2, Ui.Alignment.AlignLeft);

        //
        const grid = Ui.GridLayout.create();
        grid.setContentsMargins(30, 5, 30, 30);

        const scrollWidget = Ui.Widget.create(dialog);
        scrollWidget.layout = grid;

        const scrollArea = Ui.VerticalScrollArea.create(dialog);
        scrollArea.setWidget(scrollWidget);
        scrollArea.setMinimumWidth(400);

        assetsToRename.forEach((pair, index) => {
            const row = index;

            const statusCheck = Ui.CheckBox.create(scrollWidget);
            statusCheck.checked = pair.status;
            statusCheck.onToggle.connect(() => {
                pair.status = statusCheck.checked;
            });

            const originalNameLabel = Ui.Label.create(scrollWidget);
            originalNameLabel.text = pair.original;
            originalNameLabel.toolTip = pair.original;
            originalNameLabel.foregroundRole =
                Math.floor(row / 5) % 2 === 0
                    ? Ui.ColorRole.NoRole
                    : Ui.ColorRole.BrightText;

            const newNameLabel = Ui.Label.create(scrollWidget);
            newNameLabel.text = pair.new;
            newNameLabel.toolTip = pair.new;
            newNameLabel.foregroundRole =
                Math.floor(row / 5) % 2 === 0
                    ? Ui.ColorRole.NoRole
                    : Ui.ColorRole.BrightText;

            grid.addWidgetAt(statusCheck, row, 0, Ui.Alignment.AlignCenter);
            grid.addWidgetAt(originalNameLabel, row, 1, Ui.Alignment.AlignLeft);
            grid.addWidgetAt(newNameLabel, row, 2, Ui.Alignment.AlignLeft);
        });

        //
        const buttonConfirm = Ui.PushButton.create(dialog);
        buttonConfirm.primary = true;
        buttonConfirm.resize(100, 10);
        buttonConfirm.text = "Rename";
        buttonConfirm.enabled = true;
        buttonConfirm.onClick.connect(() => {
            try{
                confirmCallback();
                console.info(
                    `Onamaewa: ${assetsToRename.length} assets renamed`
                );
            } catch(e) {
                console.error(e);
            }

            dialog.close();
        });

        //
        const buttonCancel = Ui.PushButton.create(dialog);
        buttonCancel.resize(100, 10);
        buttonCancel.text = "Cancel";
        buttonCancel.enabled = true;
        buttonCancel.onClick.connect(() => {
            dialog.close();
        });

        // Initiate dialog
        layout.addWidget(text);
        layout.addLayout(header);
        layout.addWidget(scrollArea);
        layout.addWidget(buttonConfirm);
        layout.addWidget(buttonCancel);

        dialog.windowTitle = "Onamaewa | Batch Rename";
        dialog.layout = layout;

        dialog.blockSignals(true);
        dialog.raise();
        dialog.activateWindow();
        dialog.show();
    }

    start() {
        const actionsRegistry = this.pluginSystem.findInterface(
            Editor.IContextActionRegistry
        );

        const ops = [
            {id: "Action.ByType", caption: "By Type Convention"},
            {id: "Action.FindReplace", caption: "Find and Replace"},
            {id: "Action.SequenceEnd", caption: "Add Index Suffix"},
            {id: "Action.SequenceStart", caption: "Add Index Prefix"},
            {id: "Action.ToPascal", caption: "PascalCase"},
            {id: "Action.ToCamel", caption: "camelCase"},
            {id: "Action.ToSnake", caption: "snake_case"},
            {id: "Action.ToKebab", caption: "kebab-case"},
        ]

        this.guard = [];

        for (const i of ops) {
            this.guard.push(
                actionsRegistry.registerAction((context) =>
                    this.createAction(
                        context,
                        i.id,
                        i.caption
                    )
                )
            );
        }
    }

    stop() {
        this.guard = [];
    }
}
