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
import { cloudfront, lambda } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { RunError } from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./../function";
import { EventSubscription } from "./../subscription";
interface ViewerOrOriginRequestEvent {
    Records: ViewerOrOriginRequestEventRecord[];
}

interface ViewerOrOriginRequestEventRecord {
    cf: {
        config: {
            // The domain name of the distribution that's associated with the request.
            distributionDomainName: string;
            // The ID of the distribution that's associated with the request.
            distributionId: string;
            eventType: "viewer-request" | "origin-request",
            // An encrypted string that uniquely identifies a request. The requestId value also
            // appears in CloudFront access logs as x-edge-request-id.
            requestId: string;
        },
        request: {
            // The IP address of the viewer that made the request. If the viewer used an HTTP proxy
            // or a load balancer to send the request, the value is the IP address of the proxy or
            // load balancer.
            clientIp: string;

            // The query string, if any, that CloudFront received in the viewer request. If the viewer
            // request doesn't include a query string, the event structure still includes querystring
            // with an empty value.
            querystring: string;

            // The relative path of the requested object. Note the following:
            //
            // The new relative path must begin with a slash (like this: /).
            //
            // If a function changes the URI for a request, that changes the object that the viewer is
            // requesting.
            //
            // If a function changes the URI for a request, that doesn't change the cache behavior for
            // the request or the origin that the request is forwarded to.
            uri: string;

            // The HTTP method of the viewer request.
            method: string;

            headers: Headers;

            // You can specify either a custom origin or an Amazon S3 origin in a single request;
            // not both.
            origin: {
                custom?: {
                    // You can include custom headers with the request by specifying a header name
                    // and value pair for each custom header. You can't add headers that are
                    // blacklisted for origin custom headers or hooks, and a header with the same
                    // name can't be present in request.headers or in
                    // request.origin.custom.customHeaders. The restrictions for request.headers
                    // also apply to custom headers.
                    customHeaders: Headers;

                    // The domain name of the origin server, like www.example.com. The domain name
                    // can't be empty, can't include a colon (:), and can't use the IPV4 address
                    // format. The domain name can be up to 253 characters.
                    domainName: string;

                    // How long, in seconds, that CloudFront should try to maintain the connection
                    // to your origin after receiving the last packet of a response. The value must
                    // be a number in the range of 1 to 60 seconds.
                    keepaliveTimeout: number;

                    // The directory path at the server where the request should locate content. The
                    // path should start with a slash (/) but should have no trailing / (like
                    // path/). The path should be URL encoded, with a maximum length of 255
                    // characters.
                    path: string;

                    // The port at your custom origin. The port must be 80 or 443, or a number in
                    // the range of 1024 to 65535.
                    port: 443;

                    // The origin protocol policy that CloudFront should use when fetching objects
                    // from your origin. The value can be http or https.
                    protocol: "http" | "https";

                    // How long, in seconds, CloudFront should wait for a response after forwarding
                    // a request to the origin, and how long CloudFront should wait after receiving
                    // a packet of a response before receiving the next packet. The value must be a
                    // number in the range of 4 to 60 seconds.
                    readTimeout: number;

                    // The SSL protocols that CloudFront can use when establishing an HTTPS
                    // connection with your origin. Values can be the following: TLSv1.2, TLSv1.1,
                    // TLSv1, SSLv3
                    sslProtocols: ("TLSv1.2" | "TLSv1.1" | "TLSv1" | "SSLv3")[];
                },

                s3?: {
                    // Set to origin-access-identity if your Amazon S3 bucket has an origin access
                    // identity (OAI) set up, or none if you aren’t using OAI. If you set authMethod
                    // to origin-access-identity, there are several requirements:
                    authMethod: string;

                    // You can include custom headers with the request by specifying a header name
                    // and value pair for each custom header. You can't add headers that are
                    // blacklisted for origin custom headers or hooks, and a header with the same
                    // name can't be present in request.headers or in
                    // request.origin.custom.customHeaders. The restrictions for request.headers
                    // also apply to custom headers.
                    customHeaders: Headers;

                    // The domain name of the Amazon S3 origin server, like
                    // my-bucket.s3.amazonaws.com. The domain name can't be empty, and must be an
                    // allowed bucket name (as defined by Amazon S3). Do not use a region-specific
                    // endpoint, like my-bucket.s3-eu-west-1.amazonaws.com. The name can be up to
                    // 128 characters, and must be all lowercase.
                    domainName: string;

                    // The directory path at the server where the request should locate content. The
                    // path should start with a slash (/) but should have no trailing / (like
                    // path/).
                    path: string;

                    // The region for your Amazon S3 bucket. This is required only if you use OAI.
                    region: string;
                };
            }
        };
    };
}

interface ViewerOrOriginResponseEvent {
    Records: ViewerOrOriginResponseEventRecord[];
}

interface ViewerOrOriginResponseEventRecord {
    cf: {
        config: {
            // The domain name of the distribution that's associated with the request.
            distributionDomainName: string;
            // The ID of the distribution that's associated with the request.
            distributionId: string;
            eventType: "viewer-response" | "origin-response",

            // An encrypted string that uniquely identifies a request. The requestId value also
            // appears in CloudFront access logs as the x-edge-request-id. For more information, see
            // Configuring and Using Access Logs and Web Distribution Log File Format.
            requestId: string;
        };
        request: {
            // The IP address of the viewer that made the request. If the viewer used an HTTP proxy
            // or a load balancer to send the request, the value is the IP address of the proxy or
            // load balancer.
            clientIp: string;

            // The query string, if any, that CloudFront received in the viewer request. If the viewer
            // request doesn't include a query string, the event structure still includes querystring
            // with an empty value.
            querystring: string;

            // The relative path of the requested object. Note the following:
            //
            // The new relative path must begin with a slash (like this: /).
            //
            // If a function changes the URI for a request, that changes the object that the viewer is
            // requesting.
            //
            // If a function changes the URI for a request, that doesn't change the cache behavior for
            // the request or the origin that the request is forwarded to.
            uri: string;

            // The HTTP method of the viewer request.
            method: string;

            headers: Headers;
        },
        response: {
            // The HTTP status code that CloudFront returns to the viewer.
            status: string;

            // The HTTP status description that CloudFront returns to the viewer.
            statusDescription: string;

            // Headers that you want CloudFront to return in the generated response.
            headers: Headers;
        }
    };
}

type Headers = Record<string, { key: string, value: string }[]>;

interface Result {
    // The body, if any, that you want CloudFront to return in the generated response.
    body?: string;

    // The encoding for the value that you specified in the body. The only valid encodings are text
    // and base64. If you include body in the response object but omit bodyEncoding, CloudFront
    // treats the body as text.
    //
    // If you specify bodyEncoding as base64 but the body is not valid base64, CloudFront returns an
    // error.
    bodyEncoding?: "text" | "base64";

    // Headers that you want CloudFront to return in the generated response. Note the following:
    //
    // The keys in the headers object are lowercase versions of standard HTTP header names. Using
    // lowercase keys gives you case-insensitive access to the header values.
    //
    // Each header (for example, headers["accept"] or headers["host"]) is an array of key-value
    // pairs. For a given header, the array contains one key-value pair for each value in the
    // generated response. For example, if you want to include 3 values in the host header, the
    // headers["host"] array will contain 3 key-value pairs.
    //
    // 'key' is the case-sensitive name of the header as it appears in an HTTP request; for example,
    // accept or host.
    //
    // 'value' is a header value.
    headers?: Headers;

    // The HTTP status code that you want CloudFront to use for the following:
    //
    // Return in the response
    //
    // Cache in the CloudFront edge cache, when the response was generated by a function that was
    // triggered by an origin request event
    //
    // Log in CloudFront Configuring and Using Access Logs
    //
    // If the status value isn't between 200 and 599, CloudFront returns an error to the viewer.
    status: string;

    // The description that you want CloudFront to return in the response, to accompany the HTTP
    // status code. You don't need to use standard descriptions, such as OK for an HTTP status code
    // of 200.
    statusDescription?: string;
}

type EventType = "viewer-request" | "viewer-response" | "origin-request" | "origin-response";

interface LambdaFunctionAssociation {
    eventType: EventType;
    lambdaArn: pulumi.Input<string>;
}

interface DistributionHandlers {
    // The function executes when CloudFront receives a request from a viewer, before it checks to
    // see whether the requested object is in the edge cache.
    viewerRequest?: Handler<ViewerOrOriginRequestEvent, Result>;

    // The function executes only when CloudFront forwards a request to your origin. When the
    // requested object is in the edge cache, the function doesn't execute.
    originRequest?: Handler<ViewerOrOriginRequestEvent, Result>;

    // The function executes before returning the requested file to the viewer. Note that the
    // function executes regardless of whether the file is already in the edge cache.
    viewerResponse?: Handler<ViewerOrOriginResponseEvent, Result>;

    // The function executes after CloudFront receives a response from the origin and before it
    // caches the object in the response. Note that the function executes even if an error is
    // returned from the origin.
    originResponse?: Handler<ViewerOrOriginResponseEvent, Result>;
}

function createLambdaFunctionAssociations(handlers: DistributionHandlers | undefined): LambdaFunctionAssociation[] | undefined {
    if (!handlers) {
        return undefined;
    }

    const result: LambdaFunctionAssociation[] = [];
    addIfExists(createLambdaFunctionAssociation("viewer-request", handlers.viewerRequest));
    addIfExists(createLambdaFunctionAssociation("origin-request", handlers.originRequest));
    addIfExists(createLambdaFunctionAssociation("viewer-response", handlers.viewerResponse));
    addIfExists(createLambdaFunctionAssociation("origin-response", handlers.originResponse));

    return result.length === 0 ? undefined : result;

    function addIfExists(association: LambdaFunctionAssociation | undefined) {
        if (association) {
            result.push(association);
        }
    }
}

function createLambdaFunctionAssociation<E, R>(eventType: EventType, handler: Handler<E, R> | undefined): LambdaFunctionAssociation | undefined {
    if (!handler) {
        return undefined;
    }

    return { eventType: eventType, lambdaArn: createLambdaAndGetArn(handler) };
}

function createLambdaAndGetArn<E, R>(handler: Handler<E, R>): pulumi.Output<string> {
    throw new RunError("NYI");
}
