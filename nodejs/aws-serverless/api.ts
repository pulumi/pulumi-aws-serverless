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

import { createLambdaFunction, Handler } from "./function";
import { outputFromObject, sha1hash } from "./utils";

export interface Request {
    resource: string;
    path: string;
    httpMethod: string;
    headers: { [header: string]: string; };
    queryStringParameters: { [param: string]: string; };
    pathParameters: { [param: string]: string; };
    stageVariables: { [name: string]: string; };
    requestContext: RequestContext;
    body: string;
    isBase64Encoded: boolean;
}

export interface RequestContext {
    accountId: string;
    resourceId: string;
    stage: string;
    requestId: string;
    identity: RequestIdentity;
    resourcePath: string;
    httpMethod: string;
    apiId: string;
}

export interface RequestIdentity {
    cognitoIdentityPoolId?: string;
    accountId?: string;
    cognitoIdentityId?: string;
    caller?: string;
    apiKey?: string;
    sourceIp?: string;
    cognitoAuthenticationType?: string;
    cognitoAuthenticationProvider?: string;
    userArn?: string;
    userAgent?: string;
    user?: string;
}

export interface Response {
    isBase64Encoded?: boolean;
    statusCode: number;
    headers?: { [header: string]: string; };
    body: string;
}

export type RouteHandler = Handler<Request, Response>;
export type Method = "ANY" | "GET" | "PUT" | "POST" | "DELETE" | "PATCH";
export type Route = {
    path: string;
    method: Method;
    handler: RouteHandler;
};

export interface APIArgs {
    /**
     * Routes to use to initialize the APIGateway.
     *
     * Either [routes] or [swaggerSpec] must be specified.
     */
    routes?: Route[];
    /**
     * A SwaggerSpec to use to initialize the APIGateway.  Note that you must manually provide permission for any route
     * targets to be invoked by API Gateway when using [swaggerSpec].
     *
     * Either [routes] or [swaggerSpec] must be specified.
     */
    swaggerSpec?: pulumi.Input<string>;

    stageName?: pulumi.Input<string>;
}

export class API extends pulumi.ComponentResource {
    public restAPI: aws.apigateway.RestApi;
    public deployment: aws.apigateway.Deployment;
    public stage: aws.apigateway.Stage;

    public url: pulumi.Output<string>;

    constructor(name: string, args: APIArgs, opts?: pulumi.ResourceOptions) {
        super("aws-serverless:apigateway:API", name, {}, opts);

        let swaggerString: pulumi.Output<string>;
        let swaggerSpec: SwaggerSpec | undefined;
        let lambdas: { [key: string]: aws.lambda.Function };
        if (args.swaggerSpec) {
            swaggerString = pulumi.output(args.swaggerSpec);
            lambdas = {};
        } else if (args.routes) {
            const [spec, routeLambdas] = swaggerSpecFromRoutes(name, args.routes);
            swaggerSpec = spec;
            swaggerString = createSwaggerString(spec);
            lambdas = routeLambdas;
        } else {
            throw new Error("RestAPI must specify either `routes` or `swaggerSpec` options to configure the RestAPI.");
        }

        const stageName = args.stageName || "stage";

        // Create the API Gateway Rest API, using a swagger spec.
        this.restAPI = new aws.apigateway.RestApi(name, {
            body: swaggerString,
        }, { parent: this });

        // Create a deployment of the Rest API.
        this.deployment = new aws.apigateway.Deployment(name, {
            restApi: this.restAPI,
            // Note: Set to empty to avoid creating an implicit stage, we'll create it explicitly below instead.
            stageName: "",
            // Note: We set `variables` here because it forces recreation of the Deployment object
            // whenever the body hash changes.  Because we use a blank stage name above, there will
            // not actually be any stage created in AWS, and thus these variables will not actually
            // end up anywhere.  But this will still cause the right replacement of the Deployment
            // when needed.  The Stage allocated below will be the stable stage that always points
            // to the latest deployment of the API.
            variables: {
                version: swaggerString.apply(sha1hash),
            },
        }, { parent: this });

        // Create a stage, which is an addressable instance of the Rest API. Set it to point at the latest deployment.
        this.stage = new aws.apigateway.Stage(name, {
            restApi: this.restAPI,
            deployment: this.deployment,
            stageName: stageName,
        }, { parent: this });

        // Expose the URL that the API is served at.
        this.url = this.deployment.invokeUrl.apply(url => url + stageName + "/");

        // Ensure that the permissions allow the API Gateway to invoke the lambdas.
        if (swaggerSpec) {
            for (const path of Object.keys(swaggerSpec.paths)) {
                for (let method of Object.keys(swaggerSpec.paths[path])) {
                    const methodAndPath = method + ":" + path;
                    const lambda = lambdas[methodAndPath];
                    if (lambda) {
                        if (method === "x-amazon-apigateway-any-method") {
                            method = "*";
                        }
                        else {
                            method = method.toUpperCase();
                        }
                        const permissionName = name + "-" + sha1hash(methodAndPath);
                        const invokePermission = new aws.lambda.Permission(permissionName, {
                            action: "lambda:invokeFunction",
                            function: lambda,
                            principal: "apigateway.amazonaws.com",
                            // We give permission for this function to be invoked by any stage at the given method and
                            // path on the API. We allow any stage instead of encoding the one known stage that will be
                            // deployed by Pulumi because the API Gateway console "Test" feature invokes the route
                            // handler with the fake stage `test-invoke-stage`.
                            sourceArn: this.deployment.executionArn.apply(arn => arn + "*/" + method + path),
                        }, { parent: this });
                    }
                }
            }
        }

        this.registerOutputs({
            url: this.url,
        });
    }
}

interface SwaggerSpec {
    swagger: string;
    info: SwaggerInfo;
    paths: { [path: string]: { [method: string]: SwaggerOperationAsync; }; };
    "x-amazon-apigateway-binary-media-types"?: string[];
}

interface SwaggerInfo {
    title: string;
    version: string;
}

interface SwaggerOperationAsync {
    parameters?: any[];
    responses?: { [code: string]: SwaggerResponse };
    "x-amazon-apigateway-integration": ApigatewayIntegrationAsync;
}

interface SwaggerOperation {
    parameters?: any[];
    responses?: { [code: string]: SwaggerResponse };
    "x-amazon-apigateway-integration": ApigatewayIntegration;
}
interface SwaggerResponse {
    description: string;
    schema?: SwaggerSchema;
    headers?: { [header: string]: SwaggerHeader };
}

interface SwaggerSchema {
    type: string;
}

interface SwaggerHeader {
    type: "string" | "number" | "integer" | "boolean" | "array";
    items?: SwaggerItems;
}

interface SwaggerItems {
    type: "string" | "number" | "integer" | "boolean" | "array";
    items?: SwaggerItems;
}

interface SwaggerAPIGatewayIntegrationResponse {
    statusCode: string;
    responseParameters?: { [key: string]: string };
}

interface ApigatewayIntegrationBase {
    requestParameters?: any;
    passthroughBehavior?: string;
    httpMethod: string;
    type: string;
    responses?: { [pattern: string]: SwaggerAPIGatewayIntegrationResponse };
    connectionType?: string;
}

interface ApigatewayIntegration extends ApigatewayIntegrationBase {
    uri: string;
    credentials?: string;
    connectionId?: string;
}

interface ApigatewayIntegrationAsync extends ApigatewayIntegrationBase {
    uri: pulumi.Output<string>;
    credentials?: pulumi.Output<string>;
    connectionId?: pulumi.Output<string>;
}

function swaggerSpecFromRoutes(name: string, routes: Route[]): [SwaggerSpec, {[key: string]: aws.lambda.Function}] {
    const swagger: SwaggerSpec = createBaseSpec(name);
    const lambdas: {[key: string]: aws.lambda.Function} = registerRoutes(this, name, routes, swagger);

    return [swagger, lambdas];
}

function createBaseSpec(apiName: string): SwaggerSpec {
    return {
        swagger: "2.0",
        info: { title: apiName, version: "1.0" },
        paths: {},
        "x-amazon-apigateway-binary-media-types": [ "*/*" ],
    };
}

function registerRoutes(parent: pulumi.Resource, apiName: string, routes: Route[], swagger: SwaggerSpec): {[key: string]: aws.lambda.Function} {
    const lambdas: {[key: string]: aws.lambda.Function} = {};
    for (const route of routes) {
        const method: string = swaggerMethod(route.method);
        const lambda = createLambdaFunction(apiName + sha1hash(method + ":" + route.path), route.handler);
        lambdas[method + ":" + route.path] = lambda;
        if (!swagger.paths[route.path]) {
            swagger.paths[route.path] = {};
        }
        swagger.paths[route.path][method] = createPathSpecLambda(lambda);
    }
    return lambdas;
}

function swaggerMethod(method: string): string {
    switch (method.toLowerCase()) {
        case "get":
        case "put":
        case "post":
        case "delete":
        case "options":
        case "head":
        case "patch":
            return method.toLowerCase();
        case "any":
            return "x-amazon-apigateway-any-method";
        default:
            throw new Error("Method not supported: " + method);
    }
}

function createPathSpecLambda(lambda: aws.lambda.Function): SwaggerOperationAsync {
    const region = aws.config.requireRegion();
    const uri = lambda.arn.apply(lambdaARN =>
        `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaARN}/invocations`);

    return {
        "x-amazon-apigateway-integration": {
            uri: uri,
            passthroughBehavior: "when_no_match",
            httpMethod: "POST",
            type: "aws_proxy",
        },
    };
}

function createSwaggerString(spec: SwaggerSpec): pulumi.Output<string> {

    const pathsOutput = outputFromObject(spec.paths, methods => outputFromObject(methods, resolveOperationDependencies));

    // After all values have settled, we can produce the resulting string.
    return pathsOutput.apply(paths =>
        JSON.stringify({
            swagger: spec.swagger,
            info: spec.info,
            paths: paths,
            "x-amazon-apigateway-binary-media-types": spec["x-amazon-apigateway-binary-media-types"],
            // Map paths the user doesn't have access to as 404.
            // http://docs.aws.amazon.com/apigateway/latest/developerguide/supported-gateway-response-types.html
            "x-amazon-apigateway-gateway-responses": {
                "MISSING_AUTHENTICATION_TOKEN": {
                    "statusCode": 404,
                    "responseTemplates": {
                        "application/json": "{\"message\": \"404 Not found\" }",
                    },
                },
                "ACCESS_DENIED": {
                    "statusCode": 404,
                    "responseTemplates": {
                        "application/json": "{\"message\": \"404 Not found\" }",
                    },
                },
            },
        }));

    function resolveOperationDependencies(op: SwaggerOperationAsync): pulumi.Output<SwaggerOperation> {
        return resolveIntegrationDependencies(op["x-amazon-apigateway-integration"]).apply(integration => ({
            parameters: op.parameters,
            responses: op.responses,
            "x-amazon-apigateway-integration": integration,
        }));
    }

    function resolveIntegrationDependencies(op: ApigatewayIntegrationAsync): pulumi.Output<ApigatewayIntegration> {
        return pulumi.all([op.uri, op.credentials, op.connectionId]).apply(([uri, credentials, connectionId]) => ({
            requestParameters: op.requestParameters,
            passthroughBehavior: op.passthroughBehavior,
            httpMethod: op.httpMethod,
            type: op.type,
            responses: op.responses,
            connectionType: op.connectionType,
            uri: uri,
            credentials: credentials,
            connectionId: connectionId,
        }));
    }
}

