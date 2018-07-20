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
import { RunError } from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./../function";
import { EventSubscription } from "./../subscription";
import { LogGroup } from "@pulumi/aws/cloudwatch";

/**
 * Arguments to control the event rule subscription.  Currently empty, but still defined in case of
 * future need.
 */
export interface LogGroupEventSubscriptionArgs {
    /**
     * A valid CloudWatch Logs filter pattern for subscribing to a filtered stream of log events.
     */
    filterPattern?: string;
}

export interface LogGroupEvent {
    awslogs: {
        // The data attribute in the Lambda record is Base64 encoded and compressed with the gzip
        // format.
        data: string;
    };
}

export interface DecodedLogGroupEvent {
    // The AWS Account ID of the originating log data.
    owner: string;

    // The log group name of the originating log data.
    logGroup: string;

    // The log stream name of the originating log data.
    logStream: string;

    // The list of subscription filter names that matched with the originating log data.
    subscriptionFilters: string[];

    // Data messages will use the "DATA_MESSAGE" type. Sometimes CloudWatch Logs may emit Lambda
    // records with a "CONTROL_MESSAGE" type, mainly for checking if the destination is reachable.
    messageType: string;

    // The actual log data, represented as an array of log event records. The "id" property is a
    // unique identifier for every log event.
    logEvents: LogGroupEventRecord[];
}

export interface LogGroupEventRecord {
    id: string;
    timestamp: number;
    message: string;
}

export type LogGroupEventHandler = Handler<LogGroupEvent, void>;

export async function decodeLogGroupEvent(event: LogGroupEvent): Promise<DecodedLogGroupEvent> {
    const zlib = await import("zlib");
    const payload = new Buffer(event.awslogs.data, "base64");

    return new Promise<DecodedLogGroupEvent>((resolve, reject) => {
        zlib.gunzip(payload, function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(result.toString("ascii")));
            }
        });
    });
}

export function onEvent(name: string, logGroup: cloudwatch.LogGroup, handler: LogGroupEventHandler, args?: LogGroupEventSubscriptionArgs, opts?: pulumi.ResourceOptions): LogGroupEventSubscription {
    throw new RunError("NYI");
}

export class LogGroupEventSubscription extends EventSubscription {
    public readonly logGroup: pulumi.Output<cloudwatch.LogGroup>;

    constructor(
        name: string, logGroup: cloudwatch.LogGroup, func: lambda.Function,
        args: LogGroupEventSubscriptionArgs, opts?: pulumi.ResourceOptions) {

        super("aws-serverless:cloudwatch:LogGroupEventSubscription", name, func, { logGroup: logGroup }, opts);
        throw new RunError("NYI");
    }
}

// Monkey-patch LogGroup to expose the members directly on it.

// declare module "@pulumi/aws/cloudwatch/logGroup" {
//     export interface LogGroup {
//         onEvent(name: string, handler: LogGroupEventHandler,
//                 args?: LogGroupEventSubscriptionArgs, opts?: pulumi.ResourceOptions): LogGroupEventSubscription;
//     }
// }

// aws.cloudwatch.LogGroup.prototype.onEvent = function (this: cloudwatch.LogGroup, name, handler, args, opts) {
//     return onEvent(name, this, handler, args, opts);
// };
