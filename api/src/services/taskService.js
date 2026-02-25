// src/services/taskService.js

const taskRepository = require('../repositories/taskRepository');
const Task = require('../models/Task');
const { getCache, setCache, invalidateCache } = require('../config/redis');

const CACHE_KEYS = {
    ALL_TASKS: 'tasks:all',
    TASK_BY_ID: (id) => `tasks:${id}`,
    STATS: 'tasks:stats'
};

class TaskService {

    // ✅ LEVEL 2: ส่ง cache status กลับผ่าน req
    async getAllTasks(req) {
        const cached = await getCache(CACHE_KEYS.ALL_TASKS);

        if (cached) {
            if (req) req.cacheStatus = 'HIT';
            return cached;
        }

        const tasks = await taskRepository.findAll();
        const json = tasks.map(t => t.toJSON());

        await setCache(CACHE_KEYS.ALL_TASKS, json, 60);

        if (req) req.cacheStatus = 'MISS';
        return json;
    }

    async getTaskById(id) {
        const cached = await getCache(CACHE_KEYS.TASK_BY_ID(id));
        if (cached) return cached;

        const task = await taskRepository.findById(id);
        if (!task) {
            const error = new Error('Task not found');
            error.statusCode = 404;
            throw error;
        }

        await setCache(CACHE_KEYS.TASK_BY_ID(id), task.toJSON(), 60);
        return task.toJSON();
    }

    async createTask(taskData) {
        const validation = Task.validate(taskData);
        if (!validation.isValid) {
            const error = new Error(validation.errors.join(', '));
            error.statusCode = 400;
            throw error;
        }

        const task = await taskRepository.create(taskData);

        await invalidateCache('tasks:*');
        return task.toJSON();
    }

    async updateTask(id, taskData) {
        const existingTask = await taskRepository.findById(id);
        if (!existingTask) {
            const error = new Error('Task not found');
            error.statusCode = 404;
            throw error;
        }

        const task = await taskRepository.update(id, taskData);
        await invalidateCache('tasks:*');
        return task.toJSON();
    }

    async deleteTask(id) {
        const existingTask = await taskRepository.findById(id);
        if (!existingTask) {
            const error = new Error('Task not found');
            error.statusCode = 404;
            throw error;
        }

        const result = await taskRepository.delete(id);
        await invalidateCache('tasks:*');
        return result;
    }

    async getStatistics() {
        const cached = await getCache(CACHE_KEYS.STATS);
        if (cached) return cached;

        const counts = await taskRepository.countByStatus();
        const total = counts.TODO + counts.IN_PROGRESS + counts.DONE;

        const stats = {
            total,
            byStatus: counts,
            completionRate: total > 0
                ? Math.round((counts.DONE / total) * 100)
                : 0
        };

        await setCache(CACHE_KEYS.STATS, stats, 30);
        return stats;
    }
}

module.exports = new TaskService();