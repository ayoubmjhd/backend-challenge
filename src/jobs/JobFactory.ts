import { Job } from './Job';
import { DataAnalysisJob } from './DataAnalysisJob';
import { EmailNotificationJob } from './EmailNotificationJob';
import { PolygonAreaJob } from './PolygonAreaJob';
import { ReportGenerationJob } from './ReportGenerationJob';
import { Repository } from 'typeorm';
import { Result } from '../models/Result';

const jobMap: Record<string, (resultRepository?: Repository<Result>) => Job> = {
    'analysis': () => new DataAnalysisJob(),
    'notification': () => new EmailNotificationJob(),
    'polygonArea': () => new PolygonAreaJob(),
    'reportGeneration': (resultRepository) => new ReportGenerationJob(resultRepository!),
};

export function getJobForTaskType(taskType: string, resultRepository?: Repository<Result>): Job {
    const jobFactory = jobMap[taskType];
    if (!jobFactory) {
        throw new Error(`No job found for task type: ${taskType}`);
    }
    return jobFactory(resultRepository);
}