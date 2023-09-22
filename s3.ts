import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const inputBucket = new aws.s3.Bucket("s3-stepgate-bucket");

const INPUT_KEY_PATH = "inputs/input.json";

async function addFolderContents(path: string) {
    let object = new aws.s3.BucketObject(path, {
        bucket: inputBucket,
        source: new pulumi.asset.FileAsset(path),
        contentType: "application/json",
      });
}

export const bucketName = inputBucket.bucket;
export const bucketARN = inputBucket.arn;
export const keyPath = INPUT_KEY_PATH;
export const outputKeyPath = 'output/output.json';

addFolderContents(`./${INPUT_KEY_PATH}`);
