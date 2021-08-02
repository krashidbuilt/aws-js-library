require('dotenv').config();

const { APP_TYPE = 'up', APP_NAME, NODE_ENV } = process.env;

const fs = require('fs');
const path = require('path');
const Logger = require('@KrashidBuilt/common/utils/logger');

const AWS = require('./');
const logger = new Logger(__filename);

const main = async () => {
    logger.extra('Some', 'message', { params: 123456 });
    logger.trace('Some', 'message', { params: 123456 });
    logger.debug('Some', 'message', { params: 123456 });
    logger.info('Some', 'message', { params: 123456 });
    logger.warn('Some', 'message', { params: 123456 });
    logger.error('Some', 'message', { params: 123456 });
    logger.fatal('Some', 'message', { params: 123456 });

    await AWS.SSM.createParameters(APP_TYPE, APP_NAME, NODE_ENV, {
        PORT: 5000,
        // SUPER_SECRET_THING: new Date().getTime(),
        EXAMPLE_OBJECT: {
            test: 'something'
        }
    });

    const Bucket = `${APP_NAME}-test`;
    const Key = path.basename(__filename);

    await AWS.S3.createBucket(Bucket);

    await AWS.S3.uploadFileToBucket(Bucket, Key, fs.readFileSync(__filename));

    logger.info(await AWS.S3.getSignedUrlForBucketKey(Bucket, Key));

    logger.info('Sleeping');
    await new Promise((resolve) => {
        setTimeout(resolve, 5000);
    });

    await AWS.S3.removeFileFromBucket(Bucket, Key);

    await AWS.S3.removeBucket(Bucket);

    // const db = new AWS.Dynamo('bk-testing');
    // logger.info('create', await db.table.create());
    // logger.info('time to live', await db.table.updateTimeToLive(true));
    // logger.info('describe', await db.table.describe());
    // await db.table.remove();

    // const one = String(new Date().getTime());
    // await new Promise((resolve) => {
    //     setTimeout(resolve, 100);
    // });
    // const two = String(new Date().getTime());

    // await db.createOne(one, { first: 'Ben' });
    // const update = { first: 'Ben', updated: new Date().getTime(), empty: '', und: undefined, n: null };
    // await db.updateOne(one, update);
    // await db.updateOne(one, update);

    // // await db.createOne(two, { last: 'Kauffman' });

    // // logger.info('get one', await db.getOne(one));
    // // logger.info('get two', await db.getOne(two));

    // // logger.info('get all', await db.getAll());
};

main();