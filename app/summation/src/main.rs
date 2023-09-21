use actix_web::{get, web, App, HttpServer, Responder};
use std::env;

const INPUT_S3_BUCKET_ENV_VAR_NAME: &str = "INPUT_S3_ARN";

#[get("/{id}/{name}/index.html")]
async fn index(web::Path((id, name)): web::Path<(u32, String)>) -> impl Responder {
    match env::var(INPUT_S3_BUCKET_ENV_VAR_NAME) {
        Ok(v) => format!("Hello {}! id:{} bucket:{}", name, id, v),
        Err(e) => format!("${} is not set ({})", INPUT_S3_BUCKET_ENV_VAR_NAME, e)
    }
    // format!("Hello {}! id:{} bucket:{}", name, id)
}
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(index))
        .bind("0.0.0.0:80")?
        .run()
        .await
}