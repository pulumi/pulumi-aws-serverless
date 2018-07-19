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
    /*
    {
  "Records": [
    {
      "cf": {
        "config": {
          "distributionDomainName": "d123.cloudfront.net",
          "distributionId": "EDFDVBD6EXAMPLE",
          "eventType": "viewer-request",
          "requestId": "MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="
        },
        "request": {
          "clientIp": "2001:0db8:85a3:0:0:8a2e:0370:7334",
          "querystring": "size=large",
          "uri": "/picture.jpg",
          "method": "GET",
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
                "value": "curl/7.51.0"
              }
            ]
          },
          "origin": {
            "custom": {
              "customHeaders": {
                "my-origin-custom-header": [
                  {
                    "key": "My-Origin-Custom-Header",
                    "value": "Test"
                  }
                ]
              },
              "domainName": "example.com",
              "keepaliveTimeout": 5,
              "path": "/custom_path",
              "port": 443,
              "protocol": "https",
              "readTimeout": 5,
              "sslProtocols": [
                "TLSv1",
                "TLSv1.1"
              ]
            },
            "s3": {
              "authMethod": "origin-access-identity",
              "customHeaders": {
                "my-origin-custom-header": [
                  {
                    "key": "My-Origin-Custom-Header",
                    "value": "Test"
                  }
                ]
              },
              "domainName": "my-bucket.s3.amazonaws.com",
              "path": "/s3_path",
              "region": "us-east-1"
            }
          }
        }
      }
    }
  ]
}*/
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