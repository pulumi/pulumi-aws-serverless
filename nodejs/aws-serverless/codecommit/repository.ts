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
import { codecommit, iam, lambda } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { RunError } from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./../function";
import { EventSubscription } from "./../subscription";

export interface RepositoryEvent {
    version: string;
    id: string;
    "detail-type": string;
    source: "aws.codecommit";
    account: string;
    time: string;
    region: string;
    resources: string[];
    detail: {
      event: "referenceUpdated" | "referenceCreated" | "referenceDeleted";
      repositoryName: string;
      repositoryId: string;
      referenceType: string;
      referenceName: string;
      referenceFullName: string;
      commitId?: string;
      oldCommitId?: string;
    };
}

export interface RepositoryRecord {
    messageId: string;
    receiptHandle: string;
    body: string;
    attributes: {
        ApproximateReceiveCount: string;
        SentTimestamp: string;
        SenderId: string;
        ApproximateFirstReceiveTimestamp: string;
    };
    messageAttributes: Record<string, any>;
    md5OfBody: string;
    eventSource: string;
    eventSourceARN: string;
    awsRegion: string;
}

export type RepositoryEventHandler = Handler<RepositoryEvent, void>;

/**
 * Arguments to control the repository subscription.
 */
export interface CommonRepositoryEventSubscriptionArgs {
    /**
     * Events will be fired for all repository branches and tags by default. For a more specific
     * configuration, choose up to 10 branches. If you subscribe to "onAnyEvent", you cannot choose
     * specific branches.
     */
    branches?: string[];
}

/**
 * Arguments to control the repository subscription.
 */
export interface RepositoryEventSubscriptionArgs extends CommonRepositoryEventSubscriptionArgs {
    events: string[];
}

export function onAnyEvent(
    name: string, queue: codecommit.Repository, handler: RepositoryEventHandler,
    args?: CommonRepositoryEventSubscriptionArgs, opts?: pulumi.ResourceOptions): RepositoryEventSubscription {

    args = args || <any>{ };
    return onEvent(name, queue, handler, { branches: args!.branches, events: ["all"] }, opts);
}

export function onBranchOrTagCreated(
    name: string, queue: codecommit.Repository, handler: RepositoryEventHandler,
    args?: RepositoryEventSubscriptionArgs, opts?: pulumi.ResourceOptions): RepositoryEventSubscription {

    args = args || <any>{ };
    return onEvent(name, queue, handler, { branches: args!.branches, events: ["createReference"] }, opts);
}

export function onBranchOrTagDeleted(
    name: string, queue: codecommit.Repository, handler: RepositoryEventHandler,
    args?: RepositoryEventSubscriptionArgs, opts?: pulumi.ResourceOptions): RepositoryEventSubscription {

    args = args || <any>{ };
    return onEvent(name, queue, handler, { branches: args!.branches, events: ["deleteReference"] }, opts);
}

export function onExistingBranchPushed(
    name: string, queue: codecommit.Repository, handler: RepositoryEventHandler,
    args?: RepositoryEventSubscriptionArgs, opts?: pulumi.ResourceOptions): RepositoryEventSubscription {

    args = args || <any>{ };
    return onEvent(name, queue, handler, { branches: args!.branches, events: ["updateReference"] }, opts);
}

export function onEvent(
    name: string, queue: codecommit.Repository, handler: RepositoryEventHandler,
    args: RepositoryEventSubscriptionArgs, opts?: pulumi.ResourceOptions): RepositoryEventSubscription {

    throw new RunError("NYI");
}

export class RepositoryEventSubscription extends EventSubscription {
    public readonly repository: pulumi.Output<codecommit.Repository>;

    public constructor(
        name: string, repository: codecommit.Repository, func: lambda.Function,
        args: RepositoryEventSubscriptionArgs, opts?: pulumi.ResourceOptions) {

        super("aws-serverless:codecommit:RepositoryEventSubscription", name, func, { repository: repository }, opts);

        throw new RunError("NYI");
    }
}
