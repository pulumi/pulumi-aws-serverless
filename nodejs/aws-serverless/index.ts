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

import * as pulumi from "@pulumi/pulumi";

import * as apigateway from "./api";
import * as cloudwatch from "./cloudwatch";
import * as dynamodb from "./dynamodb";
import * as s3 from "./s3";
import * as sns from "./sns";
import * as sqs from "./sqs";

export { apigateway, cloudwatch, dynamodb, s3, sns, sqs };

// declare module "@pulumi/aws/s3/bucket" {
//     export interface Bucket {
//         onObjectCreated(name: string, handler: s3.bucket.BucketEventHandler,
//                         args?: s3.bucket.ObjectCreatedSubscriptionArgs, opts?: pulumi.ResourceOptions): s3.bucket.BucketEventSubscription;
//         onObjectRemoved(name: string, handler: s3.bucket.BucketEventHandler,
//                         args?: s3.bucket.ObjectRemovedSubscriptionArgs, opts?: pulumi.ResourceOptions): s3.bucket.BucketEventSubscription;
//         onEvent(name: string, handler: s3.bucket.BucketEventHandler,
//                 args: s3.bucket.BucketEventSubscriptionArgs, opts?: pulumi.ResourceOptions): s3.bucket.BucketEventSubscription;
//     }
// }
