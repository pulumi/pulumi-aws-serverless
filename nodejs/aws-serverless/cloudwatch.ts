// Copyright 2016-2018, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as aws from "@pulumi/aws";
import { cloudwatch, lambda } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./function";
import { EventSubscription } from "./subscription";

export interface CloudwatchEventArgs {
}

export interface CloudwatchEvent {
    account: string;
    region: string;
    detail: any;
    "detail-type": string;
    source: string;
    time: string;
    id: string;
    resources: string[];
}

export type CloudwatchEventHandler = Handler<CloudwatchEvent, void>;

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
