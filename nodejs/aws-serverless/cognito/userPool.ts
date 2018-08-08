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
import { cognito, lambda } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { RunError } from "@pulumi/pulumi";
import { createLambdaFunction, Handler } from "./../function";
import { EventSubscription } from "./../subscription";

interface CommonUserPoolEvent {
    // The version number of your Lambda function.
    version: number;

    // The name of the event that triggered the Lambda function. For a description of each
    // triggerSource see:
    // https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html#cognito-user-identity-pools-working-with-aws-lambda-trigger-sources
    triggerSource: string;

    // The AWS region.
    region: string;

    // The user pool ID for the user pool.
    userPoolId: string;

    // The username of the current user.
    userName: string;

    callerContext: {
        // The caller's AWS SDK version number.
        awsSdkVersion: string;

        // The ID of the client associated with the user pool.
        clientId: string;
    };

    // The request from the Amazon Cognito service. This request must include one or more pairs of
    // user attribute names and values.
    request: {
        userAttributes: Record<string, string>;
    };

    // The response from your Lambda trigger. The return parameters in the response depend on the
    // triggering event.
    response: {};
}

interface PreSignUpEvent extends CommonUserPoolEvent {
    triggerSource: "PreSignUp_AdminCreateUser";
    request: {
        userAttributes: Record<string, string>;

        // One or more name-value pairs containing the validation data in the request to register a
        // user. The validation data is set and then passed from the client in the request to
        // register a user.
        validationData: {
            Name: string;
            Value: string;
        }[];
    };

    response: {
        // Set to true to auto-confirm the user, or false otherwise
        autoConfirmUser: boolean;

        // Set to true to set as verified the phone number of a user who is signing up, or false
        // otherwise. If autoVerifyPhone is set to true, the phone_number attribute must have a
        // valid, non-null value. Otherwise an error will occur and the user will not be able to
        // complete sign-up.
        autoVerifyPhone: boolean;

        // Set to true to set as verified the email of a user who is signing up, or false otherwise.
        // If autoVerifyEmail is set to true, the email attribute must have a valid, non-null value.
        // Otherwise an error will occur and the user will not be able to complete sign-up.
        autoVerifyEmail: boolean;
    };
}

// No additional return information is expected in the response.
interface PostConfirmationEvent extends CommonUserPoolEvent {
    triggerSource: "PostConfirmation_ConfirmSignUp";
}

// No additional return information is expected in the response.
interface PreAuthenticationEvent extends CommonUserPoolEvent {
    triggerSource: "PreAuthentication_Authentication";

    request: {
        userAttributes: Record<string, string>;

        // One or more key-value pairs containing the validation data in the user's sign-in request.
        validationData: Record<string, string>;
    };
}

// No additional return information is expected in the response.
interface PostAuthenticationEvent extends CommonUserPoolEvent {
    triggerSource: "PostAuthentication_Authentication";

    request: {
        userAttributes: Record<string, string>;

        // This flag indicates if the user has signed in on a new device. It is set only if the
        // remembered devices value of the user pool is set to Always or User Opt-In.
        newDeviceUsed: boolean;
    };
}

interface CreateAuthChallengeEvent extends CommonUserPoolEvent {
    triggerSource: "CreateAuthChallenge_Authentication";

    request: {
        userAttributes: Record<string, string>;

        challengeName: string;

        session: {
            challengeName: "CUSTOM_CHALLENGE" | "PASSWORD_VERIFIER" | "SMS_MFA" | "DEVICE_SRP_AUTH" | "DEVICE_PASSWORD_VERIFIER" | "ADMIN_NO_SRP_AUTH";

            // Set to true if the user successfully completed the challenge, or false otherwise.
            challengeResult: boolean;
        }[];

        // Your name for the custom challenge. Used only if challengeName is "CUSTOM_CHALLENGE"
        challengeMetaData?: string;
    };

    response: {
        // One or more key-value pairs for the client app to use in the challenge to be presented to
        // the user. This parameter should contain all of the necessary information to accurately
        // present the challenge to the user.
        publicChallengeParameters: Record<string, string>;

        // This parameter is only used by the Verify Auth Challenge Response Lambda trigger. This
        // parameter should contain all of the information that is required to validate the user's
        // response to the challenge. In other words, the publicChallengeParameters parameter
        // contains the question that is presented to the user and privateChallengeParameters
        // contains the valid answers for the question.
        privateChallengeParameters: Record<string, string>;

        // Your name for the custom challenge, if this is a custom challenge.
        challengeMetadata: string;
    };
}

interface DefineAuthChallengeEvent extends CommonUserPoolEvent {
    triggerSource: "DefineAuthChallenge_Authentication";

    request: {
        userAttributes: Record<string, string>;

        challengeName: string;

        session: {
            challengeName: "CUSTOM_CHALLENGE" | "PASSWORD_VERIFIER" | "SMS_MFA" | "DEVICE_SRP_AUTH" | "DEVICE_PASSWORD_VERIFIER" | "ADMIN_NO_SRP_AUTH";

            // Set to true if the user successfully completed the challenge, or false otherwise.
            challengeResult: boolean;
        }[];

        // Your name for the custom challenge. Used only if challengeName is "CUSTOM_CHALLENGE"
        challengeMetaData?: string;
    };

    response: {
        // A string containing the name of the next challenge. If you want to present a new
        // challenge to your user, specify the challenge name here.
        challengeName: string;

        // Set to true if you determine that the user has sufficiently authenticated by completing
        // the challenges, or false otherwise.
        issueTokens: boolean;

        // Set to true if you want to terminate the current authentication process, or false
        // otherwise.
        failAuthentication: boolean;
    };
}

interface PreTokenGenerationEvent extends CommonUserPoolEvent {
    triggerSource: "TokenGeneration_HostedAuth" | "TokenGeneration_Authentication" | "TokenGeneration_NewPasswordChallenge" | "TokenGeneration_AuthenticateDevice" | "TokenGeneration_RefreshTokens";

    request: {
        userAttributes: Record<string, string>;

        groupConfiguration: {
            // A list of the group names that are associated with the user that the identity token
            // is issued for.
            groupsToOverride: string[];

            // A list of the current IAM roles associated with these groups.
            iamRolesToOverride: string[];

            // A string indicating the preferred IAM role.
            preferredRole: string;
        };
    };

    response: {
        claimsOverrideDetails: {
            // A map of one or more key-value pairs of claims to add or override. For group related
            // claims, use groupOverrideDetails instead.
            claimsToAddOrOverride: Record<string, string>;

            // A list that contains claims to be suppressed from the identity token.
            claimsToSuppress: string[];

            groupOverrideDetails: {
                // A list of the group names that are associated with the user that the identity token
                // is issued for.
                groupsToOverride: string[];

                // A list of the current IAM roles associated with these groups.
                iamRolesToOverride: string[];

                // A string indicating the preferred IAM role.
                preferredRole: string;
            }
        };
    };
}

interface UserMigrationEvent extends CommonUserPoolEvent {
    triggerSource: "UserMigration_Authentication" | "UserMigration_ForgotPassword";

    request: {
        userAttributes: Record<string, string>;

        // The password entered by the user for sign-in. It is not set in the forgot-password flow.
        password: string;
    };

    response: {
        userAttributes: Record<string, string>;

        // During sign-in, this attribute can be set to CONFIRMED, or not set, to auto-confirm your
        // users and allow them to sign-in with their previous passwords. This is the simplest
        // experience for the user. If this attribute is set to RESET_REQUIRED, the user is required
        // to change his or her password immediately after migration at the time of sign-in, and
        // your client app needs to handle the PasswordResetRequiredException during the
        // authentication flow.
        finalUserStatus: string;

        // This attribute can be set to "SUPPRESS" to suppress the welcome message usually sent by
        // Amazon Cognito to new users. If this attribute is not returned, the welcome message will
        // be sent.
        messageAction: string;

        // This attribute can be set to "EMAIL" to send the welcome message by email, or "SMS" to
        // send the welcome message by SMS. If this attribute is not returned, the welcome message
        // will be sent by SMS.
        desiredDeliveryMediums: string[];

        // If this parameter is set to "true" and the phone number or email address specified in the
        // UserAttributes parameter already exists as an alias with a different user, the API call
        // will migrate the alias from the previous user to the newly created user. The previous
        // user will no longer be able to log in using that alias.
        //
        // If this attribute is set to "false" and the alias exists, the user will not be migrated,
        // and an error is returned to the client app.
        //
        // If this attribute is not returned, it is assumed to be "false".
        forceAliasCreation: boolean;
    };
}

interface VerifyAuthChallengeEvent extends CommonUserPoolEvent {
    triggerSource: "VerifyAuthChallengeResponse_Authentication";

    request: {
        userAttributes: Record<string, string>;

        // This parameter comes from the Create Auth Challenge trigger, and is compared against a
        // user’s challengeAnswer to determine whether the user passed the challenge.
        privateChallengeParameters: Record<string, string>;

        // The answer from the user's response to the challenge
        challengeAnswer: Record<string, string>;
    };

    response: {
        // Set to true if the user has successfully completed the challenge, or false otherwise.
        answerCorrect: boolean;
    };
}

interface CustomMessageEvent extends CommonUserPoolEvent {
    triggerSource: "CustomMessage_SignUp" | "CustomMessage_AdminCreateUser" | "CustomMessage_ResendCode" | "CustomMessage_ForgotPassword" | "CustomMessage_UpdateUserAttribute" | "CustomMessage_VerifyUserAttribute" | "CustomMessage_Authentication";

    request: {
        userAttributes: Record<string, string>;

        // A string for you to use as the placeholder for the verification code in the custom message.
        codeParameter: string;

        // The username parameter. It is a required request parameter for the admin create user flow.
        usernameParameter: string;
    };

    response: {
        // The custom SMS message to be sent to your users. Must include the codeParameter value
        // received in the request.
        smsMessage: string;

        // The custom email message to be sent to your users. Must include the codeParameter value
        // received in the request.
        emailMessage: string;

        // The subject line for the custom message.
        emailSubject: string;
    };
}

type UserPoolLambdaConfig = cognito.UserPoolArgs["lambdaConfig"];

interface UserPoolHandlers {
    createAuthChallenge?: Handler<CreateAuthChallengeEvent, CreateAuthChallengeEvent>;
    customMessage?: Handler<CustomMessageEvent, CustomMessageEvent>;
    defineAuthChallenge?: Handler<DefineAuthChallengeEvent, DefineAuthChallengeEvent>;
    postAuthentication?: Handler<PostAuthenticationEvent, PostAuthenticationEvent>;
    postConfirmation?: Handler<PostConfirmationEvent, PostConfirmationEvent>;
    preAuthentication?: Handler<PreAuthenticationEvent, PreAuthenticationEvent>;
    preSignUp?: Handler<PreSignUpEvent, PreSignUpEvent>;
    preTokenGeneration?: Handler<PreTokenGenerationEvent, PreTokenGenerationEvent>;
    userMigration?: Handler<UserMigrationEvent, UserMigrationEvent>;
    verifyAuthChallengeResponse?: Handler<VerifyAuthChallengeEvent, VerifyAuthChallengeEvent>;
}

function createLambdaConfig(handlers: UserPoolHandlers | undefined): UserPoolLambdaConfig | undefined {
    if (!handlers) {
        return undefined;
    }

    return {
        createAuthChallenge: createLambda(handlers.createAuthChallenge),
        customMessage: createLambda(handlers.customMessage),
        defineAuthChallenge: createLambda(handlers.defineAuthChallenge),
        postAuthentication: createLambda(handlers.postAuthentication),
        postConfirmation: createLambda(handlers.postConfirmation),
        preAuthentication: createLambda(handlers.preAuthentication),
        preSignUp: createLambda(handlers.preSignUp),
        preTokenGeneration: createLambda(handlers.preTokenGeneration),
        userMigration: createLambda(handlers.userMigration),
        verifyAuthChallengeResponse: createLambda(handlers.verifyAuthChallengeResponse),
    };
}

function createLambda<T>(handler: Handler<T, T> | undefined): pulumi.Output<string> | undefined {
    if (!handler) {
        return undefined;
    }

    throw new RunError("NYI");
}
