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
import { kinesis, lambda } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Output, RunError } from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./../function";
import { EventSubscription } from "./../subscription";

/**
 * Arguments to control the event rule subscription.  Currently empty, but still defined in case of
 * future need.
 */
export interface StreamEventSubscriptionArgs {
    /**
     * The largest number of records that Lambda will retrieve from your event source at the time of invocation. Defaults to `100` for Kinesis.
     */
    readonly batchSize?: number;

    /**
     * The position in the stream where AWS Lambda should start reading. Must be one of either `TRIM_HORIZON` or `LATEST`.
     */
    readonly startingPosition: "TRIM_HORIZON" | "LATEST";
}

export interface StreamEvent {
    Records: StreamEventRecord[];
}

export interface StreamEventRecord {
    eventID: string;
    eventVersion: string;
    kinesis: {
      partitionKey: string;
      data: string;
      kinesisSchemaVersion: string;
      sequenceNumber: string;
    };
    invokeIdentityArn: string;
    eventName: "aws:kinesis:record";
    eventSourceARN: string;
    eventSource: "aws:kinesis";
    awsRegion: string;
}

export type StreamEventHandler = Handler<StreamEvent, void>;

export function onEvent(name: string, stream: kinesis.Stream, handler: StreamEventHandler, args?: StreamEventSubscriptionArgs, opts?: pulumi.ResourceOptions): StreamEventSubscription {
    throw new RunError("NYI");
}

export class StreamEventSubscription extends EventSubscription {
    public readonly stream: pulumi.Output<kinesis.Stream>;

    constructor(
        name: string, stream: kinesis.Stream, func: lambda.Function,
        args: StreamEventSubscriptionArgs, opts?: pulumi.ResourceOptions) {

        super("aws-serverless:kinesis:StreamEventSubscription", name, func, { stream: stream }, opts);
        throw new RunError("NYI");
    }
}

// Monkey-patch Stream to expose the members directly on it.

// declare module "@pulumi/aws/kinesis/Stream" {
//     export interface Stream {
//         onEvent(name: string, handler: StreamEventHandler,
//                 args?: StreamEventSubscriptionArgs, opts?: pulumi.ResourceOptions): StreamEventSubscription;
//     }
// }

// aws.kinesis.Stream.prototype.onEvent = function (this: dynamodb.Stream, name, handler, args, opts) {
//     return onEvent(name, this, handler, args, opts);
// };
