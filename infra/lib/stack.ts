import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration, WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import * as path from 'path';

const FRONTEND_BUILD = path.join(__dirname, '../../frontend/build');
// Built by `deploy.sh` (pip install --platform manylinux2014_x86_64 --target),
// so CDK just zips a plain directory — no Docker involved.
const BACKEND_LAMBDA_PACKAGE = path.join(__dirname, '../../backend/build');

export class CaraAcaraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── Data (DynamoDB) ──────────────────────────────────────────────────────
    // Replaces the old in-memory _store dict and in-process ConnectionManager —
    // Lambda instances are stateless and not shared across invocations.

    const gamesTable = new dynamodb.Table(this, 'GamesTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    connectionsTable.addGlobalSecondaryIndex({
      indexName: 'GameIdIndex',
      partitionKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.KEYS_ONLY,
    });

    // ── Backend (Lambda, one shared zip asset) ────────────────────────────────
    // `deploy.sh` pip-installs Lambda deps as manylinux wheels and bundles the
    // app source into backend/.build; CDK just zips that directory as-is for
    // all four functions (no Docker involved), with a different `handler`
    // entrypoint per function.

    const backendCode = lambda.Code.fromAsset(BACKEND_LAMBDA_PACKAGE);
    const backendRuntime = lambda.Runtime.PYTHON_3_12;
    const backendArchitecture = lambda.Architecture.X86_64;

    const restFn = new lambda.Function(this, 'RestFunction', {
      code: backendCode,
      runtime: backendRuntime,
      architecture: backendArchitecture,
      handler: 'lambda_handler.handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      environment: {
        GAMES_TABLE: gamesTable.tableName,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const connectFn = new lambda.Function(this, 'ConnectFunction', {
      code: backendCode,
      runtime: backendRuntime,
      architecture: backendArchitecture,
      handler: 'ws_handler.connect_handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      environment: {
        GAMES_TABLE: gamesTable.tableName,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const disconnectFn = new lambda.Function(this, 'DisconnectFunction', {
      code: backendCode,
      runtime: backendRuntime,
      architecture: backendArchitecture,
      handler: 'ws_handler.disconnect_handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      environment: {
        GAMES_TABLE: gamesTable.tableName,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const defaultFn = new lambda.Function(this, 'DefaultFunction', {
      code: backendCode,
      runtime: backendRuntime,
      architecture: backendArchitecture,
      handler: 'ws_handler.default_handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      environment: {
        GAMES_TABLE: gamesTable.tableName,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    gamesTable.grantReadWriteData(restFn);
    connectionsTable.grantReadData(restFn); // GSI query in broadcast.py's DynamoBroadcaster
    gamesTable.grantReadData(connectFn);
    connectionsTable.grantWriteData(connectFn);
    connectionsTable.grantWriteData(disconnectFn);

    // ── REST API (API Gateway HTTP API) ──────────────────────────────────────
    // Single catch-all integration — the existing FastAPI app (via Mangum)
    // handles routing internally, same as it does today under uvicorn.

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      defaultIntegration: new HttpLambdaIntegration('RestIntegration', restFn),
    });

    // ── Realtime API (API Gateway WebSocket API) ─────────────────────────────
    // Replaces the native FastAPI WebSocket route for production. game_id is
    // passed as a query param on connect since WebSocket APIs route by message
    // content, not URL path.

    const webSocketApi = new apigwv2.WebSocketApi(this, 'WebSocketApi', {
      connectRouteOptions: { integration: new WebSocketLambdaIntegration('ConnectIntegration', connectFn) },
      disconnectRouteOptions: { integration: new WebSocketLambdaIntegration('DisconnectIntegration', disconnectFn) },
      defaultRouteOptions: { integration: new WebSocketLambdaIntegration('DefaultIntegration', defaultFn) },
    });

    const webSocketStage = new apigwv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    restFn.addEnvironment('WS_MANAGEMENT_ENDPOINT', webSocketStage.callbackUrl);
    webSocketStage.grantManagementApiAccess(restFn);

    // ── Frontend (S3 + CloudFront) ─────────────────────────────────────────────
    // Serves only static assets — the frontend calls the HTTP/WebSocket APIs
    // above directly (cross-origin, via CORS), rather than through CloudFront.

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    const frontendDeploy = new s3deploy.BucketDeployment(this, 'FrontendDeploy', {
      sources: [s3deploy.Source.asset(FRONTEND_BUILD)],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Runtime config for the frontend — written after the APIs exist, so the
    // frontend build doesn't need to know their URLs ahead of time.
    // prune: false is required — BucketDeployment defaults to pruning any
    // object in the bucket not present in *this* deployment's own source, so
    // without it, this config.json-only deployment would delete everything
    // frontendDeploy just uploaded.
    const configDeploy = new s3deploy.BucketDeployment(this, 'ConfigDeploy', {
      sources: [s3deploy.Source.jsonData('config.json', {
        apiBase: httpApi.apiEndpoint,
        wsBase: webSocketStage.url,
      })],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/config.json'],
      prune: false,
    });
    configDeploy.node.addDependency(frontendDeploy);

    // Frontend and API are cross-origin — set CORS accordingly.
    restFn.addEnvironment('CORS_ORIGIN', `https://${distribution.distributionDomainName}`);

    // ── Outputs ───────────────────────────────────────────────────────────────

    new cdk.CfnOutput(this, 'AppUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'App URL',
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'REST API base URL',
    });

    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: webSocketStage.url,
      description: 'WebSocket API URL (append ?game_id=<id>)',
    });
  }
}
