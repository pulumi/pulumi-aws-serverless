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
import * as sns from "@pulumi/aws-serverless/sns";

const topic = new aws.sns.Topic("sites-to-process-topic", { });

sns.topic.onEvent("for-each-url", topic, async (event) => {
    const fetch = (await import("node-fetch")).default;

    const records = event.Records || [];
    for (const record of records) {
        const url = record.Sns.Message;

        console.log(`${url}: Processing`);

        // Fetch the contents at the URL
        console.log(`${url}: Getting`);
        try {
            const res = await fetch(url);
        } catch (err) {
            console.log(`${url}: Failed to GET`);
            return;
        }
    }
});
