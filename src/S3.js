const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const { S3Client, CreateBucketCommand, DeleteBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const Logger = require('@KrashidBuilt/common/utils/logger');

const { AWS_DEFAULT_REGION } = require('../constants');

const logger = new Logger(__filename);

const S3 = new S3Client({ region: AWS_DEFAULT_REGION });


const getFileInfo = async (Bucket, Key) => {
    logger.extra({ Bucket, Key });
    try {
        return await S3.send(new HeadObjectCommand({ Bucket, Key }));
    } catch (error) {
        logger.error(error);
        throw error;
    }
}

const checkBucketExists = async (Bucket) => {
    const options = {
        Bucket,
    };

    // v3 method for checking if a bucket exists. headBucket() is no longer a function within the s3 client in aws-sdk v3 so now we need to bundle a function to do this.
    // https://aws.amazon.com/blogs/developer/waiters-in-modular-aws-sdk-for-javascript/
    try {
        await S3.send(new HeadBucketCommand(options));
        return true;
    } catch (error) {
        if (error.statusCode === 404) {
            return false;
        }
        throw error;
    }
};

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
    getFileInfo,
    checkBucketExists,
    createBucket,
    removeBucket,
    uploadFileToBucket,
    getSignedUrlForBucketKey,
    removeFileFromBucket,
};