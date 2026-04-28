#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CaraAcaraStack } from '../lib/stack';

const app = new cdk.App();
new CaraAcaraStack(app, 'CaraAcaraStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});
