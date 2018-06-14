[![Build Status](https://travis-ci.com/pulumi/pulumi-aws-serverless.svg?token=eHg7Zp5zdDDJfTjY8ejq&branch=master)](https://travis-ci.com/pulumi/pulumi-aws-serverless)

# Pulumi Amazon Web Services (AWS) Serverless Components

Pulumi's framework for useful serverless components

Install using: ```npm install @pulumi/aws-serverless```

# Components

`@pulumi/aws-serverless` provides libraries to simply subscribe to many AWS events and to execute
AWS lambdas in response to them.  For example, `bucket.onPut/onDelete/onEvent` allow one to run an
AWS lambda in response to the corresponding bucket event that is subscribed to.

All subscriptions allow the client to pass a preferred function.Handler instance to run when the
subscription fires.  This Handler can either be an AWS aws.lambda.Function instance (available
through the `@pulumi/aws` library), or it can be an actual JavaScript/TypeScript function object
(provided it has the right signature).

In the former case, the aws.lambda.Function resource can be one that the program has defined itself.
Or it can just be a reference to an existing AWS Lamba that already exists in the client's cloud
infrastructure.

In the latter case, the JavaScript/TypeScript function will be analyzed and 'serialized' out into a
form suitable for use by an AWS Lambda that Pulumi will then create on behalf of the program.  This can greatly simplify defining cloud-callbacks for AWS events by avoiding needing to manually construct and maintain the AWS Lambda yourself independently of the main cloud application.