[![Build Status](https://travis-ci.com/pulumi/pulumi-aws-serverless.svg?token=eHg7Zp5zdDDJfTjY8ejq&branch=master)](https://travis-ci.com/pulumi/pulumi-aws-serverless)

# Pulumi Amazon Web Services (AWS) Serverless Components

Pulumi's framework for creating easy but powerful serverless components.

This package is meant for use with the Pulumi CLI.  Please visit [pulumi.io](https://pulumi.io) for
installation instructions.

The AWS Serverless package is in very early preview, but will soon offer event sources from any AWS resource that
may trigger a Lambda event, and permits you to subscribe to these events in an idiomatic JavaScript style.

## Installing

This package is available in JavaScript/TypeScript for use with Node.js.  Install it using either `npm`:

    $ npm install @pulumi/aws-serverless

or `yarn`:

    $ yarn add @pulumi/aws-serverless

## Concepts

This package provides libraries to simply subscribe to many AWS events and to execute AWS lambdas in response to them.
For example, `bucket.onPut/onDelete/onEvent` allows you to run an AWS lambda in response to the corresponding bucket
event that is subscribed to.

All subscriptions allow the client to pass a preferred `function.Handler` instance to run when the subscription fires.
This `Handler` can either be an AWS `aws.lambda.Function` instance (available through the `@pulumi/aws` library), or it
can be an actual JavaScript/TypeScript function object (provided it has the right signature).

In the former case, the `aws.lambda.Function` resource can be one that the program has defined itself.  Or it can just
be a reference to an existing AWS Lambda that already exists in the client's cloud infrastructure.

In the latter case, the JavaScript/TypeScript function will be analyzed and 'serialized' out into a form suitable for
use by an AWS Lambda that Pulumi will then create on behalf of the program.  This can greatly simplify defining
cloud callbacks for AWS events by avoiding needing to manually construct and maintain the AWS Lambda yourself
independently of the main cloud application.

For example, a new handler for an S3 bucket's PUT event can be subscribed simply by doing the following:

```typescript
const bucket = aws.s3.Bucket.get("my-bucket");
serverless.bucket.onPut("test", bucket, async (event) => {
    // Lambda's code goes here...
});
```

In this example, we're looking up an existing bucket using the `get` method, but we could have created one just as well.

## Reference

For detailed reference documentation, please visit [the API docs](
https://pulumi.io/reference/pkg/nodejs/@pulumi/aws-serverless/index.html).
