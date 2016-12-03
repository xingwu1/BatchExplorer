import {
    Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { autobind } from "core-decorators";
import { Observable, Subscription } from "rxjs";

import { DeletePoolTask } from "../action/delete";
import { BackgroundTaskManager } from "app/components/base/background-task";
import { LoadingStatus } from "app/components/base/loading";
import { QuickListComponent, QuickListItemStatus } from "app/components/base/quick-list";
import { ListOrTableBase } from "app/components/base/selectable-list";
import { TableComponent } from "app/components/base/table";
import { Pool } from "app/models";
import { PoolService } from "app/services";
import { RxListProxy } from "app/services/core";
import { Filter } from "app/utils/filter-builder";

@Component({
    selector: "bex-pool-list",
    templateUrl: "./pool-list.html",
})
export class PoolListComponent extends ListOrTableBase implements OnInit, OnDestroy {
    public status: Observable<LoadingStatus>;
    public data: RxListProxy<{}, Pool>;

    // Inheritance bugs https://github.com/angular/angular/issues/5415
    @Output()
    public itemSelected: EventEmitter<any>;

    @ViewChild(TableComponent)
    public table: TableComponent;

    @ViewChild(QuickListComponent)
    public list: QuickListComponent;

    @Input()
    public quickList: boolean;

    @Input()
    public set filter(filter: Filter) {
        this._filter = filter;

        if (filter.isEmpty()) {
            this.data.setOptions({});
        } else {
            this.data.setOptions({ filter: filter.toOData() });
        }

        this.data.fetchNext();
    }
    public get filter(): Filter { return this._filter; };

    private _filter: Filter;
    private _onPoolAddedSub: Subscription;

    constructor(
        private poolService: PoolService,
        activatedRoute: ActivatedRoute,
        router: Router,
        private taskManager: BackgroundTaskManager) {

        super();
        this.data = this.poolService.list();
        this.status = this.data.status;
        this._onPoolAddedSub = poolService.onPoolAdded.subscribe((poolId) => {
            this.data.loadNewItem(poolService.get(poolId));
        });
    }

    public ngOnInit() {
        this.data.fetchNext();
    }

    public ngOnDestroy() {
        this._onPoolAddedSub.unsubscribe();
    }

    @autobind()
    public refresh(): Observable<any> {
        return this.data.refresh();
    }

    public poolStatus(pool: Pool): QuickListItemStatus {
        return pool.resizeError ? QuickListItemStatus.warning : null;
    }

    public poolStatusText(pool: Pool): string {
        if (pool.resizeError) {
            return "Pool has a resize error";
        }

        return "";
    }

    public onScrollToBottom(x) {
        this.data.fetchNext();
    }

    public deleteSelected() {
        this.taskManager.startTask("", (backgroundTask) => {
            const task = new DeletePoolTask(this.poolService, this.selectedItems);
            task.start(backgroundTask);
            return task.waitingDone;
        });
    }
}