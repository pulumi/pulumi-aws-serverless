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
import * as eventRule from "@pulumi/aws-serverless/cloudwatch/eventRule";
import * as sns from "@pulumi/aws-serverless/sns";

const topic = new aws.sns.Topic("topic", { });

sns.topic.onEvent("process-topic", topic, async (event) => {
    const records = event.Records || [];
    for (const record of records) {
        const message = record.Sns.Message;

        console.log(`Processing: ${message}`);
    }
});

eventRule.onSchedule("hourly", "rate(60 minutes)", async (event) => {
    const awssdk = await import("aws-sdk");
    const sns = new awssdk.SNS();

    const result = await sns.publish({
        Message: JSON.stringify({ event: event }),
        TopicArn: topic.id.get(),
    }).promise();
});
