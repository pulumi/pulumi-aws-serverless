// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as serverless from "@pulumi/aws-serverless";
import * as pulumi from "@pulumi/pulumi";
import { Output } from "@pulumi/pulumi";
import * as nodeFetchModule from "node-fetch";

const topic = new aws.sns.Topic("sites-to-process-topic", { });

serverless.topic.subscribe("for-each-url", topic, async (event) => {
    const awssdk = await import("aws-sdk");

    const fetch = (await import("node-fetch")).default;

    const records = event.Records || [];
    for (const record of records) {
        const url = record.Sns.Message;

        console.log(`${url}: Processing`);

        // Fetch the contents at the URL
        console.log(`${url}: Getting`);
        let res: nodeFetchModule.Response;
        try {
            res = await fetch(url);
        } catch (err) {
            console.log(`${url}: Failed to GET`);
            return;
        }
    }
});
