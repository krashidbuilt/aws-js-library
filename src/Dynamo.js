const isEqual = require('lodash.isequal');
const { DynamoDB, DynamoDBClient, CreateTableCommand, ListTablesCommand, DescribeTableCommand, DeleteTableCommand, UpdateTimeToLiveCommand, waitForTableExists, waitForTableNotExists } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const { AWS_DEFAULT_REGION, AWS_DYNAMO_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = require('../constants');

const Logger = require('@KrashidBuilt/common/utils/logger');
const logger = new Logger(__filename);

const config = {
    region: AWS_DEFAULT_REGION,
};

if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    logger.info('Configuring manual credentials for dynamo');
    config.credentials = {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
    };
}

if (AWS_DEFAULT_REGION) {
    logger.info('Configuring manual endpoint for dynamo');
    config.endpoint = AWS_DYNAMO_ENDPOINT;
}

const db = new DynamoDB({ ...config, convertEmptyValues: true });
const client = new DynamoDBClient(config);

const marshallOptions = {
    // convertEmptyValues: true,
    removeUndefinedValues: true,
    // convertClassInstanceToMap: true,
};

const safeUnmarshall = (o) => {
    if (o) {
        return unmarshall(o);
    }
    return o;
};

class Dynamo {
    constructor(TableName) {

        if (!TableName) {
            throw new Error('TableName is required!');
        }

        this.db = db;
        this.client = client;
        this.table = {
            create: async (idKey = 'id', idType = 'S') => {
                try {

                    const params = {
                        AttributeDefinitions: [
                            {
                                AttributeName: idKey,
                                AttributeType: idType,
                            }
                        ],
                        KeySchema: [
                            {
                                AttributeName: idKey,
                                KeyType: 'HASH',
                            }
                        ],
                        BillingMode: 'PAY_PER_REQUEST',
                        TableName,
                        StreamSpecification: {
                            StreamEnabled: false,
                        },
                    };

                    return await client.send(new CreateTableCommand(params));
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            },
            list: async () => {
                try {
                    return await client.send(new ListTablesCommand({}));
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            },
            describe: async () => {
                try {
                    return await client.send(new DescribeTableCommand({ TableName }));
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            },
            remove: async () => {
                try {
                    return await client.send(new DeleteTableCommand({ TableName }));
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            },
            updateTimeToLive: async (Enabled) => {
                try {
                    return await client.send(new UpdateTimeToLiveCommand({ TableName, TimeToLiveSpecification: { Enabled, AttributeName: 'expires' } }));
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            },
            waitForExists: async (maxWaitTimeInSeconds = 900) => {
                try {
                    return await waitForTableExists({ client, maxWaitTime: maxWaitTimeInSeconds }, { TableName });
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            },
            waitForNotExists: async (maxWaitTimeInSeconds = 900) => {
                try {
                    return await waitForTableNotExists({ client, maxWaitTime: maxWaitTimeInSeconds }, { TableName });
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            },
        };


        this.getAll = async () => {
            logger.extra();

            const parameters = {
                TableName,
            };

            const results = [];
            let items;

            do {
                items = await db.scan(parameters);
                items.Items.forEach((item) => results.push(safeUnmarshall(item)));
                parameters.ExclusiveStartKey = items.LastEvaluatedKey;
            } while (typeof items.LastEvaluatedKey != 'undefined');

            return results;
        };

        this.getOne = async (id) => {
            logger.extra(id);

            try {
                const { Item } = await db.getItem({ TableName, Key: marshall({ id }, marshallOptions) });
                return safeUnmarshall(Item);
            } catch (error) {
                logger.error(error);
                throw error;
            }
        };

        this.writeOne = async (id, obj, get = false) => {
            logger.extra(id, obj, get);

            try {
                const Item = marshall(Object.assign(obj, {
                    id,
                    created_at: new Date().getTime(),
                    updated_at: new Date().getTime(),
                }), marshallOptions);

                await db.putItem({ TableName, Item });

                if (get) {
                    return this.getOne(id);
                }
            } catch (error) {
                logger.error(error);
                throw error;
            }
        };

        this.createOne = async (id, obj, get = false) => {
            logger.extra(id, obj, get);

            try {
                const Item = marshall(Object.assign(obj, {
                    id,
                    created_at: new Date().getTime(),
                    updated_at: new Date().getTime(),
                }), marshallOptions);

                await db.putItem({ TableName, Item, ConditionExpression: 'attribute_not_exists(id)' });

                if (get) {
                    return this.getOne(id);
                }
            } catch (error) {
                logger.error(error);
                throw error;
            }
        };

        this.createOneExpiring = async (id, obj, expiresInSeconds = 300) => await this.createOne(id, Object.assign(obj, { expires: String(Math.floor((Date.now() / 1000) + (expiresInSeconds))) }));

        this.updateOne = async (id, obj, get = false) => {
            logger.extra(id, obj, get);

            try {
                const found = await this.getOne(id);

                if (!found) {
                    throw new Error('Unable to find item.');
                }

                obj.id = found.id;
                obj.created_at = found.created_at;
                obj.updated_at = found.updated_at;

                const compare = safeUnmarshall(marshall(obj, marshallOptions));

                if (isEqual(found, compare)) {
                    logger.info('Ignoring update, identical values for', id);
                    return;
                }

                const Item = marshall(Object.assign(compare, { updated_at: new Date().getTime() }), marshallOptions);

                await db.putItem({ TableName, Item });

                if (get) {
                    return this.getOne(id);
                }
            } catch (error) {
                logger.error(error);
                throw error;
            }

        };

        this.deleteOne = async (id) => {
            logger.extra(id);


            try {
                await db.deleteItem({ TableName, Key: marshall({ id }) });
            } catch (error) {
                logger.error(error);
                throw error;
            }
        };
    }
}

module.exports = {
    Dynamo
};