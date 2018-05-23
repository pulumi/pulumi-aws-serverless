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
