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

import { lambda } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Base type for all subscription types.
 */
export class EventSubscription extends pulumi.ComponentResource {
    public permission: lambda.Permission;
    public func: lambda.Function;

    public constructor(
        type: string, name: string, func: lambda.Function, props: Record<string, any>, opts?: pulumi.ResourceOptions) {

        super(type, name, props, opts);

        this.func = func;
    }
}
