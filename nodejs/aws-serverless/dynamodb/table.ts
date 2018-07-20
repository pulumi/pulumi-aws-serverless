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
import { dynamodb, lambda } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { RunError } from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./../function";
import { EventSubscription } from "./../subscription";

/**
 * Arguments to control the event rule subscription.  Currently empty, but still defined in case of
 * future need.
 */
export interface TableEventSubscriptionArgs {
    /**
     * The largest number of records that Lambda will retrieve from your event source at the time of invocation. Defaults to `100` for DynamoDB.
     */
    readonly batchSize?: number;

    /**
     * The position in the stream where AWS Lambda should start reading. Must be one of either `TRIM_HORIZON` or `LATEST`.
     */
    readonly startingPosition: "TRIM_HORIZON" | "LATEST";
}

export interface TableEvent {
    Records: TableEventRecord[];
}

export interface TableEventRecord {
    awsRegion: string;
    dynamodb: {
       ApproximateCreationDateTime: number;
       Keys: Record<string, any>;
       NewImage?: Record<string, any>;
       OldImage?: Record<string, any>;
       SequenceNumber: string;
       SizeBytes: number;
       StreamViewType: string;
    };
    eventID: string;
    eventName: "INSERT" | "MODIFY" | "REMOVE";
    eventSource: string;
    eventVersion: string;
    userIdentity: {
       PrincipalId: string;
       Type: string;
    };
 }

export type TableEventHandler = Handler<TableEvent, void>;

export function onEvent(name: string, table: dynamodb.Table, handler: TableEventHandler, args?: TableEventSubscriptionArgs, opts?: pulumi.ResourceOptions): TableEventSubscription {
    throw new RunError("NYI");
}

export class TableEventSubscription extends EventSubscription {
    public readonly table: pulumi.Output<dynamodb.Table>;

    constructor(
        name: string, table: dynamodb.Table, func: lambda.Function,
        args: TableEventSubscriptionArgs, opts?: pulumi.ResourceOptions) {

        super("aws-serverless:dynamodb:TableEventSubscription", name, func, { table: table }, opts);
        throw new RunError("NYI");
    }
}

// Monkey-patch LogGroup to expose the members directly on it.

// declare module "@pulumi/aws/dynamodb/table" {
//     export interface Table {
//         onEvent(name: string, handler: TableEventHandler,
//                 args?: TableEventSubscriptionArgs, opts?: pulumi.ResourceOptions): TableEventSubscription;
//     }
// }

// aws.dynamodb.Table.prototype.onEvent = function (this: dynamodb.Table, name, handler, args, opts) {
//     return onEvent(name, this, handler, args, opts);
// };
