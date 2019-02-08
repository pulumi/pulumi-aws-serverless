[![Build Status](https://travis-ci.com/pulumi/pulumi-aws-serverless.svg?token=eHg7Zp5zdDDJfTjY8ejq&branch=master)](https://travis-ci.com/pulumi/pulumi-aws-serverless)

# Pulumi Amazon Web Services (AWS) Serverless Components

**This package has been deprecated.  All functionality previously contained in it has moved to the [@pulumi/aws](https://github.com/pulumi/pulumi-aws) package.**

While the same functionality can be achieved using `@pulumi/aws`, moving existing code to use that library is not a straight source translation.  Specifically, while usage `@pulumi/aws-serverless` APIs would result in code like:

```ts
const bucket = aws.s3.Bucket.get("my-bucket");
serverless.bucket.onObjectCreated("test", bucket, async (event) => {
    // Lambda's code goes here...
});
```

The expected usage of `@pulumi/aws` would be:

```typescript
const bucket = aws.s3.Bucket.get("my-bucket");
bucket.onObjectCreated("test", async (event) => {
    // Lambda's code goes here...
});
```

In other words, serverless-eventing functionality moved from being global static helpers, to being instance methods on the specific aws resource types.

`@pulumi/aws-serverless` is still available, but just shims down to `@pulumi/aws`.  It will not receive any more updates, and it may be removed at some point in the future.
