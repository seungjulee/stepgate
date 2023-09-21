import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as s3sdk from "@aws-sdk/client-s3";
import inputJson from './inputs/input.json';

const inputBucket = new aws.s3.Bucket("s3-stepgate-bucket", {});
const bucketPolicy = new aws.s3.BucketPolicy("my-bucket-policy", {
    bucket: inputBucket.bucket,
    policy: inputBucket.bucket.apply(publicReadPolicyForBucket)
})

const INPUT_KEY_PATH = "./inputs/input.json";

async function addFolderContents(path: string) {
    const s3 = new s3sdk.S3({});

    await s3.putObject({
        Bucket: inputBucket.bucket.get(),
        Key: path,
        Body: JSON.stringify(inputJson),
    });
}

function publicReadPolicyForBucket(bucketName: string) {
    return JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: "*",
            Action: [
                "s3:GetObject"
            ],
            Resource: [
                `arn:aws:s3:::${bucketName}/*` // policy refers to bucket name explicitly
            ]
        }]
    });
}

addFolderContents(INPUT_KEY_PATH); // base directory for content files

export const bucketName = inputBucket.bucket; // create a stack export for bucket name
export const bucketARN = inputBucket.arn; // create a stack export for bucket name