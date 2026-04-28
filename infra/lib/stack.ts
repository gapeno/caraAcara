import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';

const FRONTEND_BUILD = path.join(__dirname, '../../frontend/build');

// Source.asset() validates the path at synth time — create a placeholder if the
// real build hasn't run yet (first-time deploy).
if (!fs.existsSync(FRONTEND_BUILD)) {
  fs.mkdirSync(FRONTEND_BUILD, { recursive: true });
  fs.writeFileSync(
    path.join(FRONTEND_BUILD, 'index.html'),
    '<html><body><p>Deploying…</p></body></html>',
  );
}

export class CaraAcaraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── Backend (ECS Fargate + ALB) ───────────────────────────────────────────
    // Fargate keeps a persistent process, which WebSocket connections require.
    // Lambda cannot hold open connections, so we run a plain uvicorn server here.

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    const backendService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this, 'BackendService', {
        cluster,
        memoryLimitMiB: 512,
        cpu: 256,
        taskImageOptions: {
          image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../backend'), {
            // Force x86_64 so the image matches Fargate's default architecture
            platform: Platform.LINUX_AMD64,
          }),
          containerPort: 8000,
        },
        publicLoadBalancer: true,
        desiredCount: 1,
      },
    );

    backendService.targetGroup.configureHealthCheck({ path: '/health' });

    // ── Frontend (S3 + CloudFront) ─────────────────────────────────────────────

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Shared behavior for the two API path patterns.
    // CACHING_DISABLED + ALL_VIEWER_EXCEPT_HOST_HEADER ensures CloudFront forwards
    // WebSocket upgrade headers (Upgrade, Connection, Sec-WebSocket-*) to the ALB.
    const albOrigin = new origins.HttpOrigin(
      backendService.loadBalancer.loadBalancerDnsName,
      { protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY },
    );

    const apiBehavior: cloudfront.BehaviorOptions = {
      origin: albOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    };

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        '/games':   apiBehavior,
        '/games/*': apiBehavior,
        '/health':  apiBehavior,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    new s3deploy.BucketDeployment(this, 'FrontendDeploy', {
      sources: [s3deploy.Source.asset(FRONTEND_BUILD)],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Frontend and API share the same origin (CloudFront domain) — set CORS accordingly.
    backendService.taskDefinition.defaultContainer!.addEnvironment(
      'CORS_ORIGIN',
      `https://${distribution.distributionDomainName}`,
    );

    // ── Outputs ───────────────────────────────────────────────────────────────

    new cdk.CfnOutput(this, 'AppUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'App URL — use as REACT_APP_API_URL before npm run build',
    });
  }
}
