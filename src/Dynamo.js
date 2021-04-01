const isEqual = require('lodash.isequal');
const { DynamoDB, DynamoDBClient, CreateTableCommand, ListTablesCommand, DescribeTableCommand, DeleteTableCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const { AWS_DEFAULT_REGION } = require('../constants');

const Logger = require('@KrashidBuilt/common/utils/logger');
const logger = new Logger(__filename);

const db = new DynamoDB({ region: AWS_DEFAULT_REGION, convertEmptyValues: true });
const client = new DynamoDBClient({ region: AWS_DEFAULT_REGION });

const marshallOptions = {
    // convertEmptyValues: true,
    removeUndefinedValues: true,
    // convertClassInstanceToMap: true,
};

class Dynamo {
    constructor(TableName) {

        if (!TableName) {
            throw new Error('TableName is required!');
        }

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
                items.Items.forEach((item) => results.push(unmarshall(item)));
                parameters.ExclusiveStartKey = items.LastEvaluatedKey;
            } while (typeof items.LastEvaluatedKey != 'undefined');

            return results;
        };

        this.getOne = async (id) => {
            logger.extra(id);

            try {
                const { Item } = await db.getItem({ TableName, Key: marshall({ id }, marshallOptions) });
                return unmarshall(Item);
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

                const compare = unmarshall(marshall(obj, marshallOptions));

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