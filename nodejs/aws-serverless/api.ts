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

import * as fs from "fs";
import * as mime from "mime";
import * as fspath from "path";

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

// StaticRoute is a registered static file route, backed by an S3 bucket.
export interface StaticRoute {
    path: string;
    localPath: string;

    /**
     * The `content-type` to serve the file as.  Only valid when localPath points to a file.  If
     * localPath points to a directory, the content types for all files will be inferred.
     */
    contentType?: string;

    /**
     * By default API.static will also serve 'index.html' in response to a request on a directory.
     * To disable this set false or to supply a new index pass an appropriate name.
     */
    index?: boolean | string;
}

export interface APIArgs {
    /**
     * The full specification to use to create the API.
     *
     * Either [swaggerSpec] or [swaggerString] must be specified.
     */
    swaggerSpec?: SwaggerSpec;

    /**
     * A Swagger specification already in string form to use to initialize the APIGateway.  Note
     * that you must manually provide permission for any route targets to be invoked by API Gateway
     * when using [swaggerString].
     *
     * Either [swaggerSpec] or [swaggerString] must be specified.
     */
    swaggerString?: pulumi.Input<string>;

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
        if (args.swaggerString) {
            swaggerString = pulumi.output(args.swaggerString);
        } else if (args.swaggerSpec) {
            swaggerSpec = args.swaggerSpec;
            swaggerString = createSwaggerString(swaggerSpec);
        } else {
            throw new Error("API must specify either `swaggerString` or `swaggerSpec` options.");
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

        // Expose the URL that the API is served at.
        this.url = this.deployment.invokeUrl.apply(url => url + stageName + "/");

        // Ensure that the permissions allow the API Gateway to invoke the lambdas.
        const permissions = [];
        if (swaggerSpec) {
            for (const path of Object.keys(swaggerSpec.paths)) {
                for (let method of Object.keys(swaggerSpec.paths[path])) {
                    const operation = swaggerSpec.paths[path][method];
                    const lambda = operation.lambda;

                    if (lambda) {
                        if (method === "x-amazon-apigateway-any-method") {
                            method = "*";
                        }
                        else {
                            method = method.toUpperCase();
                        }

                        const methodAndPath = method + ":" + path;
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
                        permissions.push(invokePermission);
                    }
                }
            }
        }

        // Create a stage, which is an addressable instance of the Rest API. Set it to point at the latest deployment.
        this.stage = new aws.apigateway.Stage(name, {
            restApi: this.restAPI,
            deployment: this.deployment,
            stageName: stageName,
        }, { parent: this, dependsOn: permissions });

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

    // The optional lambda to actualy invoke when this operation is invoked.
    lambda?: aws.lambda.Function;
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

export function createSwaggerSpec(
    name: string, routes?: Route[], staticRoutes?: StaticRoute[], opts?: pulumi.ResourceOptions): SwaggerSpec {

    return addStaticRoutesToSwaggerSpec(
        name, staticRoutes,
        addRoutesToSwaggerSpec(routes, createBaseSwaggerSpec(name)),
        opts);
}

export function addRoutesToSwaggerSpec(routes: Route[] | undefined, swagger: SwaggerSpec): SwaggerSpec {
    if (routes) {
        for (const route of routes) {
            const method = swaggerMethod(route.method);
            const lambda = createLambdaFunction(name + sha1hash(method + ":" + route.path), route.handler);
            if (!swagger.paths[route.path]) {
                swagger.paths[route.path] = {};
            }
            swagger.paths[route.path][method] = createPathSpecLambda(lambda);
        }
    }

    return swagger;
}

export function addStaticRoutesToSwaggerSpec(
    name: string, routes: StaticRoute[] | undefined, swagger: SwaggerSpec, opts?: pulumi.ResourceOptions): SwaggerSpec {

    // If there are no static files or directories, then we can bail out early.
    if (!routes || routes.length === 0) {
        return swagger;
    }

    const method = swaggerMethod("GET");

    // Create a bucket to place all the static data under.
    const bucket = new aws.s3.Bucket(safeS3BucketName(name), undefined, opts);

    function createRole(key: string) {
        // Create a role and attach it so that this route can access the AWS bucket.
        const role = new aws.iam.Role(key, {
            assumeRolePolicy: JSON.stringify(apigatewayAssumeRolePolicyDocument),
        }, opts);
        const attachment = new aws.iam.RolePolicyAttachment(key, {
            role: role,
            policyArn: aws.iam.AmazonS3FullAccess,
        }, opts);

        return role;
    }

    // For each static file, just make a simple bucket object to hold it, and create a swagger
    // path that routes from the file path to the arn for the bucket object.
    //
    // For static directories, use greedy api-gateway path matching so that we can map a single
    // api gateway route to all the s3 bucket objects we create for the files in these
    // directories.
    for (const route of routes) {
        const stat = fs.statSync(route.localPath);
        if (stat.isFile()) {
            processFile(route);
        }
        else if (stat.isDirectory()) {
            processDirectory(route);
        }
    }

    return swagger;

    function createBucketObject(key: string, localPath: string, contentType?: string) {
        const obj = new aws.s3.BucketObject(key, {
            bucket: bucket,
            key: key,
            source: new pulumi.asset.FileAsset(localPath),
            contentType: contentType || mime.getType(localPath) || undefined,
        }, opts);
    }

    function processFile(route: StaticRoute) {
        const key = name + sha1hash(method + ":" + route.path);
        const role = createRole(key);

        createBucketObject(key, route.localPath, route.contentType);

        const pathSpec = createPathSpecObject(bucket, key, role);
        swagger.paths[route.path] = { [method]: pathSpec };
    }

    function processDirectory(directory: StaticRoute) {
        const directoryServerPath = directory.path.endsWith("/")
            ? directory.path
            : directory.path + "/";

        const directoryKey = name + sha1hash(method + ":" + directoryServerPath);
        const role = createRole(directoryKey);

        let startDir = directory.localPath.startsWith("/")
            ? directory.localPath
            : fspath.join(process.cwd(), directory.localPath);

        if (!startDir.endsWith(fspath.sep)) {
            startDir = fspath.join(startDir, fspath.sep);
        }

        // If the user has supplied 'false' for options.index, then no speciam index file served
        // at the root. Otherwise if they've supplied an actual filename to serve as the index
        // file then use what they've provided.  Otherwise attempt to serve "index.html" at the
        // root (if it exists).
        const indexFile = directory.index === false
            ? undefined
            : typeof directory.index === "string"
                ? directory.index
                : "index.html";

        const indexPath = indexFile === undefined ? undefined : fspath.join(startDir, indexFile);

        // Recursively walk the directory provided, creating bucket objects for all the files we
        // encounter.
        function walk(dir: string) {
            const children = fs.readdirSync(dir);

            for (const childName of children) {
                const childPath = fspath.join(dir, childName);
                const stats = fs.statSync(childPath);

                if (stats.isDirectory()) {
                    walk(childPath);
                }
                else if (stats.isFile()) {
                    const childRelativePath = childPath.substr(startDir.length);
                    const childUrn = directoryKey + "/" + childRelativePath;

                    createBucketObject(childUrn, childPath);

                    if (childPath === indexPath) {
                        // We hit the file that we also want to serve as the index file. Create
                        // a specific swagger path from the server root path to it.
                        const indexPathSpec = createPathSpecObject(bucket, childUrn, role);
                        swagger.paths[directoryServerPath] = { [method]: indexPathSpec };
                    }
                }
            }
        }

        walk(startDir);

        // Take whatever path the client wants to host this folder at, and add the
        // greedy matching predicate to the end.

        const swaggerPath = directoryServerPath + "{proxy+}";
        const pathSpec = createPathSpecObject(bucket, directoryKey, role, "proxy");
        swagger.paths[swaggerPath] = { [swaggerMethod("any")]: pathSpec };
    }
}

function createBaseSwaggerSpec(apiName: string): SwaggerSpec {
    return {
        swagger: "2.0",
        info: { title: apiName, version: "1.0" },
        paths: {},
        "x-amazon-apigateway-binary-media-types": ["*/*"],
    };
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
        lambda: lambda,
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

function createPathSpecObject(
        bucket: aws.s3.Bucket,
        key: string,
        role: aws.iam.Role,
        pathParameter?: string): SwaggerOperationAsync {

    const region = aws.config.requireRegion();

    const uri = bucket.bucket.apply(bucketName =>
        `arn:aws:apigateway:${region}:s3:path/${bucketName}/${key}${(pathParameter ? `/{${pathParameter}}` : ``)}`);

    const result: SwaggerOperationAsync = {
        responses: {
            "200": {
                description: "200 response",
                schema: { type: "object" },
                headers: {
                    "Content-Type": { type: "string" },
                    "content-type": { type: "string" },
                },
            },
            "400": {
                description: "400 response",
            },
            "500": {
                description: "500 response",
            },
        },
        "x-amazon-apigateway-integration": {
            credentials: role.arn,
            uri: uri,
            passthroughBehavior: "when_no_match",
            httpMethod: "GET",
            type: "aws",
            responses: {
                "4\\d{2}": {
                    statusCode: "400",
                },
                "default": {
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Content-Type": "integration.response.header.Content-Type",
                        "method.response.header.content-type": "integration.response.header.content-type",
                    },
                },
                "5\\d{2}": {
                    statusCode: "500",
                },
            },
        },
    };

    if (pathParameter) {
        result.parameters = [{
            name: pathParameter,
            in: "path",
            required: true,
            type: "string",
        }];

        result["x-amazon-apigateway-integration"].requestParameters = {
            [`integration.request.path.${pathParameter}`]: `method.request.path.${pathParameter}`,
        };
    }

    return result;
}

const apigatewayAssumeRolePolicyDocument = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "Service": "apigateway.amazonaws.com",
            },
            "Action": "sts:AssumeRole",
        },
    ],
};

function safeS3BucketName(apiName: string): string {
    return apiName.toLowerCase().replace(/[^a-z0-9\-]/g, "");
}
