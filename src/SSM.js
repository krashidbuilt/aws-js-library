const path = require('path');

const { SSMClient, GetParametersByPathCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');

const Logger = require('@KrashidBuilt/common/utils/logger');

const { AWS_DEFAULT_REGION } = require('../constants');

const logger = new Logger(__filename);
const client = new SSMClient({ region: AWS_DEFAULT_REGION });


const getAllParametersByPath = async (Path, Recursive = true, WithDecryption = false) => {
    try {
        const params = { Path, Recursive, WithDecryption };
        let all = [];
        let data = await client.send(new GetParametersByPathCommand(params));
        all = all.concat(data.Parameters);

        while (data.NextToken) {
            params.NextToken = data.NextToken;
            data = await client.send(new GetParametersByPathCommand(params));
            all = all.concat(data.Parameters);
        }

        return all;
    } catch (err) {
        return Promise.reject(err);
    }
};

const parseValue = (v) => {
    try {
        return JSON.parse(v);
    } catch (error) {
        return v;
    }
};

const stringifyIfNeeded = (v) => {
    if (['boolean', 'number', 'bigint', 'string'].indexOf(typeof v) >= 0) {
        return String(v);
    }
    return JSON.stringify(v);
};

const hasChanged = (current, updated) => stringifyIfNeeded(current) !== stringifyIfNeeded(updated);

const createParameters = async (namespace, application, environment, object) => {
    const prepend = `/${namespace}/${application}/${environment}/`;

    const existingArr = await getAllParametersByPath(prepend, true, true);

    logger.debug(prepend, 'has', existingArr.length, 'existing parameters.');

    const current = {};
    existingArr.forEach((o) => {
        const arr = o.Name.split('/');
        const k = arr[arr.length - 1];
        current[k] = parseValue(o.Value);
    });

    const list = Object.keys(object);

    const different = list.filter((k) => hasChanged(current[k], object[k]));

    logger.debug(prepend, 'has', different.length, 'differences.');

    for (let i = 0; i < different.length; i++) {
        const key = different[i];
        const Name = path.join(prepend, key);

        logger.info(`${current[key] ? 'Updating' : 'Creating'}`, Name);

        const params = {
            Name,
            Value: stringifyIfNeeded(object[different[i]]),
            Type: 'SecureString',
            Overwrite: true
        };

        await client.send(new PutParameterCommand(params));
    }
};

module.exports = {
    getAllParametersByPath,
    createParameters,
};
