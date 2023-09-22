# Tells docker to use the latest Rust official image
FROM rust:latest

ENV INPUT_S3_ARN $INPUT_S3_ARN
# Copy the project files from your machine to the container
COPY ./ ./
# Build your application for release, inside the container
RUN cargo build --release
# Run the binary built inside the container
CMD ["./target/release/summation"]