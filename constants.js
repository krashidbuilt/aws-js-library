const Logger = require('@KrashidBuilt/common/utils/logger');

const logger = new Logger(__filename);

const {
    NODE_ENV = 'develop',
    AWS_DEFAULT_REGION = 'us-east-1',
    AWS_PROFILE,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,

    AWS_DYNAMO_ENDPOINT,
} = process.env;

logger.info('[AWS-JS-LIBRARY] Using:', { AWS_PROFILE, AWS_DEFAULT_REGION });

module.exports = {
    NODE_ENV,
    AWS_DEFAULT_REGION,
    AWS_PROFILE,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,

    AWS_DYNAMO_ENDPOINT,
};