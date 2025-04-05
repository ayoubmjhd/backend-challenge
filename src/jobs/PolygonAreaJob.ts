import { Job } from './Job';
import { Task } from '../models/Task';
import * as turf from '@turf/turf';
import { Feature, Polygon } from 'geojson';

export class PolygonAreaJob implements Job {
    async run(task: Task): Promise<number> {
        console.log(`Calculating polygon area for task ${task.taskId}...`);

        try {
            const inputGeometry: Feature<Polygon> = JSON.parse(task.geoJson);
            
            // Validate that we have a valid polygon
            if (!inputGeometry.geometry || 
                inputGeometry.geometry.type !== 'Polygon' ||
                !inputGeometry.geometry.coordinates ||
                inputGeometry.geometry.coordinates.length === 0 ||
                inputGeometry.geometry.coordinates[0].length < 4) {
                throw new Error('Invalid GeoJSON: Expected a Polygon geometry');
            }

            // Calculate area in square meters using turf.area
            const areaInSquareMeters = turf.area(inputGeometry);
            
            console.log(`Calculated area: ${areaInSquareMeters} square meters`);
            return areaInSquareMeters;
        } catch (error) {
            console.error(`Error calculating polygon area for task ${task.taskId}:`, error);
            throw error;
        }
    }
} 