import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as s3sdk from "@aws-sdk/client-s3";
import inputJson from './inputs/input.json';

const inputBucket = new aws.s3.Bucket("s3-stepgate-bucket");

const INPUT_KEY_PATH = "./inputs/input.json";

async function addFolderContents(path: string) {
    let object = new aws.s3.BucketObject(path, {
        bucket: inputBucket,
        source: new pulumi.asset.FileAsset(path),     // use FileAsset to point to a file
        contentType: "application/json", // set the MIME type of the file
      });
}

export const bucketName = inputBucket.bucket; // create a stack export for bucket name
export const bucketARN = inputBucket.arn; // create a stack export for bucket name

addFolderContents(INPUT_KEY_PATH); // base directory for content files
