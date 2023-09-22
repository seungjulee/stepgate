## StepGate

### How to run
```bash
pulumi up
aws stepfunctions start-execution --state-machine-arn ${output.stateMachineArn}
```

### Overview

This is a set of Pulumi IaaS code along with a Rust application that handles the following logic.

1. It writes a JSON file to a s3 bucket after reading it from 'inputs' directory
2. It creates a step function that triggers a task on ECS Fargate
3. An ECS Fargate task runs the `summation` rust program
3.1 The `summation` rust program reads the environmental variable for input and output s3 path, and downloads the input json file.
3.2 It sums `a` and `b` from the downloaded JSON file that has a format of { "a": <number> "b": <number> }
3.3 It puts the result as a JSON file on the s3 from the given path passed as an environmental variable.


### TODO
These are things I would work on if I was had more time to work on.

1. Rather than using environmental variables as an input for the ECS rust program, use Step Function input parameters.
2. Pass the summation result and output s3 path as an Step Function output.
3. Separate out downloading an input and uploading an output as a separate step function process.
4. Group Pulumi calls into Pulumi ComponentResource.
5. Specify the IAM role and policy for uploading and downloading the input and output. Limit the resource to the relevant resources rather than allowing all.
6. Clean up ALB
