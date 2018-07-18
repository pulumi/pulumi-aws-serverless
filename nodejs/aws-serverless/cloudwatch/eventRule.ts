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
import { createLambdaFunction, Handler } from "./../function";
import { EventSubscription } from "./../subscription";

/**
 * Arguments to control the event rule subscription.  Currently empty, but still defined in case of
 * future need.
 */
export interface EventRuleEventSubscriptionArgs {
}

export interface EventRuleEvent {
    account: string;
    region: string;
    detail: any;
    "detail-type": string;
    source: string;
    time: string;
    id: string;
    resources: string[];
}

export type EventRuleEventHandler = Handler<EventRuleEvent, void>;

export function onSchedule(name: string, schedule: string, handler: EventRuleEventHandler, args?: EventRuleEventSubscriptionArgs, opts?: pulumi.ResourceOptions): EventRuleEventSubscription {
    return onEventOrSchedule(name, schedule, handler, args, opts);
}

export function onEvent(name: string, rule: cloudwatch.EventRule, handler: EventRuleEventHandler, args?: EventRuleEventSubscriptionArgs, opts?: pulumi.ResourceOptions): EventRuleEventSubscription {
    return onEventOrSchedule(name, rule, handler, args, opts);
}

function onEventOrSchedule(
    name: string, scheduleOrRule: string | cloudwatch.EventRule, handler: EventRuleEventHandler,
    args: EventRuleEventSubscriptionArgs | undefined, opts: pulumi.ResourceOptions | undefined): EventRuleEventSubscription {

    args = args || {};
    const func = createLambdaFunction(name + "-cloudwatch-event", handler, opts);
    return new EventRuleEventSubscription(name, scheduleOrRule, func, args, opts);
}

export class EventRuleEventSubscription extends EventSubscription {
    public readonly eventRule: cloudwatch.EventRule;
    public readonly target: cloudwatch.EventTarget;

    public constructor(
        name: string, scheduleOrRule: string | cloudwatch.EventRule, func: lambda.Function,
        args: EventRuleEventSubscriptionArgs, opts?: pulumi.ResourceOptions) {

        super("aws-serverless:cloudwatch:EventRuleEventSubscription", name, func, { }, opts);

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

// Monkey-patch EventRule to expose the members directly on it.

declare module "@pulumi/aws/cloudwatch/eventRule" {
    export interface EventRule {
        onEvent(name: string, handler: EventRuleEventHandler,
                args?: EventRuleEventSubscriptionArgs, opts?: pulumi.ResourceOptions): EventRuleEventSubscription;
    }
}

aws.cloudwatch.EventRule.prototype.onEvent = function (this: cloudwatch.EventRule, name, handler, args, opts) {
    return onEvent(name, this, handler, args, opts);
};
