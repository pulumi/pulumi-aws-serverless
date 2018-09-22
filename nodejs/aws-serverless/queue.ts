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

import { sqs } from "@pulumi/aws";

/** @deprecated use [sqs.QueueEvent] instead */
export type QueueEvent = sqs.QueueEvent;
/** @deprecated use [sqs.QueueRecord] instead */
export type QueueRecord = sqs.QueueRecord;
/** @deprecated use [sqs.QueueEventHandler] instead */
export type QueueEventHandler = sqs.QueueEventHandler;
/** @deprecated use [sqs.QueueSubscriptionArgs] instead */
export type QueueSubscriptionArgs = sqs.QueueEventSubscriptionArgs;

/** @deprecated use [sqs.Queue.onEvent] instead */
export function subscribe(
    name: string, queue: sqs.Queue, handler: QueueEventHandler,
    args?: QueueSubscriptionArgs, opts?: pulumi.ResourceOptions): QueueEventSubscription {

    return queue.onEvent(name, handler, args, opts);
}

/** @deprecated use [sqs.QueueEventSubscription] instead */
export const QueueEventSubscription = sqs.QueueEventSubscription;
/** @deprecated use [sqs.QueueEventSubscription] instead */
export type QueueEventSubscription = sqs.QueueEventSubscription;
