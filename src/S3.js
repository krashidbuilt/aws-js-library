const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const { S3Client, CreateBucketCommand, DeleteBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const Logger = require('@KrashidBuilt/common/utils/logger');

const { AWS_DEFAULT_REGION } = require('../constants');

const logger = new Logger(__filename);

const S3 = new S3Client({ region: AWS_DEFAULT_REGION });

const createBucket = async (Bucket) => {
    logger.extra({ Bucket });
    try {
        return await S3.send(new CreateBucketCommand({ Bucket }));
    } catch (error) {
        logger.error(error);
        throw error;
    }
};

const uploadFileToBucket = async (Bucket, Key, Body) => {
    logger.extra({ Bucket, Key, Body: typeof Body });
    try {
        return await S3.send(new PutObjectCommand({ Bucket, Key, Body }));
    } catch (error) {
        logger.error(error);
        throw error;
    }
};

const removeFileFromBucket = async (Bucket, Key) => {
    logger.extra({ Bucket, Key });
    try {
        return await S3.send(new DeleteObjectCommand({ Bucket, Key }));
    } catch (error) {
        logger.error(error);
        throw error;
    }
};

const removeBucket = async (Bucket) => {
    logger.extra({ Bucket });
    try {
        return await S3.send(new DeleteBucketCommand({ Bucket }));
    } catch (error) {
        logger.error(error);
        throw error;
    }
};

const getSignedUrlForBucketKey = async (Bucket, Key, expiresIn = 3600) => {
    logger.extra({ Bucket, Key, expiresIn });
    try {
        return await getSignedUrl(S3, new GetObjectCommand({ Bucket, Key }), { expiresIn });
    } catch (error) {
        logger.error(error);
        throw error;
    }
};

module.exports = {
    createBucket,
    removeBucket,
    uploadFileToBucket,
    getSignedUrlForBucketKey,
    removeFileFromBucket,
};