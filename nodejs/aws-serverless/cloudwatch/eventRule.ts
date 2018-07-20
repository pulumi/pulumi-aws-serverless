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
    // The 12-digit number identifying an AWS account.
    account: string;

    // Identifies the AWS region where the event originated.
    region: string;

    // Identifies, in combination with the source field, the fields and values that appear in the
    // detail field.
    "detail-type": string;

    // Identifies the service that sourced the event. All events sourced from within AWS begin with
    // "aws." Customer-generated events can have any value here, as long as it doesn't begin with
    // "aws." We recommend the use of Java package-name style reverse domain-name strings.
    source: string;

    // The event timestamp, which can be specified by the service originating the event. If the
    // event spans a time interval, the service might choose to report the start time, so this value
    // can be noticeably before the time the event is actually received.
    time: string;

    // A unique value is generated for every event. This can be helpful in tracing events as they
    // move through rules to targets, and are processed.
    id: string;

    // This JSON array contains ARNs that identify resources that are involved in the event.
    // Inclusion of these ARNs is at the discretion of the service. For example, Amazon EC2 instance
    // state-changes include Amazon EC2 instance ARNs, Auto Scaling events include ARNs for both
    // instances and Auto Scaling groups, but API calls with AWS CloudTrail do not include resource
    // ARNs.
    resources: string[];

    // A JSON object, whose content is at the discretion of the service originating the event.
    detail: Record<string, any>;
}

export type EventRuleEventHandler = Handler<EventRuleEvent, void>;

export function onSchedule(name: string, schedule: string, handler: EventRuleEventHandler, args?: EventRuleEventSubscriptionArgs, opts?: pulumi.ResourceOptions): EventRuleEventSubscription {
    const eventRule = new cloudwatch.EventRule(name, { scheduleExpression: schedule }, opts);
    return onEvent(name, eventRule, handler, args, opts);
}

export function onEvent(name: string, eventRule: cloudwatch.EventRule, handler: EventRuleEventHandler, args?: EventRuleEventSubscriptionArgs, opts?: pulumi.ResourceOptions): EventRuleEventSubscription {
    args = args || {};
    const func = createLambdaFunction(name + "-cloudwatch-event", handler, opts);
    return new EventRuleEventSubscription(name, eventRule, func, args, opts);
}

export class EventRuleEventSubscription extends EventSubscription {
    public readonly eventRule: pulumi.Output<cloudwatch.EventRule>;
    public readonly target: cloudwatch.EventTarget;

    public constructor(
        name: string, eventRule: cloudwatch.EventRule, func: lambda.Function,
        args: EventRuleEventSubscriptionArgs, opts?: pulumi.ResourceOptions) {

        super("aws-serverless:cloudwatch:EventRuleEventSubscription", name, func, { eventRule: eventRule }, opts);

        this.target = new aws.cloudwatch.EventTarget(name, {
            rule: eventRule.name,
            arn: this.func.arn,
            targetId: name,
        }, { parent: this });

        this.permission = new aws.lambda.Permission(name, {
            action: "lambda:invokeFunction",
            function: this.func,
            principal: "events.amazonaws.com",
            sourceArn: eventRule.arn,
        }, { parent: this });
    }
}

// Monkey-patch EventRule to expose the members directly on it.

// declare module "@pulumi/aws/cloudwatch/eventRule" {
//     export interface EventRule {
//         onEvent(name: string, handler: EventRuleEventHandler,
//                 args?: EventRuleEventSubscriptionArgs, opts?: pulumi.ResourceOptions): EventRuleEventSubscription;
//     }
// }

// aws.cloudwatch.EventRule.prototype.onEvent = function (this: cloudwatch.EventRule, name, handler, args, opts) {
//     return onEvent(name, this, handler, args, opts);
// };
