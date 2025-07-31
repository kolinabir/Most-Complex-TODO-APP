/**
 * Performance Tests for TodoLang Application
 *
 * Tests application performance with large datasets, frequent updates,
 * and stress scenarios to ensure the application scales well.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance test utilities
class PerformanceTestUtils {
  static measureTime(operation) {
    const start = process.hrtime.bigint();
    const result = operation();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    return { result, duration };
  }

  static async measureAsyncTime(operation) {
    const start = process.hrtime.bigint();
    const result = await operation();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    return { result, duration };
  }

  static generateTodos(count, options = {}) {
    const {
      completedRatio = 0.3,
      textVariation = true,
      dateSpread = true
    } = options;

    return Array.from({ length: count }, (_, i) => {
      const baseText = textVariation ?
        `Todo item ${i + 1} - ${this.generateRandomText()}` :
        `Todo item ${i + 1}`;

      const createdAt = dateSpread ?
        new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : // Random date within last 30 days
        new Date(Date.now() - i * 1000);

      return {
        id: `perf_todo_${i}`,
        text: baseText,
        completed: Math.random() < completedRatio,
        createdAt
      };
    });
  }

  static generateRandomText() {
    const words = [
      'buy', 'groceries', 'walk', 'dog', 'read', 'book', 'write', 'code',
      'exercise', 'call', 'mom', 'clean', 'house', 'pay', 'bills', 'study',
      'meeting', 'project', 'deadline', 'important', 'urgent', 'review',
      'document', 'email', 'client', 'presentation', 'report', 'analysis'
    ];

    const wordCount = Math.floor(Math.random() * 4) + 2; // 2-5 words
    const selectedWords = [];

    for (let i = 0; i < wordCount; i++) {
      selectedWords.push(words[Math.floor(Math.random() * words.length)]);
    }

    return selectedWords.join(' ');
  }

  static simulateUserInteractions(app, operations) {
    const results = [];

    operations.forEach(operation => {
      const { result, duration } = this.measureTime(() => {
        switch (operation.type) {
          case 'add':
            return app.addTodo(operation.text);
          case 'toggle':
            return app.toggleTodo(operation.id);
          case 'edit':
            return app.editTodo(operation.id, operation.newText);
          case 'delete':
            return app.deleteTodo(operation.id);
          case 'filter':
            return app.setFilter(operation.filter);
          default:
            return null;
        }
      });

      results.push({
        operati