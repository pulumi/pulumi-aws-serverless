// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { lambda, s3, serverless } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./function";
import * as utils from "./utils";

/**
 * Base type for all subscription types.
 */
export class Subscription extends pulumi.ComponentResource {
    public permission: lambda.Permission;
    public func: lambda.Function;

    public constructor(
        type: string, name: string, func: lambda.Function, props: Record<string, any>, opts?: pulumi.ResourceOptions) {

        super(type, name, props, opts);

        this.func = func;
    }
}
