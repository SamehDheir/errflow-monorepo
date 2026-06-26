import { SetMetadata } from '@nestjs/common';

export const ADMIN_KEY = 'admin';
export const Admin = () => SetMetadata(ADMIN_KEY, true);
