import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { NodeAgentSku, Offer, PoolOsSkus, Resource, Sku } from "app/models";
import { PoolOsService } from "app/services";
import { Subject, Subscription } from "rxjs";
import { startWith, takeUntil } from "rxjs/operators";
import { CustomImageSelection } from "../custom-image-picker";

import "./os-image-picker.scss";

export interface OSImageSelection {
    virtualMachineConfiguration?: {
        imageReference?: {
            sku?: string;
            offer?: string;
            publisher?: string;
            virtualMachineImageId?: string;
        },
        nodeAgentSKUId?: string;
    };
    cloudServiceConfiguration?: {
        osFamily: string,
    };
}

const cloudServiceOsFamilies = [{
    id: "2",
    name: "2008 R2 SP1",
}, {
    id: "3",
    name: "2012",
}, {
    id: "4",
    name: "2012 R2",
}, {
    id: "5",
    name: "2016",
}, {
    id: "6",
    name: "2019",
}].reverse(); // Reverse so we have most recent first

/**
 * Component that is to be used in the PoolOSPicker to choose which image to use.
 * CloudService vs VirtualMachine
 */
@Component({
    selector: "bl-os-image-picker",
    templateUrl: "os-image-picker.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OSImagePickerComponent implements OnChanges, OnDestroy {
    @Input() public formGroup: FormGroup<OSImageSelection>;

    // Shared to the view
    public cloudServiceOsFamilies = cloudServiceOsFamilies;

    // VM
    public selectedOffer: string;
    public selectedSku: string;
    public selectedNodeAgentId: string;

    // Cloud service
    public selectedFamilyName: string;

    public get vmOffers() {
        return this._nodeAgentSkuMap.vmOffers;
    }

    public get dataScienceOffers() {
        return this._nodeAgentSkuMap.dataScienceOffers;
    }

    public get renderingOffers() {
        return this._nodeAgentSkuMap.renderingOffers;
    }

    public get dockerOffers() {
        return this._nodeAgentSkuMap.dockerOffers;
    }

    public customImage: CustomImageSelection;

    private _nodeAgentSkuMap: PoolOsSkus = new PoolOsSkus();
    private _sub: Subscription;
    private _destroy = new Subject();

    constructor(private changeDetector: ChangeDetectorRef, poolOsService: PoolOsService) {
        poolOsService.offers.pipe(takeUntil(this._destroy)).subscribe((offers) => {
            this._nodeAgentSkuMap = offers;
            this.changeDetector.markForCheck();
        });
    }

    public ngOnChanges(changes) {
        if (changes.formGroup) {
            this._clearSub();
            this._sub = this.formGroup.valueChanges.pipe(
                startWith(this.formGroup.value),
            ).subscribe((value) => {
                const vmConfig = value.virtualMachineConfiguration;

                this.selectedNodeAgentId = null;
                this.selectedOffer = null;
                this.selectedSku = null;
                this.selectedFamilyName = null;

                if (vmConfig) {
                    const ref = vmConfig.imageReference;
                    this.selectedOffer = ref && ref.offer;
                    this.selectedSku = ref && ref.sku;
                    this.selectedNodeAgentId = vmConfig && vmConfig.nodeAgentSKUId;
                } else if (value.cloudServiceConfiguration) {
                    const familyId = value.cloudServiceConfiguration.osFamily;
                    const item = cloudServiceOsFamilies.filter(x => x.id === familyId).first();
                    this.selectedFamilyName = item && item.name;
                }

                this._updateCustomImage();

                this.changeDetector.markForCheck();
            });
        }
    }

    public ngOnDestroy() {
        this._destroy.next();
        this._destroy.complete();
    }

    public pickContainerOffer(offer: Offer) {
        this.pickOffer(offer);
    }

    public pickContainerSku(offer: Offer, sku: Sku) {
        this.pickSku(offer, sku);
    }

    public pickOffer(offer: Offer) {
        this.pickSku(offer, offer.skus.last());
    }

    public pickSku(offer: Offer, sku: Sku) {
        // preventing user clicking pick same sku multiple times
        if (this.selectedOffer === offer.name &&
            this.selectedSku === sku.name &&
            this.selectedNodeAgentId === sku.nodeAgentId) {
            return;
        }
        this.formGroup.patchValue({
            virtualMachineConfiguration: {
                nodeAgentSKUId: sku.nodeAgentId,
                imageReference: {
                    publisher: offer.publisher,
                    offer: offer.name,
                    sku: sku.name,
                },
            },
            cloudServiceConfiguration: null,
        });

        this.changeDetector.markForCheck();
    }

    public pickCloudService(version = null) {
        const osFamily = version || cloudServiceOsFamilies.first().id;
        this.formGroup.patchValue({
            cloudServiceConfiguration: {
                osFamily,
            },
            virtualMachineConfiguration: null,
        });

        this.changeDetector.markForCheck();
    }

    public pickCustomImage(result: CustomImageSelection | null) {
        if (!result) { return; }

        this.formGroup.patchValue({
            cloudServiceConfiguration: null,
            virtualMachineConfiguration: {
                imageReference: {
                    virtualMachineImageId: result.imageId,
                },
                nodeAgentSKUId: result.nodeAgentSku,
            },
        });
    }

    public trackOffer(_, offer: Offer) {
        return offer.name;
    }

    public trackResource(_, image: Resource) {
        return image.id;
    }

    public trackNodeAgentSku(_, nodeAgent: NodeAgentSku) {
        return nodeAgent.id;
    }

    private _updateCustomImage() {
        const config = this.formGroup.value.virtualMachineConfiguration;
        const ref = config && config.imageReference;
        if (ref && ref.virtualMachineImageId) {
            this.customImage = {
                imageId: ref.virtualMachineImageId,
                nodeAgentSku: config.nodeAgentSKUId,
            };
        } else {
            this.customImage = null;
        }
    }
    private _clearSub() {
        if (this._sub) { this._sub.unsubscribe(); }
    }
}
