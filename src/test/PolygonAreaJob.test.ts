import { PolygonAreaJob } from '../jobs/PolygonAreaJob';
import { Task } from '../models/Task';
import { TaskStatus } from '../workers/taskRunner';

describe('PolygonAreaJob', () => {
    it('should calculate the area of a polygon correctly', async () => {
        const job = new PolygonAreaJob();
        
        // Create a simple square polygon (1km x 1km)
        const squarePolygon = {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [0, 0],
                    [0, 0.009], // approximately 1km
                    [0.009, 0.009],
                    [0.009, 0],
                    [0, 0]
                ]]
            },
            properties: {}
        };

        const task = new Task();
        task.taskId = 'test-task-1';
        task.clientId = 'test-client-1';
        task.taskType = 'POLYGON_AREA';
        task.status = TaskStatus.Queued;
        task.geoJson = JSON.stringify(squarePolygon);
        task.stepNumber = 1;

        const area = await job.run(task);
        
        // The area should be approximately 1,000,000 square meters (1km²)
        // We use a range to account for the approximation in coordinates
        expect(area).toBeGreaterThan(900000);
        expect(area).toBeLessThan(1100000);
    });

    it('should throw an error for invalid polygon', async () => {
        const job = new PolygonAreaJob();
        
        // Create an invalid polygon (missing coordinates)
        const invalidPolygon = {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[]] // Empty polygon
            },
            properties: {}
        };

        const task = new Task();
        task.taskId = 'test-task-2';
        task.clientId = 'test-client-1';
        task.taskType = 'POLYGON_AREA';
        task.status = TaskStatus.Queued;
        task.geoJson = JSON.stringify(invalidPolygon);
        task.stepNumber = 1;

        await expect(job.run(task)).rejects.toThrow('Invalid GeoJSON: Expected a Polygon geometry');
    });
}); 