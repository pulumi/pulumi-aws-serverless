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

import * as aws from "@pulumi/aws";
import { ResourceOptions } from "@pulumi/pulumi";

/** @deprecated Use [lambda.Callback] instead. */
export type Callback<E, R> = aws.lambda.Callback<E, R>;

/** @deprecated Use [lambda.EventHandler] instead. */
export type Handler<E, R> = aws.lambda.EventHandler<E, R>;

const defaultComputePolicies = [
    aws.iam.AWSLambdaFullAccess,                 // Provides wide access to "serverless" services (Dynamo, S3, etc.)
];

/** @deprecated Use [lambda.createCallbackFunction] instead. */
export function createLambdaFunction<E, R>(
    name: string, handler: Handler<E, R>, opts?: ResourceOptions,
    functionOptions?: aws.serverless.FunctionOptions): aws.lambda.Function {

    if (typeof handler === "function") {
        if (!functionOptions) {
            functionOptions  = {
                policies: defaultComputePolicies.slice(),
            };
        }

        const serverlessFunction = new aws.serverless.Function(
            name, functionOptions, handler, opts);

        return serverlessFunction.lambda;
    } else {
        return handler;
    }
}
