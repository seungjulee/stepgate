use std::env;

use aws_sdk_s3::{error::SdkError, primitives::ByteStream, Client};
use aws_sdk_s3::operation::{
    get_object::{GetObjectError, GetObjectOutput},
    put_object::{PutObjectError, PutObjectOutput},
};

use serde::{Deserialize, Serialize};
use serde_json::{Result as SerdeResult};

const INPUT_S3_BUCKET_ENV_VAR_NAME: &str = "INPUT_S3_ARN";
const INPUT_S3_KEY_ENV_VAR_NAME: &str = "INPUT_KEY";
const OUTPUT_S3_KEY_ENV_VAR_NAME: &str = "OUTPUT_KEY";

#[derive(Deserialize, Serialize, Debug)]
struct Input {
    a: i64,
    b: i64,
}

#[derive(Deserialize, Serialize, Debug)]
struct Output {
    c: i64,
}


async fn download_input(client: &Client, bucket: &str, key: &str) -> Input {
    let res = download_object(&client, bucket, key).await;
    let input = match res {
        Ok(r) => {
            let slices = match r.body.collect().await.map(|data| data.into_bytes()) {
                Ok(s) => s,
                Err(e) => {
                    panic!("err while reading the body {}", e);
                }
            };
            let p: Input = match serde_json::from_slice(&slices) {
                Ok(result) => result,
                Err(e) => {
                    panic!("unexpected input json format: {}", e);
                }
            };
            p
        },
        Err(e) => {
            panic!("No Object {:?}", SdkError::from(e));
        }
    };
    input
}


async fn upload_output(client: &Client, output: &Output, bucket: &str, key: &str) {
    let output_json = serde_json::to_string(&output);
    match upload_object(&client,&bucket,output_json.unwrap().as_str(), &key).await {
        Ok(o) => {
            println!("successfully uploaded {:?} to {}/{}", output, bucket, key);
        },
        Err(e) => {
            panic!("error while putting output into the file{}", e)
        }
    }

}

async fn index() {
    let bucket = match env::var_os(INPUT_S3_BUCKET_ENV_VAR_NAME) {
        Some(v) => v.into_string().unwrap(),
        None => panic!("$INPUT_S3_ARN is not set")
    };

    let input_key = match env::var_os(INPUT_S3_KEY_ENV_VAR_NAME) {
        Some(v) => v.into_string().unwrap(),
        None => panic!("$INPUT_KEY is not set")
    };

    let output_key = match env::var_os(OUTPUT_S3_KEY_ENV_VAR_NAME) {
        Some(v) => v.into_string().unwrap(),
        None => panic!("$INPUT_KEY is not set")
    };

    let shared_config = aws_config::from_env().load().await;
    let client = Client::new(&shared_config);

    let input = download_input(&client, &bucket, &input_key).await;

    let c = input.a + input.b;
    let output = Output { c };

    upload_output(&client, &output, &bucket, &output_key).await;
}

#[tokio::main]
async fn main() {
    index().await;
}

pub async fn download_object(
    client: &Client,
    bucket_name: &str,
    key: &str,
) -> Result<GetObjectOutput, SdkError<GetObjectError>> {
    client
        .get_object()
        .bucket(bucket_name)
        .key(key)
        .response_content_type("application/json")
        .send()
        .await
}

pub async fn upload_object(
    client: &Client,
    bucket_name: &str,
    body: &str,
    key: &str,
) -> Result<PutObjectOutput, SdkError<PutObjectError>> {
    let body = ByteStream::from(body.as_bytes().to_vec());

    client
        .put_object()
        .bucket(bucket_name)
        .key(key)
        .body(body)
        .content_type("application/json")
        .send()
        .await
}
