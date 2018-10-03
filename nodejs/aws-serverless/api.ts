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
import { x } from "@pulumi/aws/apigateway";
import * as pulumi from "@pulumi/pulumi";

import { createLambdaFunction, Handler } from "./function";
import { sha1hash } from "./utils";

/** @deprecated Use [aws.apigateway.x.Request] instead. */
export type Request = x.Request;
/** @deprecated Use [aws.apigateway.x.RequestContext] instead. */
export type RequestContext = x.RequestContext;
/** @deprecated Use [aws.apigateway.x.Request] instead. */
export type RequestIdentity = x.RequestIdentity;
/** @deprecated Use [aws.apigateway.x.Response] instead. */
export type Response = x.Response;
/** @deprecated Use [aws.apigateway.x.RouteEventHandler] instead. */
export type RouteHandler = x.RouteEventHandler;
/** @deprecated Use [aws.apigateway.x.Method] instead. */
export type Method = x.Method;
/** @deprecated Use [aws.apigateway.x.Route] instead. */
export type Route = x.Route;
/** @deprecated Use [aws.apigateway.x.APIArgs] instead. */
export type APIArgs = x.APIArgs;

/** @deprecated Use [aws.apigateway.x.API] instead. */
export const API = x.API;
/** @deprecated Use [aws.apigateway.x.API] instead. */
export type API = x.API;
