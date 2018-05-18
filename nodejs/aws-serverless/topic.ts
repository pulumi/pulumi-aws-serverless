// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { lambda, sns } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./function";
import { Subscription } from "./subscription";

export interface TopicNotificationEvent {
    Records: TopicNotificationRecord[];
}

export interface TopicNotificationRecord {
    EventVersion: string;
    EventSubscriptionArn: string;
    EventSource: string;
    Sns: SNSItem;
}

export interface SNSItem {
    SignatureVersion: string;
    Timestamp: string;
    Signature: string;
    SigningCertUrl: string;
    MessageId: string;
    Message: string;
    MessageAttributes: { [key: string]: SNSMessageAttribute };
    Type: string;
    UnsubscribeUrl: string;
    TopicArn: string;
    Subject: string;
}

export interface SNSMessageAttribute {
    Type: string;
    Value: string;
}

export type TopicSubscriptionHandler = Handler<TopicNotificationEvent, void>;

/**
 * Arguments to control the topic subscription.  Currently empty, but still defined in case of
 * future need.
 */
export type TopicSubscriptionArgs = { };

/**
 * Creates a new subscription to the given topic using the lambda provided, along with optional
 * options to control the behavior of the subscription.
 */
export function subscribe(
    name: string, topic: sns.Topic, handler: TopicSubscriptionHandler,
    args: TopicSubscriptionArgs, opts?: pulumi.ResourceOptions): TopicSubscription {

    const func = createLambdaFunction(name + "-topic-subscription", handler, opts);
    return new TopicSubscription(name, topic, func, args, opts);
}

export class TopicSubscription extends Subscription {
    /**
     * The underlying sns object created for the subscription.
     */
    public readonly subscription: sns.TopicSubscription;

    public constructor(
        name: string, topic: sns.Topic, func: lambda.Function,
        args: TopicSubscriptionArgs, opts?: pulumi.ResourceOptions) {

        super("aws-serverless:topic:TopicSubscription", name, func, { topic: topic }, opts);

        this.permission = new aws.lambda.Permission(name, {
            action: "lambda:invokeFunction",
            function: func,
            principal: "sns.amazonaws.com",
            sourceArn: topic.id,
        }, { parent: this });

        this.subscription = new aws.sns.TopicSubscription(name, {
            topic: topic,
            protocol: "lambda",
            endpoint: func.arn,
        }, { parent: this });
    }
}
