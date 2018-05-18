// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as serverless from "@pulumi/aws-serverless";
import * as pulumi from "@pulumi/pulumi";
import { Output } from "@pulumi/pulumi";

const topic = new aws.sns.Topic("topic", { });

serverless.topic.subscribe("process-topic", topic, async (event) => {
    const awssdk = await import("aws-sdk");

    const records = event.Records || [];
    for (const record of records) {
        const message = record.Sns.Message;

        console.log(`Processing: ${message}`);
    }
});

serverless.cloudwatch.onEvent("hourly", "rate(60 minutes)", async (event) => {
    const awssdk = await import("aws-sdk");
    const sns = new awssdk.SNS();

    const result = await sns.publish({
        Message: JSON.stringify({ event: event }),
        TopicArn: topic.id.get(),
    }).promise();
});
