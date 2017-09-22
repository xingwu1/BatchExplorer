import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from "@angular/core";
import { Subscription } from "rxjs";

import { LoadingStatus } from "app/components/base/loading";
import { CurrentNode, FileExplorerWorkspace, FileSource } from "app/components/file/browse/file-explorer";
import { FileNavigator, FileTreeNode } from "app/services/file";
import "./file-explorer.scss";

export interface FileNavigatorEntry {
    name: string;
    navigator: FileNavigator;
}

export enum FileExplorerSelectable {
    none = 1,
    file = 2,
    folder = 4,
    all = 6,
}

export interface FileDropEvent {
    path: string;
    files: File[];
}

export interface FileExplorerConfig {
    /**
     * If the file explorer should show the tree view on the left
     * @default true
     */
    showTreeView?: boolean;

    /**
     * If the explorer should just select the file(not open)
     * @default FileExplorerSelectable.none
     */
    selectable?: FileExplorerSelectable;

    /**
     * If the explorer allows dropping external files
     * @default false
     */
    canDropExternalFiles?: boolean;
}

const fileExplorerDefaultConfig: FileExplorerConfig = {
    showTreeView: true,
    selectable: FileExplorerSelectable.none,
    canDropExternalFiles: false,
};

/**
 * File explorer is a combination of the tree view and the file preview.
 */
@Component({
    selector: "bl-file-explorer",
    templateUrl: "file-explorer.html",
})
export class FileExplorerComponent implements OnChanges, OnDestroy {
    @Input() public set data(data: FileExplorerWorkspace | FileNavigator) {
        if (data instanceof FileExplorerWorkspace) {
            this.workspace = data;
        } else {
            this.workspace = new FileExplorerWorkspace(data);
        }
        this._updateWorkspaceEvents();
    }
    @Input() public autoExpand = false;
    @Input() public activeFile: string;
    @Input() public set config(config: FileExplorerConfig) {
        this._config = { ...fileExplorerDefaultConfig, ...config };
    }
    public get config() { return this._config; }
    @Output() public activeFileChange = new EventEmitter<string>();
    @Output() public dropFiles = new EventEmitter<FileDropEvent>();

    public LoadingStatus = LoadingStatus;
    public currentSource: FileSource;
    public currentNode: CurrentNode;
    public workspace: FileExplorerWorkspace;

    private _workspaceSubs: Subscription[] = [];
    private _config: FileExplorerConfig = fileExplorerDefaultConfig;

    public ngOnChanges(inputs) {
        // Todo Remove?
    }

    public ngOnDestroy() {
        this._clearWorkspaceSubs();
    }

    /**
     * Triggered when a file/folder is selected in the table view
     * It will either navigate to the given item or select it depending on the settings.
     * @param node Tree node that got selected
     */
    public nodeSelected(node: FileTreeNode) {
        // tslint:disable-next-line:no-bitwise
        if (node.isDirectory && (this.config.selectable & FileExplorerSelectable.folder)) {
            this.activeFileChange.emit(node.path);
            // tslint:disable-next-line:no-bitwise
        } else if (!node.isDirectory && (this.config.selectable & FileExplorerSelectable.file)) {
            this.activeFileChange.emit(node.path);
        } else {
            this.navigateTo(node.path, this.currentSource);
        }
    }

    public navigateTo(path: string, source: FileSource) {
        this.workspace.navigateTo(path, source);
    }

    public goBack() {
        this.workspace.goBack();
    }

    public handleDrop(event: FileDropEvent) {
        this.dropFiles.emit(event);
    }

    private _updateWorkspaceEvents() {
        this._clearWorkspaceSubs();
        this._workspaceSubs.push(this.workspace.currentNode.subscribe((node) => {
            this.currentNode = node;
        }));
        this._workspaceSubs.push(this.workspace.currentSource.subscribe((source) => {
            this.currentSource = source;
        }));
    }

    private _clearWorkspaceSubs() {
        this._workspaceSubs.forEach(x => x.unsubscribe());
        this._workspaceSubs = [];
    }
}