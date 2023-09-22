import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as s3 from "./s3";
import * as classic from "./classic";

// An ECS cluster to deploy into.
const cluster = new aws.ecs.Cluster("cluster", {});

// Create a load balancer to listen for requests and route them to the container.
const loadbalancer = new awsx.lb.ApplicationLoadBalancer("loadbalancer", {});

// Create the ECR repository to store our container image
const repo = new awsx.ecr.Repository("repo", {
    forceDelete: true,
});

// Build and publish our application's container image from ./app/summation to the ECR repository.
const image = new awsx.ecr.Image("image", {
    repositoryUrl: repo.url,
    path: "./app/summation",
});

const BUCKET_ENV_VAR_KEY = "INPUT_S3_ARN";
const KEY_ENV_VAR_KEY = "INPUT_KEY";
const OUTPUT_KEY_ENV_VAR = "OUTPUT_KEY";

// Define the service and configure it to use our image and load balancer.
const service = new awsx.ecs.FargateService("service", {
    cluster: cluster.arn,
    assignPublicIp: true,
    taskDefinitionArgs: {
        container: {
            name: "awsx-ecs",
            image: image.imageUri,
            cpu: 128,
            memory: 512,
            essential: true,
            portMappings: [{
                containerPort: 80,
                targetGroup: loadbalancer.defaultTargetGroup,
            }],
            environment: [{
                name: BUCKET_ENV_VAR_KEY,
                value: s3.bucketName,
            }, {
                name: KEY_ENV_VAR_KEY,
                value: s3.keyPath,
            }, {
                name: OUTPUT_KEY_ENV_VAR,
                value: s3.outputKeyPath,
            }],
        },
        runtimePlatform: {
            cpuArchitecture: "ARM64",
            operatingSystemFamily: "LINUX",
        }
    },
}, {dependsOn: [cluster] });

// Export the URL so we can easily access it.
export const frontendURL = pulumi.interpolate `http://${loadbalancer.loadBalancer.dnsName}`;


// STEP FUNCTION
const region = aws.config.requireRegion();

const ecsRole = new aws.iam.Role("ecsRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" }),
});

new aws.iam.RolePolicyAttachment("task-exec-policy", {
    role: ecsRole.id,
    policyArn: aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy,
});

new aws.iam.RolePolicyAttachment("task-s3-policy", {
    role: ecsRole.id,
    policyArn: aws.iam.ManagedPolicy.AmazonS3FullAccess,
});

const sfnRole = new aws.iam.Role("sfnRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: `states.${region}.amazonaws.com` }),
});

const sfnRolePolicy = new aws.iam.RolePolicy("sfnRolePolicy", {
    role: sfnRole.id,
    policy: {
      Version: "2012-10-17",
      Statement: [
        {
            "Action": [
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecs:RunTask",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "events:PutTargets",
                "events:PutRule",
                "events:DescribeRule",
                "iam:PassRole",
            ],
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": "ecr:GetAuthorizationToken",
            "Resource": "*",
            "Effect": "Allow"
        }
    ]},
});

const stateMachine = new aws.sfn.StateMachine("stateMachine", {
    roleArn: sfnRole.arn,
    definition: pulumi.jsonStringify({
        "Comment": "A Hello World example of the Amazon States Language using two AWS Lambda Functions",
        "StartAt": "Hello",
        "States": {
            "Hello": {
                "Type": "Task",
                "Resource": "arn:aws:states:::ecs:runTask.sync",
                "Parameters": {
                    "LaunchType": "FARGATE",
                    "Cluster": cluster.arn,
                    "TaskDefinition": service.taskDefinition.apply(t => t?.arn),
                    "NetworkConfiguration": {
                        "AwsvpcConfiguration": {
                            "AssignPublicIp": "ENABLED",
                            "Subnets": classic.subnetIds,
                            "SecurityGroups": [classic.securityGroupId],
                        },
                    },
                    // "Overrides": {
                    //     "ContainerOverrides": [{
                    //         "Name": "awsx-ecs",
                    //         "Environment": [{
                    //             "Name": BUCKET_ENV_VAR_KEY,
                    //             "Value": `${s3.bucketARN}/inputs/input.json`,
                    //         }]
                    //     }]
                    // }
                },
                "Retry": [{
                    "ErrorEquals": ["States.TaskFailed"],
                    "IntervalSeconds": 3,
                    "MaxAttempts": 2,
                    "BackoffRate": 1.5
                }],
                "End": true
            }
        },
      },
    )
},  { dependsOn: [service] });

export const stateMachineArn = stateMachine.id;