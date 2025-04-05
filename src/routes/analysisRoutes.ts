import { Router, Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { WorkflowFactory } from '../workflows/WorkflowFactory'; // Create a folder for factories if you prefer
import { Workflow } from '../models/Workflow';
import { Result } from '../models/Result';
import path from 'path';

interface WorkflowParams {
    workflowId: string;
}

interface TaskParams {
    taskId: string;
}

const router = Router();
const workflowFactory = new WorkflowFactory(AppDataSource);

router.post('/', async (req: Request, res: Response): Promise<void> => {
    const { clientId, geoJson } = req.body;
    const workflowFile = path.join(__dirname, '../../workflows/example_workflow.yml');

    try {
        const workflow = await workflowFactory.createWorkflowFromYAML(workflowFile, clientId, JSON.stringify(geoJson));

        res.status(202).json({
            workflowId: workflow.workflowId,
            message: 'Workflow created and tasks queued from YAML definition.'
        });
    } catch (error: any) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ message: 'Failed to create workflow' });
    }
});

router.get<WorkflowParams>('/:workflowId', async (req: Request<WorkflowParams>, res: Response): Promise<void> => {
    const { workflowId } = req.params;
    const workflowRepository = AppDataSource.getRepository(Workflow);

    try {
        const workflow = await workflowRepository.findOne({
            where: { workflowId },
            relations: ['tasks']
        });

        if (!workflow) {
            res.status(404).json({ message: 'Workflow not found' });
            return;
        }

        res.json({
            workflowId: workflow.workflowId,
            status: workflow.status,
            tasks: workflow.tasks.map(task => ({
                taskId: task.taskId,
                type: task.taskType,
                status: task.status,
                progress: task.progress,
                resultId: task.resultId
            }))
        });
    } catch (error: any) {
        console.error('Error fetching workflow:', error);
        res.status(500).json({ message: 'Failed to fetch workflow' });
    }
});

router.get('/:workflowId/tasks/:taskId/result', async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;
    console.log(`Fetching result for task ${taskId}`);
    const resultRepository = AppDataSource.getRepository(Result);

    try {
        console.log('Querying database for result...');
        const result = await resultRepository.findOne({
            where: { taskId }
        });

        console.log('Query result:', result);

        if (!result) {
            console.log('No result found');
            res.status(404).json({ message: 'Result not found' });
            return;
        }

        console.log('Result found, parsing data...');
        const parsedData = result.data ? JSON.parse(result.data) : null;
        console.log('Parsed data:', parsedData);

        res.json({
            taskId: result.taskId,
            data: parsedData
        });
    } catch (error: any) {
        console.error('Error fetching result:', error);
        res.status(500).json({ message: 'Failed to fetch result' });
    }
});

export default router;