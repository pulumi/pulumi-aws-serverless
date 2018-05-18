// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import { lambda } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Base type for all subscription types.
 */
export class EventSubscription extends pulumi.ComponentResource {
    public permission: lambda.Permission;
    public func: lambda.Function;

    public constructor(
        type: string, name: string, func: lambda.Function, props: Record<string, any>, opts?: pulumi.ResourceOptions) {

        super(type, name, props, opts);

        this.func = func;
    }
}
