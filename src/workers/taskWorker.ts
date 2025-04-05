import {AppDataSource} from '../data-source';
import {Task} from '../models/Task';
import {TaskRunner, TaskStatus} from './taskRunner';

export async function taskWorker() {
    console.log('Starting task worker...');
    const taskRepository = AppDataSource.getRepository(Task);
    const taskRunner = new TaskRunner(taskRepository);

    while (true) {
        console.log('Checking for queued tasks...');
        const task = await taskRepository.findOne({
            where: { status: TaskStatus.Queued },
            relations: ['workflow'] // Ensure workflow is loaded
        });

        if (task) {
            console.log(`Found queued task: ${task.taskId} (${task.taskType})`);
            try {
                await taskRunner.run(task);
                console.log(`Task ${task.taskId} completed successfully`);

            } catch (error) {
                console.error('Task execution failed. Task status has already been updated by TaskRunner.');
                console.error(error);
            }
        } else {
            console.log('No queued tasks found');
        }

        // Wait before checking for the next task again
        console.log('Waiting 5 seconds before next check...');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}