import { BullMonitorExpress } from '@bull-monitor/express'
import Express from 'express'
import Queue from 'bull'
import {
    SSMClient,
    GetParametersByPathCommand,
} from '@aws-sdk/client-ssm'



const client = new SSMClient({ region: 'eu-west-1' });

export const getSecretsByPath = async (
    getParametersByPathCmdInput,
) => {
    const defaultCmd = {
        Recursive: true,
        WithDecryption: true,
        ...getParametersByPathCmdInput,
    };
    const cmd = new GetParametersByPathCommand(defaultCmd);
    const res = await client.send(cmd);
    res.Parameters.forEach((param) => {
        const pathName = param.Name.substring(1).toUpperCase();
        const paramName = pathName.replace(/\//g, '_');
        process.env[paramName] = param.Value;
       // console.log(paramName +"="+ param.Value)
    });
};


;(async () => {
    const app = Express()

    await getSecretsByPath({Path: '/secure/redis'});
    var REDIS_QUEUES  = process.env['LINK_REDIS_HTTP-BULLNAME'] || process.env.REDIS_QUEUES  || ''
    var REDIS_HOST    = process.env.LINK_REDIS_ENDPOINT || process.env.REDIS_HOST    || '127.0.0.1'
    var REDIS_PORT    = process.env.REDIS_PORT || process.env.REDIS_PORT    || 6379
    var BULL_PREFIX   = process.env.BULL_PREFIX   || 'bull'
    var PORT          = process.env.PORT          || 3000

    const queues = REDIS_QUEUES.split(',').map(queue => queue.split(':'))

    console.log('Bull Monitor v' + process.env.npm_package_version)
    console.log({ REDIS_HOST, REDIS_PORT, REDIS_QUEUES, BULL_PREFIX, queues })

    const monitor = new BullMonitorExpress({
        queues: queues.map(([queue_name, queue_prefix]) => new Queue(queue_name, { redis: { host: REDIS_HOST, port: REDIS_PORT }, prefix: queue_prefix || BULL_PREFIX })),
        gqlPlayground: true,
        gqlIntrospection: true
    })

    await monitor.init()

    app.use('/', monitor.router)

    /* Health check */
    app.use('/ping', (req, res) => res.send('pong'))

    app.listen(PORT)
})()