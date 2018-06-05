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
import * as pulumi from "@pulumi/pulumi";
import { ResourceOptions } from "@pulumi/pulumi";

/**
 * A synchronous or asynchronous function that can be converted into an AWS lambda.  Async callbacks
 * are only supported with an AWS lambda runtime of 8.10 or higher.  On those runtimes a Promise can
 * be returned, 'callback' parameter can be ignored, and AWS will appropriately handle things. For
 * AWS lambda pre-8.10, a synchronous function must be provided.  The synchronous function should
 * return nothing, and should instead invoke 'callback' when complete.
 */
export type Callback<E, R> = (event: E, context: aws.serverless.Context, callback: (error: any, result: R) => void) => Promise<R> | void;

/**
 * Handler represents the appropriate type for functions that can take either an AWS lambda function
 * instance, or a JS function object that will then be used to create the AWS lambda function.
 */
export type Handler<E, R> = Callback<E, R> | aws.lambda.Function;

const defaultComputePolicies = [
    aws.iam.AWSLambdaFullAccess,                 // Provides wide access to "serverless" services (Dynamo, S3, etc.)
];

export function createLambdaFunction<E, R>(
    name: string, handler: Handler<E, R>, opts?: ResourceOptions): aws.lambda.Function {

    if (typeof handler === "function") {
        const funcOpts: aws.serverless.FunctionOptions = {
            policies: defaultComputePolicies,
            includePaths: [],
        };
        const serverlessFunction = new aws.serverless.Function(
            name, funcOpts, handler, opts);

        return serverlessFunction.lambda;
    } else {
        return handler;
    }
}
