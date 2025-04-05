import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { DataSource } from 'typeorm';
import { Workflow } from '../models/Workflow';
import { Task } from '../models/Task';
import {TaskStatus} from "../workers/taskRunner";

export enum WorkflowStatus {
    Initial = 'initial',
    InProgress = 'in_progress',
    Completed = 'completed',
    Failed = 'failed'
}

interface WorkflowStep {
    taskType: string;
    stepNumber: number;
    dependsOn?: string; // Task ID of the dependency
}

interface WorkflowDefinition {
    name: string;
    steps: WorkflowStep[];
}

export class WorkflowFactory {
    constructor(private dataSource: DataSource) {}

    /**
     * Creates a workflow by reading a YAML file and constructing the Workflow and Task entities.
     * @param filePath - Path to the YAML file.
     * @param clientId - Client identifier for the workflow.
     * @param geoJson - The geoJson data string for tasks (customize as needed).
     * @returns A promise that resolves to the created Workflow.
     */
    async createWorkflowFromYAML(filePath: string, clientId: string, geoJson: string): Promise<Workflow> {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const workflowDef = yaml.load(fileContent) as WorkflowDefinition;
        const workflowRepository = this.dataSource.getRepository(Workflow);
        const taskRepository = this.dataSource.getRepository(Task);
        const workflow = new Workflow();

        workflow.clientId = clientId;
        workflow.status = WorkflowStatus.Initial;

        const savedWorkflow = await workflowRepository.save(workflow);

        // First pass: Create all tasks without dependencies
        const tasks: Task[] = workflowDef.steps.map(step => {
            const task = new Task();
            task.clientId = clientId;
            task.geoJson = geoJson;
            task.taskType = step.taskType;
            task.stepNumber = step.stepNumber;
            task.status = TaskStatus.Queued;
            task.workflow = savedWorkflow;
            return task;
        });

        // Save tasks to get their IDs
        const savedTasks = await taskRepository.save(tasks);

        // Second pass: Set up dependencies
        const taskMap = new Map(savedTasks.map(task => [task.stepNumber, task]));
        for (let i = 0; i < workflowDef.steps.length; i++) {
            const step = workflowDef.steps[i];
            const task = savedTasks[i];
            
            if (step.dependsOn) {
                const dependencyStepNumber = parseInt(step.dependsOn);
                const dependencyTask = taskMap.get(dependencyStepNumber);
                if (dependencyTask) {
                    task.dependsOn = dependencyTask;
                }
            }
        }

        // Save tasks with dependencies
        await taskRepository.save(savedTasks);

        return savedWorkflow;
    }
}