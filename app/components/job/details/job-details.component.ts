import { Component, OnDestroy, OnInit, ViewContainerRef } from "@angular/core";
import { MdDialog, MdDialogConfig } from "@angular/material";
import { ActivatedRoute, Router } from "@angular/router";
import { autobind } from "core-decorators";
import { Subscription } from "rxjs/Subscription";

import { SidebarManager } from "../../base/sidebar";
import { TaskCreateBasicDialogComponent } from "../../task/action";
import { Job } from "app/models";
import { JobDecorator } from "app/models/decorators";
import { JobParams, JobService } from "app/services";
import { RxEntityProxy } from "app/services/core";

import {
    DeleteJobDialogComponent,
    DisableJobDialogComponent,
    EnableJobDialogComponent,
    JobCreateBasicDialogComponent,
    TerminateJobDialogComponent,
} from "../action";

@Component({
    selector: "bex-job-details",
    templateUrl: "./job-details.html",
})

export class JobDetailsComponent implements OnInit, OnDestroy {
    public jobId: string;
    public job: Job;
    public decorator: JobDecorator;
    public data: RxEntityProxy<JobParams, Job>;

    private _paramsSubscriber: Subscription;

    constructor(
        private dialog: MdDialog,
        private activatedRoute: ActivatedRoute,
        private viewContainerRef: ViewContainerRef,
        private sidebarManager: SidebarManager,
        private jobService: JobService,
        private router: Router) {

        this.data = this.jobService.get(null, {});
        this.data.item.subscribe((job) => {
            this.job = job;
            if (job) {
                this.decorator = new JobDecorator(job);
            }
        });

        this.data.deleted.subscribe((key) => {
            if (this.jobId === key) {
                this.router.navigate(["/jobs"]);
            }
        });
    }

    public ngOnInit() {
        this._paramsSubscriber = this.activatedRoute.params.subscribe((params) => {
            this.jobId = params["id"];
            this.data.params = { id: this.jobId };
            this.data.fetch();
        });
    }

    public ngOnDestroy() {
        this._paramsSubscriber.unsubscribe();
    }

    @autobind()
    public refresh() {
        return this.data.refresh();
    }

    public addJob() {
        this.sidebarManager.open("add-basic-job", JobCreateBasicDialogComponent);
    }

    public addTask() {
        const createRef = this.sidebarManager.open("add-basic-task", TaskCreateBasicDialogComponent);
        createRef.component.jobId = this.job.id;
    }

    public terminateJob() {
        let config = new MdDialogConfig();
        config.viewContainerRef = this.viewContainerRef;

        const dialogRef = this.dialog.open(TerminateJobDialogComponent, config);
        dialogRef.componentInstance.jobId = this.job.id;
        dialogRef.afterClosed().subscribe((obj) => {
            this.refresh();
        });
    }

    public deleteJob() {
        let config = new MdDialogConfig();
        config.viewContainerRef = this.viewContainerRef;

        const dialogRef = this.dialog.open(DeleteJobDialogComponent, config);
        dialogRef.componentInstance.jobId = this.job.id;
        dialogRef.afterClosed().subscribe((jobId) => {
            // if (this.job.id === jobId) {
            //     this.router.navigate(["/jobs"]);
            // }
        });
    }

    public disableJob() {
        let config = new MdDialogConfig();
        config.viewContainerRef = this.viewContainerRef;

        const dialogRef = this.dialog.open(DisableJobDialogComponent, config);
        dialogRef.componentInstance.jobId = this.job.id;
        dialogRef.afterClosed().subscribe((obj) => {
            this.refresh();
        });
    }

    public enableJob() {
        let config = new MdDialogConfig();
        config.viewContainerRef = this.viewContainerRef;

        const dialogRef = this.dialog.open(EnableJobDialogComponent, config);
        dialogRef.componentInstance.jobId = this.job.id;
        dialogRef.afterClosed().subscribe((obj) => {
            this.refresh();
        });
    }
}