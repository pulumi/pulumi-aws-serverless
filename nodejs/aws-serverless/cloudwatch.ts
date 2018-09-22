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

import * as pulumi from "@pulumi/pulumi";

import { cloudwatch } from "@pulumi/aws";

/** @deprecated Use [cloudwatch.EventRuleEventSubscriptionArgs] instead */
export type CloudwatchEventArgs = cloudwatch.EventRuleEventSubscriptionArgs;
/** @deprecated Use [cloudwatch.EventRuleEvent] instead */
export type CloudwatchEvent = cloudwatch.EventRuleEvent;
/** @deprecated Use [cloudwatch.EventRuleEventHandler] instead */
export type CloudwatchEventHandler = cloudwatch.EventRuleEventHandler;
/** @deprecated Use [cloudwatch.onSubscribe] or [cloudwatch.EventRule.onEvent] instead */
export function onEvent(name: string, schedule: string, handler: CloudwatchEventHandler, args?: CloudwatchEventArgs, opts?: pulumi.ResourceOptions): CloudwatchEventSubscription;
export function onEvent(name: string, rule: cloudwatch.EventRule, handler: CloudwatchEventHandler, args?: CloudwatchEventArgs, opts?: pulumi.ResourceOptions): CloudwatchEventSubscription;
export function onEvent(
    name: string, scheduleOrRule: string | cloudwatch.EventRule,
    handler: CloudwatchEventHandler, args?: CloudwatchEventArgs, opts?: pulumi.ResourceOptions): CloudwatchEventSubscription {

    if (typeof scheduleOrRule === "string") {
        return cloudwatch.onSchedule(name, scheduleOrRule, handler, args, opts);
    }

    return scheduleOrRule.onEvent(name, handler, args, opts);
}

/** @deprecated Use [cloudwatch.EventRuleEventSubscription] instead */
// tslint:disable-next-line:variable-name
export const CloudwatchEventSubscription = cloudwatch.EventRuleEventSubscription;
/** @deprecated Use [cloudwatch.EventRuleEventSubscription] instead */
export type CloudwatchEventSubscription = cloudwatch.EventRuleEventSubscription;
