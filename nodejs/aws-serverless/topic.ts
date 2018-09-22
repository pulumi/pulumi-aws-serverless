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

import { sns } from "@pulumi/aws";

/** @deprecated Use [sns.TopicEvent] instead */
export type TopicEvent = sns.TopicEvent;
/** @deprecated Use [sns.TopicRecord] instead */
export type TopicRecord = sns.TopicRecord;
/** @deprecated Use [sns.SNSItem] instead */
export type SNSItem = sns.SNSItem;
/** @deprecated Use [sns.SNSMessageAttribute] instead */
export type SNSMessageAttribute = sns.SNSMessageAttribute;
/** @deprecated Use [sns.TopicEventHandler] instead */
export type TopicEventHandler = sns.TopicEventHandler;
/** @deprecated Use [sns.TopicSubscriptionArgs] instead */
export type TopicSubscriptionArgs = sns.TopicSubscriptionArgs;

/** @deprecated Use [sns.Topic.onEvent] instead */
export function subscribe(
    name: string, topic: sns.Topic, handler: TopicEventHandler,
    args?: TopicSubscriptionArgs, opts?: pulumi.ResourceOptions): TopicEventSubscription {

    return topic.onEvent(name, handler, args, opts);
}

/** @deprecated Use [sns.TopicEventSubscription] instead */
export const TopicEventSubscription = sns.TopicEventSubscription;
/** @deprecated Use [sns.TopicEventSubscription] instead */
export type TopicEventSubscription = sns.TopicEventSubscription;
