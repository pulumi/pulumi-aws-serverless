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
import { iam, lambda, sqs } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./../function";
import { EventSubscription } from "./../subscription";

export interface QueueEvent {
    Records: QueueRecord[];
}

export interface QueueRecord {
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

export type QueueEventHandler = Handler<QueueEvent, void>;

/**
 * Arguments to control the sqs subscription.
 */
export type QueueEventSubscriptionArgs = {
    /**
     * The largest number of records that AWS Lambda will retrieve. The maximum batch size supported
     * by Amazon Simple Queue Service is up to 10 queue messages per batch. The default setting is
     * 10.
     *
     * See https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html for more details.
     */
    batchSize?: number;
 };

/**
 * Creates a new subscription to the given queue using the lambda provided, along with optional
 * options to control the behavior of the subscription.
 */
export function onEvent(
    name: string, queue: sqs.Queue, handler: QueueEventHandler,
    args?: QueueEventSubscriptionArgs, opts?: pulumi.ResourceOptions): QueueEventSubscription {

    args = args || {};
    const func = createLambdaFunction(name + "-queue-event", handler, opts, {
        policies: [aws.iam.AWSLambdaFullAccess, iam.AmazonSQSFullAccess],
    });
    return new QueueEventSubscription(name, queue, func, args, opts);
}

export class QueueEventSubscription extends EventSubscription {
    public readonly queue: pulumi.Output<sqs.Queue>;

    /**
     * The underlying sns object created for the subscription.
     */
    public readonly eventSourceMapping: lambda.EventSourceMapping;

    public constructor(
        name: string, queue: sqs.Queue, func: lambda.Function,
        args: QueueEventSubscriptionArgs, opts?: pulumi.ResourceOptions) {

        super("aws-serverless:queue:QueueEventSubscription", name, func, { queue: queue }, opts);

        args = args || {};
        this.permission = new aws.lambda.Permission(name, {
            action: "lambda:*",
            function: func,
            principal: "sqs.amazonaws.com",
            sourceArn: queue.arn,
        }, { parent: this });

        this.eventSourceMapping = new lambda.EventSourceMapping(name, {
            batchSize: args.batchSize,
            enabled: true,
            eventSourceArn: queue.arn,
            functionName: func.name,
        }, { parent: this });
    }
}
