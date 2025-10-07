import { Request, Response } from 'express';
import { asyncHandler, sendSuccessResponse, ForbiddenError } from '../middleware/errorHandler';
import { migrationManager } from '../utils/migrationManager';

// Get migration status (admin only)
export const getMigrationStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Check if user is admin
  if (req.user?.role !== 'admin' && req.user?.role !== 'superuser') {
    throw new ForbiddenError('Admin access required');
  }

  const status = await migrationManager.getMigrationStatus();
  sendSuccessResponse(res, status);
});

// Run migrations (admin only)
export const runMigrations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Check if user is admin
  if (req.user?.role !== 'admin' && req.user?.role !== 'superuser') {
    throw new ForbiddenError('Admin access required');
  }

  await migrationManager.runMigrations();
  sendSuccessResponse(res, null, 'Migrations completed successfully');
});

// Rollback last migration (admin only)
export const rollbackMigration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Check if user is admin
  if (req.user?.role !== 'admin' && req.user?.role !== 'superuser') {
    throw new ForbiddenError('Admin access required');
  }

  await migrationManager.rollbackLastMigration();
  sendSuccessResponse(res, null, 'Migration rolled back successfully');
});

// Validate migrations (admin only)
export const validateMigrations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Check if user is admin
  if (req.user?.role !== 'admin' && req.user?.role !== 'superuser') {
    throw new ForbiddenError('Admin access required');
  }

  const isValid = await migrationManager.validateMigrations();
  sendSuccessResponse(res, { isValid }, isValid ? 'Migrations are valid' : 'Migration validation failed');
});

// Create new migration (admin only)
export const createMigration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Check if user is admin
  if (req.user?.role !== 'admin' && req.user?.role !== 'superuser') {
    throw new ForbiddenError('Admin access required');
  }

  const { name } = req.body;
  if (!name) {
    throw new Error('Migration name is required');
  }

  const filename = migrationManager.createMigration(name);
  sendSuccessResponse(res, { filename }, 'Migration created successfully', 201);
});
