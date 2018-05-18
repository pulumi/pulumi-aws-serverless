// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { cloudwatch, lambda } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./function";
import { EventSubscription } from "./subscription";

export interface CloudwatchEventArgs {
}

export type CloudwatchEventHandler = Handler<{}, void>;

export function onEvent(name: string, schedule: string, handler: CloudwatchEventHandler, args?: CloudwatchEventArgs, opts?: pulumi.ResourceOptions): CloudwatchEventSubscription;
export function onEvent(name: string, rule: cloudwatch.EventRule, handler: CloudwatchEventHandler, args?: CloudwatchEventArgs, opts?: pulumi.ResourceOptions): CloudwatchEventSubscription;
export function onEvent(
    name: string, scheduleOrRule: string | cloudwatch.EventRule,
    handler: CloudwatchEventHandler, args?: CloudwatchEventArgs, opts?: pulumi.ResourceOptions): CloudwatchEventSubscription {

    args = args || {};
    const func = createLambdaFunction(name + "-cloudwatch-subscription", handler, opts);
    return new CloudwatchEventSubscription(name, scheduleOrRule, func, args, opts);
}

export class CloudwatchEventSubscription extends EventSubscription {
    public readonly eventRule: cloudwatch.EventRule;
    public readonly target: cloudwatch.EventTarget;

    public constructor(
        name: string, scheduleOrRule: string | cloudwatch.EventRule, func: lambda.Function,
        args: CloudwatchEventArgs, opts?: pulumi.ResourceOptions) {

        super("aws-serverless:cloudwatch:CloudwatchEventSubscription", name, func, { }, opts);

        if (typeof scheduleOrRule === "string") {
            this.eventRule = new cloudwatch.EventRule(name, {
                scheduleExpression: scheduleOrRule,
            }, { parent: this });
        } else {
            this.eventRule = scheduleOrRule;
        }

        this.target = new aws.cloudwatch.EventTarget(name, {
            rule: this.eventRule.name,
            arn: this.func.arn,
            targetId: name,
        }, { parent: this });

        this.permission = new aws.lambda.Permission(name, {
            action: "lambda:invokeFunction",
            function: this.func,
            principal: "events.amazonaws.com",
            sourceArn: this.eventRule.arn,
        }, { parent: this });
    }
}
