import { Job } from './Job';
import { Task } from '../models/Task';
import { Repository } from 'typeorm';
import { Result } from '../models/Result';

interface TaskOutput {
    taskId: string;
    type: string;
    output: any;
    status: string;
    error?: string;
}

interface Report {
    workflowId: string;
    clientId: string;
    tasks: TaskOutput[];
    finalReport: string;
    timestamp: string;
}

export class ReportGenerationJob implements Job {
    constructor(private resultRepository: Repository<Result>) {}

    async run(task: Task): Promise<Report> {
        console.log(`Generating report for workflow ${task.workflow.workflowId}...`);

        try {
            // Get all tasks in the workflow, ordered by step number
            const workflowTasks = await this.resultRepository.manager
                .createQueryBuilder(Task, 'task')
                .where('task.workflow.workflowId = :workflowId', { workflowId: task.workflow.workflowId })
                .orderBy('task.stepNumber', 'ASC')
                .getMany();

            // Collect outputs from all tasks
            const taskOutputs: TaskOutput[] = workflowTasks.map(t => ({
                taskId: t.taskId,
                type: t.taskType,
                output: t.progress, // Using progress field as output
                status: t.status,
                error: t.status === 'failed' ? 'Task failed' : undefined
            }));

            // Generate final report
            const finalReport = this.generateFinalReport(taskOutputs);

            const report: Report = {
                workflowId: task.workflow.workflowId,
                clientId: task.clientId,
                tasks: taskOutputs,
                finalReport,
                timestamp: new Date().toISOString()
            };

            console.log(`Report generated successfully for workflow ${task.workflow.workflowId}`);
            return report;
        } catch (error) {
            console.error(`Error generating report for workflow ${task.workflow.workflowId}:`, error);
            throw error;
        }
    }

    private generateFinalReport(taskOutputs: TaskOutput[]): string {
        const successfulTasks = taskOutputs.filter(t => t.status === 'completed');
        const failedTasks = taskOutputs.filter(t => t.status === 'failed');

        let report = `Workflow Report\n`;
        report += `Total Tasks: ${taskOutputs.length}\n`;
        report += `Successful Tasks: ${successfulTasks.length}\n`;
        report += `Failed Tasks: ${failedTasks.length}\n\n`;

        if (successfulTasks.length > 0) {
            report += `Successful Task Results:\n`;
            successfulTasks.forEach(task => {
                report += `- ${task.type}: ${JSON.stringify(task.output)}\n`;
            });
        }

        if (failedTasks.length > 0) {
            report += `\nFailed Tasks:\n`;
            failedTasks.forEach(task => {
                report += `- ${task.type}: ${task.error}\n`;
            });
        }

        return report;
    }
} 