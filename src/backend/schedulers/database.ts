import cron from 'node-cron';
import * as Log from '../utils/log';
import { updateCoinList } from '../services/database';

class DatabaseScheduler {
    constructor() { }

    private updateCoinList() {
        cron.schedule('*/30 * * * *', updateCoinList); // Every 30 minutes
        updateCoinList();
    }

    start() {
        this.updateCoinList();
        Log.event('Database Scheduler started');
    }
}

export default DatabaseScheduler;