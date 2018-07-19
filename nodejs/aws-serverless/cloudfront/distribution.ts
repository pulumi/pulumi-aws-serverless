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
import { Omit } from "./../utils";

// We want to
function dummy(dist: cloudfront.Distribution) {
    return dist.defaultCacheBehavior.get();
}

type CloudFrontDistributionCacheBehavior = ReturnType<typeof dummy>;

export type DistributionCacheBehavior = Omit<CloudFrontDistributionCacheBehavior, "lambdaFunctionAssociations"> & {
    lambdaConfig?: {
        viewerRequest?: Handler<ViewerOrOriginRequestEvent, ViewerOrOriginRequestEvent>;
        originRequest?: Handler<ViewerOrOriginRequestEvent, ViewerOrOriginRequestEvent>;
        viewerResponse?: Handler<ViewerOrOriginResponseEvent, ViewerOrOriginResponseEvent>;
        originResponse?: Handler<ViewerOrOriginResponseEvent, ViewerOrOriginResponseEvent>;
    };
};

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

            headers: Record<string, { key: string, value: string }[]>;

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
                    customHeaders: Record<string, { key: string, value: string }[]>;

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
                    customHeaders: Record<string, { key: string, value: string }[]>;

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
    /*
    {
    "Records": [
        {
            "cf": {
                "config": {
                    "distributionDomainName": "d123.cloudfront.net",
                    "distributionId": "EDFDVBD6EXAMPLE",
                    "eventType": "viewer-response",
                    "requestId": "xGN7KWpVEmB9Dp7ctcVFQC4E-nrcOcEKS3QyAez--06dV7TEXAMPLE=="
                },
                "request": {
                    "clientIp": "2001:0db8:85a3:0:0:8a2e:0370:7334",
                    "method": "GET",
                    "uri": "/picture.jpg",
                    "querystring": "size=large",
                    "headers": {
                        "host": [
                            {
                                "key": "Host",
                                "value": "d111111abcdef8.cloudfront.net"
                            }
                        ],
                        "user-agent": [
                            {
                                "key": "User-Agent",
                                "value": "curl/7.18.1"
                            }
                        ]
                    }
                },
                "response": {
                    "status": "200",
                    "statusDescription": "OK",
                    "headers": {
                        "server": [
                            {
                                "key": "Server",
                                "value": "MyCustomOrigin"
                            }
                        ],
                        "set-cookie": [
                            {
                                "key": "Set-Cookie",
                                "value": "theme=light"
                            },
                            {
                                "key": "Set-Cookie",
                                "value": "sessionToken=abc123; Expires=Wed, 09 Jun 2021 10:18:14 GMT"
                            }
                        ]
                    }
                }
            }
        }
    ]
}
    */
}

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
    headers?: Record<string, { key: string, value: string }[]>;

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

type DistributionArgs = Omit<cloudfront.DistributionArgs, "cacheBehaviors" | "defaultCacheBehavior" | "orderedCacheBehaviors"> & {
    defaultCacheBehavior?: DistributionCacheBehavior;
    cacheBehaviors?: DistributionCacheBehavior[];
    orderedCacheBehaviors?: DistributionCacheBehavior[];
};

// "viewer-request"|"viewer-response"|"origin-request"|"origin-response"

export interface LambdaFunctionAssociation {
    eventType: "viewer-request" | "viewer-response" | "origin-request" | "origin-response";
    lambdaArn: pulumi.Input<string>;
}

export function createViewerRequestLambdaFunctionAssociation(
    name: string, handler: Handler<ViewerOrOriginRequestEvent, Result>, opts?: pulumi.ResourceOptions): pulumi.Output<LambdaFunctionAssociation> {

    throw new RunError("NYI");
}

export function createOriginRequestLambdaFunctionAssociation(
    name: string, handler: Handler<ViewerOrOriginRequestEvent, Result>, opts?: pulumi.ResourceOptions): pulumi.Output<LambdaFunctionAssociation> {

    throw new RunError("NYI");
}

export function createViewerResponseLambdaFunctionAssociation(
    name: string, handler: Handler<ViewerOrOriginResponseEvent, Result>, opts?: pulumi.ResourceOptions): pulumi.Output<LambdaFunctionAssociation> {

    throw new RunError("NYI");
}

export function createOriginResponseLambdaFunctionAssociation(
    name: string, handler: Handler<ViewerOrOriginResponseEvent, Result>, opts?: pulumi.ResourceOptions): pulumi.Output<LambdaFunctionAssociation> {

    throw new RunError("NYI");
}

export function createLambdaFunctionAssociations(associations: pulumi.Output<LambdaFunctionAssociation>[]): pulumi.Output<LambdaFunctionAssociation[]> {
    return pulumi.all(associations);
}

export function createDistribution(name: string, args: DistributionArgs, opts?: pulumi.ResourceOptions): cloudfront.Distribution {
    throw new RunError("NYI");
}