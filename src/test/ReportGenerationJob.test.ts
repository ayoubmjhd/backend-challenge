/// <reference types="jest" />

import { ReportGenerationJob } from '../jobs/ReportGenerationJob';
import { Task } from '../models/Task';
import { TaskStatus } from '../workers/taskRunner';
import { Repository, EntityManager, QueryRunner } from 'typeorm';
import { Result } from '../models/Result';

// Create a mock query builder
const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn()
};

// Create a mock entity manager
const mockEntityManager = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
} as unknown as EntityManager;

// Mock result repository
const mockResultRepository = {
    manager: mockEntityManager
} as unknown as Repository<Result>;

describe('ReportGenerationJob', () => {
    let job: ReportGenerationJob;

    beforeEach(() => {
        job = new ReportGenerationJob(mockResultRepository);
        jest.clearAllMocks();
    });

    it('should generate a report for successful tasks', async () => {
        // Mock task data
        const task1 = new Task();
        task1.taskId = 'task-1';
        task1.clientId = 'client-1';
        task1.taskType = 'POLYGON_AREA';
        task1.status = TaskStatus.Completed;
        task1.progress = '1000000';
        task1.stepNumber = 1;

        const task2 = new Task();
        task2.taskId = 'task-2';
        task2.clientId = 'client-1';
        task2.taskType = 'POLYGON_AREA';
        task2.status = TaskStatus.Completed;
        task2.progress = '2000000';
        task2.stepNumber = 2;

        // Mock query builder response
        mockQueryBuilder.getMany.mockResolvedValue([task1, task2]);

        // Create report generation task
        const reportTask = new Task();
        reportTask.taskId = 'report-1';
        reportTask.clientId = 'client-1';
        reportTask.taskType = 'REPORT_GENERATION';
        reportTask.status = TaskStatus.Queued;
        reportTask.stepNumber = 3;
        reportTask.workflow = { workflowId: 'workflow-1' } as any;

        // Generate report
        const report = await job.run(reportTask);

        // Verify query builder was called correctly
        expect(mockEntityManager.createQueryBuilder).toHaveBeenCalledWith(Task, 'task');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
            'task.workflow.workflowId = :workflowId',
            { workflowId: 'workflow-1' }
        );
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.stepNumber', 'ASC');

        // Verify report content
        expect(report.workflowId).toBe('workflow-1');
        expect(report.clientId).toBe('client-1');
        expect(report.tasks).toHaveLength(2);
        expect(report.tasks[0].output).toBe('1000000');
        expect(report.tasks[1].output).toBe('2000000');
        expect(report.finalReport).toContain('Total Tasks: 2');
        expect(report.finalReport).toContain('Successful Tasks: 2');
        expect(report.finalReport).toContain('Failed Tasks: 0');
    });

    it('should handle failed tasks in report', async () => {
        // Mock task data with one failed task
        const task1 = new Task();
        task1.taskId = 'task-1';
        task1.clientId = 'client-1';
        task1.taskType = 'POLYGON_AREA';
        task1.status = TaskStatus.Completed;
        task1.progress = '1000000';
        task1.stepNumber = 1;

        const task2 = new Task();
        task2.taskId = 'task-2';
        task2.clientId = 'client-1';
        task2.taskType = 'POLYGON_AREA';
        task2.status = TaskStatus.Failed;
        task2.progress = null;
        task2.stepNumber = 2;

        // Mock query builder response
        mockQueryBuilder.getMany.mockResolvedValue([task1, task2]);

        // Create report generation task
        const reportTask = new Task();
        reportTask.taskId = 'report-2';
        reportTask.clientId = 'client-1';
        reportTask.taskType = 'REPORT_GENERATION';
        reportTask.status = TaskStatus.Queued;
        reportTask.stepNumber = 3;
        reportTask.workflow = { workflowId: 'workflow-2' } as any;

        // Generate report
        const report = await job.run(reportTask);

        // Verify query builder was called correctly
        expect(mockEntityManager.createQueryBuilder).toHaveBeenCalledWith(Task, 'task');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
            'task.workflow.workflowId = :workflowId',
            { workflowId: 'workflow-2' }
        );

        // Verify report content
        expect(report.workflowId).toBe('workflow-2');
        expect(report.clientId).toBe('client-1');
        expect(report.tasks).toHaveLength(2);
        expect(report.tasks[0].output).toBe('1000000');
        expect(report.tasks[1].error).toBe('Task failed');
        expect(report.finalReport).toContain('Total Tasks: 2');
        expect(report.finalReport).toContain('Successful Tasks: 1');
        expect(report.finalReport).toContain('Failed Tasks: 1');
    });

    it('should handle empty workflow', async () => {
        // Mock empty query builder response
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Create report generation task
        const reportTask = new Task();
        reportTask.taskId = 'report-3';
        reportTask.clientId = 'client-1';
        reportTask.taskType = 'REPORT_GENERATION';
        reportTask.status = TaskStatus.Queued;
        reportTask.stepNumber = 1;
        reportTask.workflow = { workflowId: 'workflow-3' } as any;

        // Generate report
        const report = await job.run(reportTask);

        // Verify query builder was called correctly
        expect(mockEntityManager.createQueryBuilder).toHaveBeenCalledWith(Task, 'task');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
            'task.workflow.workflowId = :workflowId',
            { workflowId: 'workflow-3' }
        );

        // Verify report content
        expect(report.workflowId).toBe('workflow-3');
        expect(report.clientId).toBe('client-1');
        expect(report.tasks).toHaveLength(0);
        expect(report.finalReport).toContain('Total Tasks: 0');
        expect(report.finalReport).toContain('Successful Tasks: 0');
        expect(report.finalReport).toContain('Failed Tasks: 0');
    });
}); 