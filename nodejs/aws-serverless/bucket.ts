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

import { s3 } from "@pulumi/aws";

/** @deprecated Use [s3.CommonBucketSubscriptionArgs] instead. */
export type SimpleBucketSubscriptionArgs = s3.CommonBucketSubscriptionArgs;
/** @deprecated Use [s3.BucketEventSubscriptionArgs] instead. */
export type BucketSubscriptionArgs = s3.BucketEventSubscriptionArgs;
/** @deprecated Use [s3.ObjectCreatedSubscriptionArgs] instead. */
export type BucketPutArgs = s3.ObjectCreatedSubscriptionArgs;
/** @deprecated Use [s3.ObjectRemovedSubscriptionArgs] instead. */
export type BucketDeleteArgs = s3.ObjectRemovedSubscriptionArgs;
/** @deprecated Use [s3.BucketEvent] instead. */
export type BucketEvent = s3.BucketEvent;
/** @deprecated Use [s3.BucketRecord] instead. */
export type BucketRecord = s3.BucketRecord;
/** @deprecated Use [s3.BucketEventHandler] instead. */
export type BucketEventHandler = s3.BucketEventHandler;

/** @deprecated Use [s3.Bucket.onObjectCreated] instead. */
export function onPut(
    name: string, bucket: s3.Bucket, handler: BucketEventHandler,
    args?: BucketPutArgs, opts?: pulumi.ResourceOptions): BucketEventSubscription {

    return bucket.onObjectCreated(name, handler, args, opts);
}

/** @deprecated Use [s3.Bucket.onObjectRemoved] instead. */
export function onDelete(
    name: string, bucket: s3.Bucket, handler: BucketEventHandler,
    args?: BucketDeleteArgs, opts?: pulumi.ResourceOptions): BucketEventSubscription {

    return bucket.onObjectRemoved(name, handler, args, opts);
}

/** @deprecated Use [s3.Bucket.onEvent] instead. */
export function onEvent(
    name: string, bucket: s3.Bucket, handler: BucketEventHandler,
    args: BucketSubscriptionArgs, opts?: pulumi.ResourceOptions): BucketEventSubscription {

    return bucket.onEvent(name, handler, args, opts);
}

/** @deprecated Use [s3.BucketEventSubscription] instead. */
export const BucketEventSubscription = s3.BucketEventSubscription;
/** @deprecated Use [s3.BucketEventSubscription] instead. */
export type BucketEventSubscription = s3.BucketEventSubscription;
